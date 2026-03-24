import React from 'react';
import ProgressBar from './ProgressBar';
import StatusBadge from './StatusBadge';

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
    </div>
  );
}
