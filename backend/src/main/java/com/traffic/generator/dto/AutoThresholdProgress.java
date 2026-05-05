package com.traffic.generator.dto;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class AutoThresholdProgress {

    private String taskId;
    private volatile String status;        // RUNNING, COMPLETED, STOPPED, FAILED
    private volatile String phase;         // ESCALATION, BINARY_SEARCH
    private volatile String phaseDescription;
    private volatile int currentConcurrency;
    private volatile Integer searchRangeLo;
    private volatile Integer searchRangeHi;
    private final List<ThresholdStepResult> stepResults = new CopyOnWriteArrayList<>();
    private volatile Integer finalThreshold;
    private volatile Integer breakingPointConcurrency;
    private volatile double maxTps;
    private volatile String recommendation;

    public AutoThresholdProgress() {}

    public AutoThresholdProgress(String taskId) {
        this.taskId = taskId;
        this.status = "RUNNING";
        this.phase = "ESCALATION";
        this.phaseDescription = "범위 탐색 중...";
        this.maxTps = 0.0;
    }

    public void addStepResult(ThresholdStepResult result) {
        stepResults.add(result);
    }

    public String getTaskId() { return taskId; }
    public void setTaskId(String taskId) { this.taskId = taskId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPhase() { return phase; }
    public void setPhase(String phase) { this.phase = phase; }

    public String getPhaseDescription() { return phaseDescription; }
    public void setPhaseDescription(String phaseDescription) { this.phaseDescription = phaseDescription; }

    public int getCurrentConcurrency() { return currentConcurrency; }
    public void setCurrentConcurrency(int currentConcurrency) { this.currentConcurrency = currentConcurrency; }

    public Integer getSearchRangeLo() { return searchRangeLo; }
    public void setSearchRangeLo(Integer searchRangeLo) { this.searchRangeLo = searchRangeLo; }

    public Integer getSearchRangeHi() { return searchRangeHi; }
    public void setSearchRangeHi(Integer searchRangeHi) { this.searchRangeHi = searchRangeHi; }

    public List<ThresholdStepResult> getStepResults() { return stepResults; }

    public Integer getFinalThreshold() { return finalThreshold; }
    public void setFinalThreshold(Integer finalThreshold) { this.finalThreshold = finalThreshold; }

    public Integer getBreakingPointConcurrency() { return breakingPointConcurrency; }
    public void setBreakingPointConcurrency(Integer breakingPointConcurrency) { this.breakingPointConcurrency = breakingPointConcurrency; }

    public double getMaxTps() { return maxTps; }
    public void setMaxTps(double maxTps) { this.maxTps = maxTps; }

    public String getRecommendation() { return recommendation; }
    public void setRecommendation(String recommendation) { this.recommendation = recommendation; }
}
