import React from 'react';
import StatusBadge from './StatusBadge';
import ThresholdChart from './ThresholdChart';

const VERDICT_LABELS = {
  GOOD:     { label: '정상', cls: 'vd-good' },
  WARNING:  { label: '주의', cls: 'vd-warning' },
  BREAKING: { label: '한계', cls: 'vd-breaking' },
  BROKEN:   { label: '초과', cls: 'vd-broken' },
};

function VerdictBadge({ verdict }) {
  const cfg = VERDICT_LABELS[verdict] || { label: verdict, cls: '' };
  return <span className={`verdict-chip ${cfg.cls}`}>{cfg.label}</span>;
}

export default function ThresholdResultPanel({ progress, isRunning }) {
  if (!progress) {
    return (
      <div className="result-panel result-panel-empty">
        <p>측정 시작 버튼을 눌러 임계점을 측정하세요.</p>
      </div>
    );
  }

  const steps = progress.stepResults || [];
  const hasBreaking = progress.breakingPointConcurrency != null;
  const hasSafe = progress.safeOperatingConcurrency != null;

  return (
    <div className="result-panel">
      <div className="result-header">
        <span className="result-header-label">임계점 측정</span>
        <StatusBadge status={progress.status} />
      </div>

      {progress.status === 'RUNNING' && (
        <div className="threshold-running-info">
          Step {progress.currentStep} 진행 중 · 동시접속 {progress.currentConcurrency}
          <span className="th-running-dot" />
        </div>
      )}

      <div className="threshold-summary-cards">
        <div className={`threshold-card ${hasSafe ? 'card-safe' : 'card-unknown'}`}>
          <span className="tc-label">안전 운영 한계</span>
          <span className="tc-value">
            {hasSafe ? `동시접속 ${progress.safeOperatingConcurrency}` : '-'}
          </span>
        </div>
        <div className={`threshold-card ${hasBreaking ? 'card-breaking' : 'card-unknown'}`}>
          <span className="tc-label">성능 저하 시작</span>
          <span className="tc-value">
            {hasBreaking ? `동시접속 ${progress.breakingPointConcurrency}` : '-'}
          </span>
        </div>
        <div className="threshold-card card-tps">
          <span className="tc-label">최대 TPS</span>
          <span className="tc-value">
            {progress.maxTps > 0 ? `${progress.maxTps.toFixed(1)} req/s` : '-'}
          </span>
        </div>
      </div>

      {steps.length > 0 && (
        <ThresholdChart
          stepResults={steps}
          breakingPoint={progress.breakingPointConcurrency}
        />
      )}

      {steps.length > 0 && (
        <div className="step-table-wrapper">
          <table className="step-table">
            <thead>
              <tr>
                <th>동시접속</th>
                <th>성공</th>
                <th>실패</th>
                <th>에러율</th>
                <th>Avg</th>
                <th>P95</th>
                <th>TPS</th>
                <th>판정</th>
              </tr>
            </thead>
            <tbody>
              {[...steps].reverse().map((s) => (
                <tr key={s.step}>
                  <td className="td-concurrency">{s.concurrency}</td>
                  <td className="td-success">{s.successCount}</td>
                  <td className="td-fail">{s.failCount}</td>
                  <td className={s.errorRate > 5 ? 'td-error-high' : 'td-error'}>
                    {s.errorRate.toFixed(1)}%
                  </td>
                  <td>{Math.round(s.avgResponseTimeMs)}ms</td>
                  <td>{Math.round(s.p95ResponseTimeMs)}ms</td>
                  <td>{s.tps.toFixed(1)}</td>
                  <td><VerdictBadge verdict={s.verdict} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {progress.recommendation && progress.status !== 'RUNNING' && (
        <div className="threshold-recommendation">
          <div className="suggestions-title">분석 결과</div>
          <p className="th-recommendation-text">{progress.recommendation}</p>
        </div>
      )}
    </div>
  );
}
