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
public class ThresholdService {

    private static final Logger log = LoggerFactory.getLogger(ThresholdService.class);
    private static final int MAX_CONCURRENT_TESTS = 3;

    private final HttpRequestExecutor httpRequestExecutor;
    private final Map<String, ThresholdProgress> progressMap = new ConcurrentHashMap<>();
    private final Map<String, AtomicBoolean> cancelMap = new ConcurrentHashMap<>();
    private final ExecutorService taskExecutor = Executors.newFixedThreadPool(MAX_CONCURRENT_TESTS);

    public ThresholdService(HttpRequestExecutor httpRequestExecutor) {
        this.httpRequestExecutor = httpRequestExecutor;
    }

    public TrafficResponse startThreshold(ThresholdRequest request) {
        long running = progressMap.values().stream()
                .filter(p -> "RUNNING".equals(p.getStatus()))
                .count();
        if (running >= MAX_CONCURRENT_TESTS) {
            return new TrafficResponse(null, "REJECTED",
                    "동시 임계점 측정은 " + MAX_CONCURRENT_TESTS + "개까지 가능합니다.");
        }

        String taskId = UUID.randomUUID().toString();
        ThresholdProgress progress = new ThresholdProgress(taskId);
        AtomicBoolean cancelled = new AtomicBoolean(false);

        progressMap.put(taskId, progress);
        cancelMap.put(taskId, cancelled);

        taskExecutor.submit(() -> runThresholdTest(request, progress, cancelled));

        return new TrafficResponse(taskId, "RUNNING", "임계점 측정이 시작되었습니다.");
    }

    private void runThresholdTest(ThresholdRequest request, ThresholdProgress progress, AtomicBoolean cancelled) {
        int concurrency = request.getStartConcurrency();
        int stepNum = 1;

        try {
            while (concurrency <= request.getMaxConcurrency() && !cancelled.get()) {
                progress.setCurrentStep(stepNum);
                progress.setCurrentConcurrency(concurrency);

                log.info("Threshold step {}: concurrency={}, url={}", stepNum, concurrency, request.getTargetUrl());

                ThresholdStepResult stepResult = executeStep(request, concurrency, stepNum, cancelled);

                if (cancelled.get()) break;

                progress.addStepResult(stepResult);

                boolean isBreaking = "BREAKING".equals(stepResult.getVerdict())
                        || "BROKEN".equals(stepResult.getVerdict());

                if (!isBreaking) {
                    progress.setSafeOperatingConcurrency(concurrency);
                }
                if (isBreaking && progress.getBreakingPointConcurrency() == null) {
                    progress.setBreakingPointConcurrency(concurrency);
                }
                if (stepResult.getTps() > progress.getMaxTps()) {
                    progress.setMaxTps(stepResult.getTps());
                }

                log.info("Threshold step {} result: verdict={}, errorRate={}%, avgLatency={}ms, tps={}",
                        stepNum, stepResult.getVerdict(),
                        String.format("%.1f", stepResult.getErrorRate()),
                        Math.round(stepResult.getAvgResponseTimeMs()),
                        String.format("%.1f", stepResult.getTps()));

                if (isBreaking && request.isAutoStop()) {
                    log.info("Auto-stop: breaking point at concurrency={}", concurrency);
                    break;
                }

                concurrency += request.getConcurrencyStep();
                stepNum++;
            }

            if (!cancelled.get()) {
                progress.setRecommendation(buildRecommendation(progress, request));
                progress.setStatus("COMPLETED");
            } else {
                progress.setStatus("STOPPED");
            }
        } catch (Exception e) {
            log.error("Threshold test failed: taskId={}", progress.getTaskId(), e);
            progress.setStatus("FAILED");
        }
    }

