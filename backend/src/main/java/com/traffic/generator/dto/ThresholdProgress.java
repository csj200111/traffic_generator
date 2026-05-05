package com.traffic.generator.dto;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class ThresholdProgress {

    private String taskId;
    private volatile String status;
    private volatile int currentStep;
    private volatile int currentConcurrency;
    private final List<ThresholdStepResult> stepResults = new CopyOnWriteArrayList<>();
    private volatile Integer breakingPointConcurrency;
    private volatile Integer safeOperatingConcurrency;
    private volatile double maxTps;
    private volatile String recommendation;

    public ThresholdProgress() {}

    public ThresholdProgress(String taskId) {
        this.taskId = taskId;
        this.status = "RUNNING";
        this.currentStep = 0;
        this.currentConcurrency = 0;
        this.maxTps = 0.0;
    }

    public void addStepResult(ThresholdStepResult result) {
        stepResults.add(result);
    }

    public String getTaskId() { return taskId; }
    public void setTaskId(String taskId) { this.taskId = taskId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getCurrentStep() { return currentStep; }
    public void setCurrentStep(int currentStep) { this.currentStep = currentStep; }

    public int getCurrentConcurrency() { return currentConcurrency; }
    public void setCurrentConcurrency(int currentConcurrency) { this.currentConcurrency = currentConcurrency; }

    public List<ThresholdStepResult> getStepResults() { return stepResults; }

    public Integer getBreakingPointConcurrency() { return breakingPointConcurrency; }
    public void setBreakingPointConcurrency(Integer breakingPointConcurrency) { this.breakingPointConcurrency = breakingPointConcurrency; }

    public Integer getSafeOperatingConcurrency() { return safeOperatingConcurrency; }
    public void setSafeOperatingConcurrency(Integer safeOperatingConcurrency) { this.safeOperatingConcurrency = safeOperatingConcurrency; }

    public double getMaxTps() { return maxTps; }
    public void setMaxTps(double maxTps) { this.maxTps = maxTps; }

    public String getRecommendation() { return recommendation; }
    public void setRecommendation(String recommendation) { this.recommendation = recommendation; }
}
