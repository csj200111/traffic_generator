package com.traffic.generator.service;

import com.traffic.generator.dto.*;
import com.traffic.generator.executor.HttpRequestExecutor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class AutoThresholdService {

    private static final Logger log = LoggerFactory.getLogger(AutoThresholdService.class);
    private static final int MAX_CONCURRENT_TESTS = 3;
    private static final int ESCALATION_START    = 10;

    // ── 3가지 안전장치 상수 ──────────────────────────────────────
    private static final int    SAFETY_CEILING         = 10000; // 내부 절대 상한선
    private static final double EMERGENCY_ERROR_RATE   = 90.0;  // 즉시 중단 에러율
    private static final int    MAX_CONSECUTIVE_BROKEN = 2;     // 연속 BROKEN 허용 횟수

    private final HttpRequestExecutor httpRequestExecutor;
    private final Map<String, AutoThresholdProgress> progressMap = new ConcurrentHashMap<>();
    private final Map<String, AtomicBoolean> cancelMap = new ConcurrentHashMap<>();
    private final ExecutorService taskExecutor = Executors.newFixedThreadPool(MAX_CONCURRENT_TESTS);

    public AutoThresholdService(HttpRequestExecutor httpRequestExecutor) {
        this.httpRequestExecutor = httpRequestExecutor;
    }

    public TrafficResponse startAutoThreshold(AutoThresholdRequest request) {
        long running = progressMap.values().stream()
                .filter(p -> "RUNNING".equals(p.getStatus()))
                .count();
        if (running >= MAX_CONCURRENT_TESTS) {
            return new TrafficResponse(null, "REJECTED", "동시 측정은 " + MAX_CONCURRENT_TESTS + "개까지 가능합니다.");
        }

        String taskId = UUID.randomUUID().toString();
        AutoThresholdProgress progress = new AutoThresholdProgress(taskId);
        AtomicBoolean cancelled = new AtomicBoolean(false);

        progressMap.put(taskId, progress);
        cancelMap.put(taskId, cancelled);

        taskExecutor.submit(() -> runAutoTest(request, progress, cancelled));
        return new TrafficResponse(taskId, "RUNNING", "자동 임계점 측정이 시작되었습니다.");
    }

    private void runAutoTest(AutoThresholdRequest request, AutoThresholdProgress progress, AtomicBoolean cancelled) {
        int stepNum = 1;
        int prevConcurrency = 0;
        boolean breakingFound = false;
        boolean skipBinarySearch = false;

        try {
            // ── Phase 1: 지수 증가 탐색 ────────────────────────────────
            progress.setPhase("ESCALATION");
            progress.setPhaseDescription("범위 탐색 중...");

            int concurrency = ESCALATION_START;
            int consecutiveBroken = 0;

            while (concurrency <= SAFETY_CEILING && !cancelled.get()) {
                progress.setCurrentConcurrency(concurrency);
                log.info("Auto escalation step {}: concurrency={}", stepNum, concurrency);

                ThresholdStepResult result = executeStep(request, concurrency, stepNum++, cancelled, "범위 탐색");
                if (cancelled.get()) break;
                progress.addStepResult(result);

                // ── 안전장치 1: 에러율 90% 이상 즉시 중단 ──────────────
                if (result.getErrorRate() >= EMERGENCY_ERROR_RATE) {
                    log.warn("Emergency stop: errorRate={}% at concurrency={}", result.getErrorRate(), concurrency);
                    if (!breakingFound) {
                        progress.setBreakingPointConcurrency(concurrency);
                        breakingFound = true;
                    }
                    skipBinarySearch = true;
                    break;
                }

                if (isBreaking(result)) {
                    if ("BROKEN".equals(result.getVerdict())) {
                        consecutiveBroken++;
                    } else {
                        consecutiveBroken = 0;
                    }

                    if (!breakingFound) {
                        progress.setBreakingPointConcurrency(concurrency);
                        breakingFound = true;
                    }

                    // ── 안전장치 2: 연속 BROKEN 2회 → 이진 탐색 생략 ───
                    if (consecutiveBroken >= MAX_CONSECUTIVE_BROKEN) {
                        log.warn("Consecutive BROKEN x{} at concurrency={}, skipping binary search",
                                consecutiveBroken, concurrency);
                        skipBinarySearch = true;
                        break;
                    }

                    // BREAKING이면 즉시 이진 탐색으로 이행
                    if ("BREAKING".equals(result.getVerdict())) {
                        break;
                    }
                    // 첫 BROKEN이면 한 단계 더 진행해 연속 여부 확인
                } else {
                    consecutiveBroken = 0;
                    prevConcurrency = concurrency;
                    if (result.getTps() > progress.getMaxTps()) progress.setMaxTps(result.getTps());
                }

                // ── 안전장치 3: 내부 상한선 5000 ──────────────────────
                int next = Math.min(concurrency * 2, SAFETY_CEILING);
                if (next == concurrency) break;
                concurrency = next;
            }

            if (cancelled.get()) { progress.setStatus("STOPPED"); return; }

            // 상한선까지 안정적인 경우
            if (!breakingFound) {
                progress.setFinalThreshold(SAFETY_CEILING);
                progress.setRecommendation(String.format(
                        "내부 안전 상한선(%d 동시접속)까지 성능 저하가 발생하지 않았습니다. 실제 임계점은 더 높을 수 있습니다.",
                        SAFETY_CEILING));
                progress.setPhase("COMPLETED");
                progress.setStatus("COMPLETED");
                return;
            }

            // 이진 탐색 생략 (비상 중단 또는 연속 BROKEN)
            if (skipBinarySearch || prevConcurrency == 0) {
                progress.setFinalThreshold(prevConcurrency);
                progress.setRecommendation(buildRecommendation(progress, prevConcurrency, skipBinarySearch));
                progress.setPhase("COMPLETED");
                progress.setStatus("COMPLETED");
                return;
            }

            // ── Phase 2: 이진 탐색으로 정밀 측정 ─────────────────────
            progress.setPhase("BINARY_SEARCH");
            progress.setPhaseDescription("정밀 탐색 중...");

            int lo = prevConcurrency;
            int hi = progress.getBreakingPointConcurrency();
            progress.setSearchRangeLo(lo);
            progress.setSearchRangeHi(hi);

            while (hi - lo > request.getPrecision() && !cancelled.get()) {
                int mid = (lo + hi) / 2;
                if (mid <= lo || mid >= hi) break;

                progress.setCurrentConcurrency(mid);
                progress.setSearchRangeLo(lo);
                progress.setSearchRangeHi(hi);
                log.info("Auto binary search step {}: lo={}, mid={}, hi={}", stepNum, lo, mid, hi);

                ThresholdStepResult result = executeStep(request, mid, stepNum++, cancelled, "정밀 탐색");
                if (cancelled.get()) break;
                progress.addStepResult(result);

                // 이진 탐색 중에도 비상 중단 적용
                if (result.getErrorRate() >= EMERGENCY_ERROR_RATE) {
                    log.warn("Emergency stop during binary search: errorRate={}% at mid={}", result.getErrorRate(), mid);
                    hi = mid;
                    break;
                }

                if (isBreaking(result)) {
                    hi = mid;
                    progress.setBreakingPointConcurrency(mid);
                } else {
                    lo = mid;
                    if (result.getTps() > progress.getMaxTps()) progress.setMaxTps(result.getTps());
                }
            }

            if (cancelled.get()) { progress.setStatus("STOPPED"); return; }

            progress.setFinalThreshold(lo);
            progress.setSearchRangeLo(null);
            progress.setSearchRangeHi(null);
            progress.setRecommendation(String.format(
                    "서버 임계점: 동시접속 %d명 (이상부터 성능 저하). 최대 TPS: %.1f req/s",
                    lo, progress.getMaxTps()));
            progress.setPhase("COMPLETED");
            progress.setStatus("COMPLETED");

        } catch (Exception e) {
            log.error("Auto threshold test failed: taskId={}", progress.getTaskId(), e);
            progress.setStatus("FAILED");
        }
    }

    private String buildRecommendation(AutoThresholdProgress progress, int safePoint, boolean emergency) {
        if (emergency) {
            return String.format(
                    "동시접속 %d명에서 에러율이 90%%를 초과해 즉시 중단했습니다. 안전 운영 한계: %d명.",
                    progress.getBreakingPointConcurrency(), safePoint);
        }
        if (safePoint == 0) {
            return "최소 동시접속(10명)부터 이미 성능 저하가 발생했습니다. 서버 상태를 점검하세요.";
        }
        return String.format(
                "동시접속 %d명에서 연속으로 서버가 한계를 초과했습니다. 안전 운영 한계: %d명.",
                progress.getBreakingPointConcurrency(), safePoint);
    }

    private ThresholdStepResult executeStep(AutoThresholdRequest request, int concurrency, int stepNum,
                                            AtomicBoolean cancelled, String phaseLabel) {
        TrafficRequest stepRequest = new TrafficRequest();
        stepRequest.setTargetUrl(request.getTargetUrl());
        stepRequest.setHttpMethod(request.getHttpMethod());
        stepRequest.setHeaders(request.getHeaders());
        stepRequest.setRequestBody(request.getRequestBody());
        stepRequest.setTotalRequests(request.getRequestsPerStep());
        stepRequest.setConcurrency(concurrency);
        stepRequest.setRampUp(false);

        TrafficProgress stepProgress = new TrafficProgress(null, request.getRequestsPerStep());

        long start = System.currentTimeMillis();
        httpRequestExecutor.execute(stepRequest, stepProgress, cancelled);
        long duration = System.currentTimeMillis() - start;

        int total = stepProgress.getCompletedRequests();
        double errorRate, avgLatency, p95, p99, tps;

        if (total == 0) {
            errorRate = 100.0; avgLatency = 0; p95 = 0; p99 = 0; tps = 0;
        } else {
            errorRate = (double) stepProgress.getFailCount() / total * 100.0;
            avgLatency = stepProgress.getAvgResponseTimeMs();
            p95 = stepProgress.getP95ResponseTimeMs();
            p99 = stepProgress.getP99ResponseTimeMs();
            tps = duration > 0 ? (double) total / (duration / 1000.0) : 0;
        }

        String verdict = calcVerdict(errorRate, avgLatency, request);
        ThresholdStepResult result = new ThresholdStepResult(stepNum, concurrency, total,
                stepProgress.getSuccessCount(), stepProgress.getFailCount(),
                errorRate, avgLatency, p95, p99, tps, verdict, duration);
        result.setPhaseLabel(phaseLabel);
        return result;
    }

    private String calcVerdict(double errorRate, double avgLatency, AutoThresholdRequest req) {
        double errThresh = req.getErrorRateThreshold();
        double latThresh = req.getLatencyThresholdMs();

        if (errorRate >= errThresh * 2 || avgLatency >= latThresh * 2) return "BROKEN";
        if (errorRate >= errThresh || avgLatency >= latThresh) return "BREAKING";
        if (errorRate >= errThresh * 0.5 || avgLatency >= latThresh * 0.7) return "WARNING";
        return "GOOD";
    }

    private boolean isBreaking(ThresholdStepResult result) {
        return "BREAKING".equals(result.getVerdict()) || "BROKEN".equals(result.getVerdict());
    }

    public AutoThresholdProgress getProgress(String taskId) {
        return progressMap.get(taskId);
    }

    public TrafficResponse stopAutoThreshold(String taskId) {
        AutoThresholdProgress progress = progressMap.get(taskId);
        if (progress == null) return null;

        if (!"RUNNING".equals(progress.getStatus())) {
            return new TrafficResponse(taskId, progress.getStatus(), "이미 " + progress.getStatus() + " 상태입니다.");
        }

        AtomicBoolean cancelled = cancelMap.get(taskId);
        if (cancelled != null) cancelled.set(true);

        return new TrafficResponse(taskId, "STOPPED", "자동 임계점 측정이 중지되었습니다.");
    }
}