    private ThresholdStepResult executeStep(ThresholdRequest request, int concurrency, int stepNum,
                                            AtomicBoolean cancelled) {
        TrafficRequest stepRequest = new TrafficRequest();
        stepRequest.setTargetUrl(request.getTargetUrl());
        stepRequest.setHttpMethod(request.getHttpMethod());
        stepRequest.setHeaders(request.getHeaders());
        stepRequest.setRequestBody(request.getRequestBody());
        stepRequest.setTotalRequests(request.getRequestsPerStep());
        stepRequest.setConcurrency(concurrency);
        stepRequest.setRampUp(false);

        TrafficProgress stepProgress = new TrafficProgress(null, request.getRequestsPerStep());

        long stepStart = System.currentTimeMillis();
        httpRequestExecutor.execute(stepRequest, stepProgress, cancelled);
        long stepDuration = System.currentTimeMillis() - stepStart;

        return buildStepResult(stepNum, concurrency, stepProgress, stepDuration, request);
    }

    private ThresholdStepResult buildStepResult(int step, int concurrency, TrafficProgress sp,
                                                long duration, ThresholdRequest req) {
        int total = sp.getCompletedRequests();
        double errorRate;
        double avgLatency;
        double p95Latency;
        double p99Latency;
        double tps;

        if (total == 0) {
            errorRate = 100.0;
            avgLatency = 0;
            p95Latency = 0;
            p99Latency = 0;
            tps = 0;
        } else {
            errorRate = (double) sp.getFailCount() / total * 100.0;
            avgLatency = sp.getAvgResponseTimeMs();
            p95Latency = sp.getP95ResponseTimeMs();
            p99Latency = sp.getP99ResponseTimeMs();
            tps = duration > 0 ? (double) total / (duration / 1000.0) : 0;
        }

        String verdict = calcVerdict(errorRate, avgLatency, req);

        return new ThresholdStepResult(step, concurrency, total, sp.getSuccessCount(), sp.getFailCount(),
                errorRate, avgLatency, p95Latency, p99Latency, tps, verdict, duration);
    }

    private String calcVerdict(double errorRate, double avgLatency, ThresholdRequest req) {
        double errThresh = req.getErrorRateThreshold();
        double latThresh = req.getLatencyThresholdMs();

        if (errorRate >= errThresh * 2 || avgLatency >= latThresh * 2) return "BROKEN";
        if (errorRate >= errThresh || avgLatency >= latThresh) return "BREAKING";
        if (errorRate >= errThresh * 0.5 || avgLatency >= latThresh * 0.7) return "WARNING";
        return "GOOD";
    }

    private String buildRecommendation(ThresholdProgress progress, ThresholdRequest request) {
        Integer breaking = progress.getBreakingPointConcurrency();
        Integer safe = progress.getSafeOperatingConcurrency();

        if (breaking == null) {
            return String.format(
                    "테스트 범위(%d~%d 동시접속)에서 성능 저하가 발생하지 않았습니다. 더 높은 부하로 재테스트를 권장합니다.",
                    request.getStartConcurrency(), request.getMaxConcurrency());
        }
        if (safe == null) {
            return String.format(
                    "시작 동시접속(%d)부터 이미 성능 저하가 발생했습니다. 서버 리소스와 설정을 점검하세요.",
                    request.getStartConcurrency());
        }
        return String.format(
                "권장 최대 동시접속: %d (동시접속 %d부터 성능 저하 감지). 최대 TPS: %.1f req/s",
                safe, breaking, progress.getMaxTps());
    }

    public ThresholdProgress getProgress(String taskId) {
        return progressMap.get(taskId);
    }

    public TrafficResponse stopThreshold(String taskId) {
        ThresholdProgress progress = progressMap.get(taskId);
        if (progress == null) return null;

        if (!"RUNNING".equals(progress.getStatus())) {
            return new TrafficResponse(taskId, progress.getStatus(),
                    "이미 " + progress.getStatus() + " 상태입니다.");
        }

        AtomicBoolean cancelled = cancelMap.get(taskId);
        if (cancelled != null) cancelled.set(true);

        return new TrafficResponse(taskId, "STOPPED", "임계점 측정이 중지되었습니다.");
    }
}
