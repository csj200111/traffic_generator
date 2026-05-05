import React from 'react';
import ProgressBar from './ProgressBar';
import StatusBadge from './StatusBadge';
import TpsChart from './TpsChart';
import LatencyChart from './LatencyChart';
import StatusCodeChart from './StatusCodeChart';
import AnalysisSummary from './AnalysisSummary';

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function ResultPanel({ progress, isRunning }) {
  if (!progress) {
    return (
      <div className="result-panel result-panel-empty">
        <p>Start 버튼을 눌러 트래픽을 생성하세요.</p>
      </div>
    );
  }

  return (
    <div className="result-panel">
      <div className="result-header">
        <span className="result-header-label">Status</span>
        <StatusBadge status={progress.status} />
      </div>

      <ProgressBar value={progress.progressRate} status={progress.status} />

      <div className="result-details">
        {progress.completedRequests} / {progress.totalRequests}
      </div>

      <div className="result-stats">
        <div className="stat stat-success">
          <span className="stat-label">Success</span>
          <span className="stat-value">{progress.successCount}</span>
        </div>
        <div className="stat stat-fail">
          <span className="stat-label">Fail</span>
          <span className="stat-value">{progress.failCount}</span>
        </div>
        <div className="stat stat-time">
          <span className="stat-label">Time</span>
          <span className="stat-value">{formatTime(progress.elapsedTimeMs)}</span>
        </div>
      </div>

      {(progress.avgResponseTimeMs > 0 || progress.p95ResponseTimeMs > 0) && (
        <div className="result-latency-stats">
          <div className="stat stat-latency">
            <span className="stat-label">Avg</span>
            <span className="stat-value">{Math.round(progress.avgResponseTimeMs)}ms</span>
          </div>
          <div className="stat stat-latency">
            <span className="stat-label">P95</span>
            <span className="stat-value stat-value-warning">{Math.round(progress.p95ResponseTimeMs)}ms</span>
          </div>
          <div className="stat stat-latency">
            <span className="stat-label">P99</span>
            <span className="stat-value stat-value-danger">{Math.round(progress.p99ResponseTimeMs)}ms</span>
          </div>
          <div className="stat stat-latency">
            <span className="stat-label">TPS</span>
            <span className="stat-value stat-value-tps">{Math.round(progress.currentTps)}</span>
          </div>
        </div>
      )}

      <div className="charts-section">
        <TpsChart tpsHistory={progress.tpsHistory} currentConcurrency={progress.currentConcurrency} />
        <LatencyChart
          avgResponseTimeMs={progress.avgResponseTimeMs}
          minResponseTimeMs={progress.minResponseTimeMs}
          maxResponseTimeMs={progress.maxResponseTimeMs}
          p95ResponseTimeMs={progress.p95ResponseTimeMs}
          p99ResponseTimeMs={progress.p99ResponseTimeMs}
        />
        <StatusCodeChart statusCodeCounts={progress.statusCodeCounts} />
      </div>

      {progress.status !== 'RUNNING' && (
        <AnalysisSummary progress={progress} />
      )}

    </div>
  );
}
