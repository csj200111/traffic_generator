package com.traffic.generator.dto;

public class TrafficProgress {

    private String taskId;
    private int totalRequests;
    private int completedRequests;
    private int successCount;
    private int failCount;
    private double progressRate;
    private String status;
    private long elapsedTimeMs;

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

    public String getTaskId() {
        return taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public int getTotalRequests() {
        return totalRequests;
    }

    public void setTotalRequests(int totalRequests) {
        this.totalRequests = totalRequests;
    }

    public int getCompletedRequests() {
        return completedRequests;
    }

    public void setCompletedRequests(int completedRequests) {
        this.completedRequests = completedRequests;
    }

    public int getSuccessCount() {
        return successCount;
    }

    public void setSuccessCount(int successCount) {
        this.successCount = successCount;
    }

    public int getFailCount() {
        return failCount;
    }

    public void setFailCount(int failCount) {
        this.failCount = failCount;
    }

    public double getProgressRate() {
        return progressRate;
    }

    public void setProgressRate(double progressRate) {
        this.progressRate = progressRate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public long getElapsedTimeMs() {
        return elapsedTimeMs;
    }

    public void setElapsedTimeMs(long elapsedTimeMs) {
        this.elapsedTimeMs = elapsedTimeMs;
    }
}
