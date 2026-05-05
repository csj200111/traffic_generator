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

function PhaseIndicator({ phase, status }) {
  const escalationDone = phase === 'BINARY_SEARCH' || phase === 'COMPLETED' || status !== 'RUNNING';
  const binaryDone = phase === 'COMPLETED' || status !== 'RUNNING';
  const isEscalation = phase === 'ESCALATION' && status === 'RUNNING';
  const isBinary = phase === 'BINARY_SEARCH' && status === 'RUNNING';

  return (
    <div className="phase-indicator">
      <div className={`phase-step ${escalationDone ? 'phase-done' : ''} ${isEscalation ? 'phase-active' : ''}`}>
        <span className="phase-num">{escalationDone ? '✓' : '1'}</span>
        <span className="phase-name">범위 탐색</span>
        {isEscalation && <span className="phase-dot" />}
      </div>
      <div className="phase-arrow">→</div>
      <div className={`phase-step ${binaryDone ? 'phase-done' : ''} ${isBinary ? 'phase-active' : ''}`}>
        <span className="phase-num">{binaryDone ? '✓' : '2'}</span>
        <span className="phase-name">정밀 탐색</span>
        {isBinary && <span className="phase-dot" />}
      </div>
      <div className="phase-arrow">→</div>
      <div className={`phase-step ${phase === 'COMPLETED' && status === 'COMPLETED' ? 'phase-done' : ''}`}>
        <span className="phase-num">✓</span>
        <span className="phase-name">완료</span>
      </div>
    </div>
  );
}

export default function AutoThresholdResultPanel({ progress, isRunning }) {
  if (!progress) {
    return (
      <div className="result-panel result-panel-empty">
        <p>자동 측정 시작 버튼을 눌러 임계점을 찾아드립니다.</p>
      </div>
    );
  }

  const steps = progress.stepResults || [];
  const isCompleted = progress.status === 'COMPLETED';
  const hasResult = progress.finalThreshold != null;

  return (
    <div className="result-panel">
      <div className="result-header">
        <span className="result-header-label">자동 임계점 측정</span>
        <StatusBadge status={progress.status} />
      </div>

      <PhaseIndicator phase={progress.phase} status={progress.status} />

      {progress.status === 'RUNNING' && (
        <div className="threshold-running-info">
          <span>{progress.phaseDescription}</span>
          <span>현재 테스트: 동시접속 <strong>{progress.currentConcurrency}명</strong></span>
          {progress.searchRangeLo != null && (
            <span className="search-range">탐색 범위: [{progress.searchRangeLo} ~ {progress.searchRangeHi}]</span>
          )}
          <span className="th-running-dot" />
        </div>
      )}

      {isCompleted && hasResult && (
        <div className={`auto-result-card ${
          progress.finalThreshold === 0
            ? 'auto-result-poor'
            : progress.breakingPointConcurrency == null
              ? 'auto-result-stable'
              : 'auto-result-found'
        }`}>
          {progress.finalThreshold === 0 ? (
            <>
              <div className="auto-result-label">서버 불안정</div>
              <div className="auto-result-value" style={{ fontSize: 18 }}>최소 부하에서 이미 오류 발생</div>
            </>
          ) : progress.breakingPointConcurrency == null ? (
            <>
              <div className="auto-result-label">임계점 미도달</div>
              <div className="auto-result-value" style={{ fontSize: 18 }}>서버 안정적</div>
            </>
          ) : (
            <>
              <div className="auto-result-label">발견된 임계점</div>
              <div className="auto-result-value">동시접속 {progress.finalThreshold}명</div>
              <div className="auto-result-sub">
                {progress.breakingPointConcurrency}명부터 성능 저하
              </div>
              {progress.maxTps > 0 && (
                <div className="auto-result-tps">최대 TPS: {progress.maxTps.toFixed(1)} req/s</div>
              )}
            </>
          )}
        </div>
      )}

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
                <th>단계</th>
                <th>동시접속</th>
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
                  <td>
                    {s.phaseLabel && (
                      <span className={`phase-chip ${s.phaseLabel === '정밀 탐색' ? 'phase-chip-binary' : 'phase-chip-escalation'}`}>
                        {s.phaseLabel}
                      </span>
                    )}
                  </td>
                  <td className="td-concurrency">{s.concurrency}</td>
                  <td className={s.errorRate > 5 ? 'td-error-high' : 'td-error'}>{s.errorRate.toFixed(1)}%</td>
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

      {progress.recommendation && isCompleted && (
        <div className="threshold-recommendation">
          <div className="suggestions-title">분석 결과</div>
          <p className="th-recommendation-text">{progress.recommendation}</p>
        </div>
      )}
    </div>
  );
}
