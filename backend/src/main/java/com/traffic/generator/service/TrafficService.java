package com.traffic.generator.service;

import com.traffic.generator.dto.TrafficProgress;
import com.traffic.generator.dto.TrafficRequest;
import com.traffic.generator.dto.TrafficResponse;
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
public class TrafficService {

    private static final Logger log = LoggerFactory.getLogger(TrafficService.class);
    private static final int MAX_CONCURRENT_TASKS = 5;

    private final HttpRequestExecutor httpRequestExecutor;
    private final Map<String, TrafficProgress> progressMap = new ConcurrentHashMap<>();
    private final Map<String, AtomicBoolean> cancelMap = new ConcurrentHashMap<>();
    private final ExecutorService taskExecutor = Executors.newFixedThreadPool(MAX_CONCURRENT_TASKS);

    public TrafficService(HttpRequestExecutor httpRequestExecutor) {
        this.httpRequestExecutor = httpRequestExecutor;
    }

    public TrafficResponse startTraffic(TrafficRequest request) {
        // 동시 작업 수 확인
        long runningTasks = progressMap.values().stream()
                .filter(p -> "RUNNING".equals(p.getStatus()))
                .count();

        if (runningTasks >= MAX_CONCURRENT_TASKS) {
            return new TrafficResponse(null, "REJECTED",
                    "동시 작업 수 제한(" + MAX_CONCURRENT_TASKS + "개)을 초과했습니다.");
        }

        String taskId = UUID.randomUUID().toString();
        TrafficProgress progress = new TrafficProgress(taskId, request.getTotalRequests());
        AtomicBoolean cancelled = new AtomicBoolean(false);

        progressMap.put(taskId, progress);
        cancelMap.put(taskId, cancelled);

        taskExecutor.submit(() -> {
            try {
                log.info("Traffic task started: taskId={}, url={}, total={}, concurrency={}",
                        taskId, request.getTargetUrl(), request.getTotalRequests(), request.getConcurrency());
                httpRequestExecutor.execute(request, progress, cancelled);
                log.info("Traffic task finished: taskId={}, status={}", taskId, progress.getStatus());
            } catch (Exception e) {
                log.error("Traffic task failed: taskId={}", taskId, e);
                progress.setStatus("FAILED");
            }
        });

        return new TrafficResponse(taskId, "RUNNING", "트래픽 생성이 시작되었습니다.");
    }

    public TrafficProgress getProgress(String taskId) {
        return progressMap.get(taskId);
    }

    public TrafficResponse stopTraffic(String taskId) {
        TrafficProgress progress = progressMap.get(taskId);
        if (progress == null) {
            return null;
        }

        if (!"RUNNING".equals(progress.getStatus())) {
            return new TrafficResponse(taskId, progress.getStatus(),
                    "이미 " + progress.getStatus() + " 상태인 작업입니다.");
        }

        AtomicBoolean cancelled = cancelMap.get(taskId);
        if (cancelled != null) {
            cancelled.set(true);
        }

        return new TrafficResponse(taskId, "STOPPED", "트래픽 생성이 중지되었습니다.");
    }
}
