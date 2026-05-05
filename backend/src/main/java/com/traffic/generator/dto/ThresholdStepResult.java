package com.traffic.generator.dto;

public class ThresholdStepResult {

    private int step;
    private int concurrency;
    private int requestsSent;
    private int successCount;
    private int failCount;
    private double errorRate;
    private double avgResponseTimeMs;
    private double p95ResponseTimeMs;
    private double p99ResponseTimeMs;
    private double tps;
    private String verdict; // GOOD, WARNING, BREAKING, BROKEN
    private long durationMs;
    private String phaseLabel; // null for manual, "범위 탐색" / "정밀 탐색" for auto

    public ThresholdStepResult(int step, int concurrency, int requestsSent, int successCount, int failCount,
                               double errorRate, double avgResponseTimeMs, double p95ResponseTimeMs,
                               double p99ResponseTimeMs, double tps, String verdict, long durationMs) {
        this.step = step;
        this.concurrency = concurrency;
        this.requestsSent = requestsSent;
        this.successCount = successCount;
        this.failCount = failCount;
        this.errorRate = errorRate;
        this.avgResponseTimeMs = avgResponseTimeMs;
        this.p95ResponseTimeMs = p95ResponseTimeMs;
        this.p99ResponseTimeMs = p99ResponseTimeMs;
        this.tps = tps;
        this.verdict = verdict;
        this.durationMs = durationMs;
    }

    public int getStep() { return step; }
    public int getConcurrency() { return concurrency; }
    public int getRequestsSent() { return requestsSent; }
    public int getSuccessCount() { return successCount; }
    public int getFailCount() { return failCount; }
    public double getErrorRate() { return errorRate; }
    public double getAvgResponseTimeMs() { return avgResponseTimeMs; }
    public double getP95ResponseTimeMs() { return p95ResponseTimeMs; }
    public double getP99ResponseTimeMs() { return p99ResponseTimeMs; }
    public double getTps() { return tps; }
    public String getVerdict() { return verdict; }
    public long getDurationMs() { return durationMs; }
    public String getPhaseLabel() { return phaseLabel; }
    public void setPhaseLabel(String phaseLabel) { this.phaseLabel = phaseLabel; }
}
