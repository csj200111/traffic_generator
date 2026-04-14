package com.traffic.generator.dto;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import com.fasterxml.jackson.annotation.JsonIgnore;

public class TrafficProgress {

    private String taskId;
    private int totalRequests;
    private int completedRequests;
    private int successCount;
    private int failCount;
    private double progressRate;
    private String status;
    private long elapsedTimeMs;

    // 응답 시간 메트릭
    private double avgResponseTimeMs;
    private double minResponseTimeMs;
    private double maxResponseTimeMs;
    private double p95ResponseTimeMs;
    private double p99ResponseTimeMs;

    // 상태 코드 분포
    private Map<Integer, Integer> statusCodeCounts = new ConcurrentHashMap<>();

    // TPS
    private double currentTps;
    private List<double[]> tpsHistory = new CopyOnWriteArrayList<>();

    // 현재 동시접속 수 (ramp-up 시각화용)
    private int currentConcurrency;

    // 응답 시간 원본 데이터 (JSON 직렬화 제외)
    @JsonIgnore
    private final List<Long> responseTimes = new CopyOnWriteArrayList<>();

    @JsonIgnore
    private long lastTpsCalcTime;
    @JsonIgnore
    private int lastTpsCalcCount;

    public TrafficProgress() {
    }

    public TrafficProgress(String taskId, int totalRequests) {
        this.taskId = taskId;
        this.totalRequests = totalRequests;
        this.completedRequests = 0;
        this.successCount = 0;
        this.failCount = 0;
        this.progressRate = 0.0;
        this.status = "RUNNING";
        this.elapsedTimeMs = 0;
        this.avgResponseTimeMs = 0;
        this.minResponseTimeMs = 0;
        this.maxResponseTimeMs = 0;
        this.p95ResponseTimeMs = 0;
        this.p99ResponseTimeMs = 0;
        this.currentTps = 0;
        this.currentConcurrency = 0;
        this.lastTpsCalcTime = System.currentTimeMillis();
        this.lastTpsCalcCount = 0;
    }

    public void incrementSuccess() {
        this.successCount++;
        this.completedRequests++;
        updateProgressRate();
    }

    public void incrementFail() {
        this.failCount++;
        this.completedRequests++;
        updateProgressRate();
    }

    private void updateProgressRate() {
        this.progressRate = totalRequests > 0
                ? (double) completedRequests / totalRequests
                : 0.0;
    }

    public void recordResponseTime(long responseTimeMs) {
        responseTimes.add(responseTimeMs);
        recalculateLatencyMetrics();
    }

    public void recordStatusCode(int statusCode) {
        statusCodeCounts.merge(statusCode, 1, Integer::sum);
    }

    private void recalculateLatencyMetrics() {
        List<Long> sorted = new ArrayList<>(responseTimes);
        Collections.sort(sorted);
        int size = sorted.size();
        if (size == 0) return;

        long sum = 0;
        for (long t : sorted) sum += t;
        this.avgResponseTimeMs = (double) sum / size;
        this.minResponseTimeMs = sorted.get(0);
        this.maxResponseTimeMs = sorted.get(size - 1);
        this.p95ResponseTimeMs = sorted.get((int) Math.ceil(size * 0.95) - 1);
        this.p99ResponseTimeMs = sorted.get((int) Math.ceil(size * 0.99) - 1);
    }

    public void updateTps(long startTimeMs) {
        long now = System.currentTimeMillis();
        long elapsed = now - lastTpsCalcTime;
        if (elapsed >= 1000) {
            int countDiff = completedRequests - lastTpsCalcCount;
            this.currentTps = countDiff / (elapsed / 1000.0);
            double secondsSinceStart = (now - startTimeMs) / 1000.0;
            tpsHistory.add(new double[]{secondsSinceStart, this.currentTps});
            lastTpsCalcTime = now;
            lastTpsCalcCount = completedRequests;
        }
    }

    // Getters & Setters

    public String getTaskId() { return taskId; }
    public void setTaskId(String taskId) { this.taskId = taskId; }

    public int getTotalRequests() { return totalRequests; }
    public void setTotalRequests(int totalRequests) { this.totalRequests = totalRequests; }

    public int getCompletedRequests() { return completedRequests; }
    public void setCompletedRequests(int completedRequests) { this.completedRequests = completedRequests; }

    public int getSuccessCount() { return successCount; }
    public void setSuccessCount(int successCount) { this.successCount = successCount; }

    public int getFailCount() { return failCount; }
    public void setFailCount(int failCount) { this.failCount = failCount; }

    public double getProgressRate() { return progressRate; }
    public void setProgressRate(double progressRate) { this.progressRate = progressRate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public long getElapsedTimeMs() { return elapsedTimeMs; }
    public void setElapsedTimeMs(long elapsedTimeMs) { this.elapsedTimeMs = elapsedTimeMs; }

    public double getAvgResponseTimeMs() { return avgResponseTimeMs; }
    public double getMinResponseTimeMs() { return minResponseTimeMs; }
    public double getMaxResponseTimeMs() { return maxResponseTimeMs; }
    public double getP95ResponseTimeMs() { return p95ResponseTimeMs; }
    public double getP99ResponseTimeMs() { return p99ResponseTimeMs; }

    public Map<Integer, Integer> getStatusCodeCounts() { return statusCodeCounts; }

    public double getCurrentTps() { return currentTps; }
    public List<double[]> getTpsHistory() { return tpsHistory; }

    public int getCurrentConcurrency() { return currentConcurrency; }
    public void setCurrentConcurrency(int currentConcurrency) { this.currentConcurrency = currentConcurrency; }
}
