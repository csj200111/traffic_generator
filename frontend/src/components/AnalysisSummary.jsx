import React from 'react';

function analyzePerformance(progress) {
  const {
    successCount,
    totalRequests,
    avgResponseTimeMs,
    p95ResponseTimeMs,
    p99ResponseTimeMs,
    statusCodeCounts,
  } = progress;

  const successRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 0;
  const failRate = 100 - successRate;

  const serverErrors = Object.entries(statusCodeCounts || {})
    .filter(([code]) => parseInt(code) >= 500)
    .reduce((sum, [, count]) => sum + count, 0);
  const serverErrorRate = totalRequests > 0 ? (serverErrors / totalRequests) * 100 : 0;

  let latencyGrade;
  if (avgResponseTimeMs === 0) latencyGrade = 'UNKNOWN';
  else if (avgResponseTimeMs < 200) latencyGrade = 'FAST';
  else if (avgResponseTimeMs < 500) latencyGrade = 'MODERATE';
  else if (avgResponseTimeMs < 1000) latencyGrade = 'SLOW';
  else latencyGrade = 'VERY_SLOW';

  let p95Grade;
  if (p95ResponseTimeMs === 0) p95Grade = 'UNKNOWN';
  else if (p95ResponseTimeMs < 500) p95Grade = 'GOOD';
  else if (p95ResponseTimeMs < 1000) p95Grade = 'WARNING';
  else p95Grade = 'POOR';

  let verdict;
  if (successRate >= 99 && (latencyGrade === 'FAST' || latencyGrade === 'MODERATE') && p95Grade !== 'POOR') {
    verdict = latencyGrade === 'FAST' && p95Grade === 'GOOD' && successRate >= 99.5 ? 'EXCELLENT' : 'GOOD';
  } else if (successRate >= 95 && latencyGrade !== 'VERY_SLOW') {
    verdict = 'WARNING';
  } else {
    verdict = 'POOR';
  }

  const suggestions = [];

  if (failRate > 5) {
    suggestions.push(`실패율이 ${failRate.toFixed(1)}%입니다. 서버 로그를 확인하고 오류 원인을 분석하세요.`);
  } else if (failRate > 1) {
    suggestions.push(`실패율이 ${failRate.toFixed(1)}%입니다. 간헐적인 오류가 발생하고 있습니다.`);
  }

  if (serverErrorRate > 1) {
    suggestions.push(`5xx 서버 오류가 ${serverErrorRate.toFixed(1)}% 발생했습니다. 서버 안정성 개선이 필요합니다.`);
  }

  if (latencyGrade === 'VERY_SLOW') {
    suggestions.push(`평균 응답 시간이 ${Math.round(avgResponseTimeMs)}ms로 매우 느립니다. DB 쿼리 최적화, 캐싱 도입, 또는 서버 스케일아웃을 고려하세요.`);
  } else if (latencyGrade === 'SLOW') {
    suggestions.push(`평균 응답 시간이 ${Math.round(avgResponseTimeMs)}ms입니다. 캐싱 전략 도입이나 쿼리 최적화를 고려하세요.`);
  }

  if (p95Grade === 'POOR') {
    suggestions.push(`P95 응답 시간이 ${Math.round(p95ResponseTimeMs)}ms입니다. 상위 5% 요청이 심각하게 느립니다. 슬로우 쿼리 분석을 권장합니다.`);
  } else if (p95Grade === 'WARNING') {
    suggestions.push(`P95 응답 시간이 ${Math.round(p95ResponseTimeMs)}ms입니다. 일부 요청에서 응답 지연이 발생하고 있습니다.`);
  }

  if (
    p99ResponseTimeMs > 0 &&
    p95ResponseTimeMs > 0 &&
    p99ResponseTimeMs > p95ResponseTimeMs * 2.5
  ) {
    suggestions.push(
      `P99(${Math.round(p99ResponseTimeMs)}ms)이 P95(${Math.round(p95ResponseTimeMs)}ms)의 ${(p99ResponseTimeMs / p95ResponseTimeMs).toFixed(1)}배입니다. 특정 요청에서 응답 시간이 급격히 증가합니다.`
    );
  }

  if (suggestions.length === 0) {
    if (verdict === 'EXCELLENT') {
      suggestions.push('모든 지표가 우수합니다. 현재 서버 구성을 유지하세요.');
    } else {
      suggestions.push('전반적인 성능은 양호합니다. 지속적인 모니터링을 권장합니다.');
    }
  }

  return { verdict, successRate, failRate, serverErrorRate, latencyGrade, p95Grade, suggestions };
}

const VERDICT_CONFIG = {
  EXCELLENT: { label: '매우 우수', desc: '트래픽을 완벽하게 처리했습니다.', cls: 'verdict-excellent' },
  GOOD:      { label: '양호',      desc: '트래픽을 안정적으로 처리했습니다.', cls: 'verdict-good' },
  WARNING:   { label: '주의',      desc: '일부 성능 저하가 감지되었습니다.',  cls: 'verdict-warning' },
  POOR:      { label: '개선 필요', desc: '트래픽 처리에 문제가 발생했습니다.', cls: 'verdict-poor' },
};

const LATENCY_LABELS = {
  FAST:      '빠름 (200ms 미만)',
  MODERATE:  '보통 (200~500ms)',
  SLOW:      '느림 (500ms~1s)',
  VERY_SLOW: '매우 느림 (1s 이상)',
  UNKNOWN:   '-',
};

export default function AnalysisSummary({ progress }) {
  if (!progress || progress.totalRequests === 0) return null;

  const { verdict, successRate, serverErrorRate, latencyGrade, p95Grade, suggestions } =
    analyzePerformance(progress);
  const cfg = VERDICT_CONFIG[verdict];

  const p95Cls = p95Grade === 'GOOD' ? 'metric-good' : p95Grade === 'WARNING' ? 'metric-warn' : 'metric-bad';

  return (
    <div className="analysis-summary">
      <div className="analysis-header">분석 결과</div>

      <div className={`analysis-verdict ${cfg.cls}`}>
        <span className="verdict-badge">{cfg.label}</span>
        <span className="verdict-desc">{cfg.desc}</span>
      </div>

      <div className="analysis-metrics">
        <div className="analysis-metric">
          <span className="a-metric-label">성공률</span>
          <span className={`a-metric-value ${successRate >= 99 ? 'metric-good' : successRate >= 95 ? 'metric-warn' : 'metric-bad'}`}>
            {successRate.toFixed(1)}%
          </span>
        </div>
        <div className="analysis-metric">
          <span className="a-metric-label">평균 응답 시간</span>
          <span className={`a-metric-value metric-latency-${latencyGrade.toLowerCase()}`}>
            {Math.round(progress.avgResponseTimeMs)}ms
            <span className="a-metric-hint">{LATENCY_LABELS[latencyGrade]}</span>
          </span>
        </div>
        <div className="analysis-metric">
          <span className="a-metric-label">P95 응답 시간</span>
          <span className={`a-metric-value ${p95Cls}`}>
            {Math.round(progress.p95ResponseTimeMs)}ms
          </span>
        </div>
        {serverErrorRate > 0 && (
          <div className="analysis-metric">
            <span className="a-metric-label">5xx 오류율</span>
            <span className="a-metric-value metric-bad">{serverErrorRate.toFixed(1)}%</span>
          </div>
        )}
      </div>

      <div className="analysis-suggestions">
        <div className="suggestions-title">권장사항</div>
        <ul className="suggestions-list">
          {suggestions.map((s, i) => (
            <li key={i} className="suggestion-item">{s}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
