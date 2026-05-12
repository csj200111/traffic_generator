function fmtMs(ms) {
  if (!ms || ms === 0) return '0ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtDate(date) {
  return date.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function analyzeTraffic(p) {
  const successRate = p.totalRequests > 0 ? (p.successCount / p.totalRequests) * 100 : 0;
  const avg = p.avgResponseTimeMs || 0;

  let verdict, verdictLabel, verdictDesc;
  const p95Grade = p.p95ResponseTimeMs < 500 ? 'GOOD' : p.p95ResponseTimeMs < 1000 ? 'WARNING' : 'POOR';
  const latencyGrade = avg === 0 ? 'UNKNOWN' : avg < 200 ? 'FAST' : avg < 500 ? 'MODERATE' : avg < 1000 ? 'SLOW' : 'VERY_SLOW';

  if (successRate >= 99 && (latencyGrade === 'FAST' || latencyGrade === 'MODERATE') && p95Grade !== 'POOR') {
    verdict = latencyGrade === 'FAST' && p95Grade === 'GOOD' && successRate >= 99.5 ? 'EXCELLENT' : 'GOOD';
  } else if (successRate >= 95 && latencyGrade !== 'VERY_SLOW') {
    verdict = 'WARNING';
  } else {
    verdict = 'POOR';
  }

  const LABELS = {
    EXCELLENT: { label: '매우 우수', desc: '트래픽을 완벽하게 처리했습니다.', color: '#166534', bg: '#f0fdf4' },
    GOOD:      { label: '양호',      desc: '트래픽을 안정적으로 처리했습니다.', color: '#1d4ed8', bg: '#eff6ff' },
    WARNING:   { label: '주의',      desc: '일부 성능 저하가 감지되었습니다.',  color: '#92400e', bg: '#fffbeb' },
    POOR:      { label: '개선 필요', desc: '트래픽 처리에 문제가 발생했습니다.', color: '#7f1d1d', bg: '#fef2f2' },
  };

  const suggestions = [];
  const failRate = 100 - successRate;
  if (failRate > 5) suggestions.push(`실패율이 ${failRate.toFixed(1)}%입니다. 서버 로그를 확인하고 오류 원인을 분석하세요.`);
  else if (failRate > 1) suggestions.push(`실패율이 ${failRate.toFixed(1)}%입니다. 간헐적인 오류가 발생하고 있습니다.`);

  const serverErrors = Object.entries(p.statusCodeCounts || {})
    .filter(([code]) => parseInt(code) >= 500)
    .reduce((sum, [, count]) => sum + count, 0);
  const serverErrorRate = p.totalRequests > 0 ? (serverErrors / p.totalRequests) * 100 : 0;
  if (serverErrorRate > 1) suggestions.push(`5xx 서버 오류가 ${serverErrorRate.toFixed(1)}% 발생했습니다.`);

  if (latencyGrade === 'VERY_SLOW') suggestions.push(`평균 응답시간이 ${Math.round(avg)}ms로 매우 느립니다. DB 최적화 또는 캐싱 도입을 고려하세요.`);
  else if (latencyGrade === 'SLOW') suggestions.push(`평균 응답시간이 ${Math.round(avg)}ms입니다. 캐싱 전략 도입을 고려하세요.`);

  if (p95Grade === 'POOR') suggestions.push(`P95 응답시간이 ${Math.round(p.p95ResponseTimeMs)}ms입니다. 상위 5% 요청이 심각하게 느립니다.`);
  else if (p95Grade === 'WARNING') suggestions.push(`P95 응답시간이 ${Math.round(p.p95ResponseTimeMs)}ms입니다. 일부 요청 지연이 발생합니다.`);

  if (p.p99ResponseTimeMs > 0 && p.p95ResponseTimeMs > 0 && p.p99ResponseTimeMs > p.p95ResponseTimeMs * 2.5) {
    suggestions.push(`P99(${Math.round(p.p99ResponseTimeMs)}ms)이 P95의 ${(p.p99ResponseTimeMs / p.p95ResponseTimeMs).toFixed(1)}배입니다. 특정 요청에서 응답 급증이 발생합니다.`);
  }
  if (suggestions.length === 0) suggestions.push(verdict === 'EXCELLENT' ? '모든 지표가 우수합니다. 현재 서버 구성을 유지하세요.' : '전반적인 성능은 양호합니다. 지속적인 모니터링을 권장합니다.');

  return { successRate, serverErrorRate, latencyGrade, p95Grade, verdict, cfg: LABELS[verdict], suggestions };
}

function trafficSection(p) {
  const { successRate, serverErrorRate, latencyGrade, p95Grade, verdict, cfg, suggestions } = analyzeTraffic(p);
  const LATENCY_LABELS = { FAST: '빠름 (200ms 미만)', MODERATE: '보통 (200~500ms)', SLOW: '느림 (500ms~1s)', VERY_SLOW: '매우 느림 (1s 이상)', UNKNOWN: '-' };

  const statusRows = Object.entries(p.statusCodeCounts || {})
    .sort(([a], [b]) => a - b)
    .map(([code, count]) => {
      const c = parseInt(code);
      const color = c >= 500 ? '#b91c1c' : c >= 400 ? '#b45309' : '#166534';
      return `<tr><td style="font-weight:700;color:${color}">${code}</td><td>${count.toLocaleString()}회</td><td>${p.totalRequests > 0 ? (count / p.totalRequests * 100).toFixed(1) : 0}%</td></tr>`;
    }).join('');

  return `
    <div class="section">
      <h2>분석 결과</h2>
      <div class="verdict-box" style="background:${cfg.bg};border-left:4px solid ${cfg.color}">
        <span class="verdict-label" style="color:${cfg.color}">${cfg.label}</span>
        <span class="verdict-desc">${cfg.desc}</span>
      </div>
      <table>
        <tr><th>항목</th><th>수치</th><th>평가</th></tr>
        <tr>
          <td>성공률</td>
          <td>${successRate.toFixed(1)}%</td>
          <td style="color:${successRate >= 99 ? '#166534' : successRate >= 95 ? '#b45309' : '#b91c1c'}">${successRate >= 99 ? '우수' : successRate >= 95 ? '주의' : '개선 필요'}</td>
        </tr>
        <tr>
          <td>평균 응답시간</td>
          <td>${Math.round(p.avgResponseTimeMs)}ms</td>
          <td>${LATENCY_LABELS[latencyGrade]}</td>
        </tr>
        <tr>
          <td>P95 응답시간</td>
          <td>${Math.round(p.p95ResponseTimeMs)}ms</td>
          <td style="color:${p95Grade === 'GOOD' ? '#166534' : p95Grade === 'WARNING' ? '#b45309' : '#b91c1c'}">${p95Grade === 'GOOD' ? '양호' : p95Grade === 'WARNING' ? '주의' : '개선 필요'}</td>
        </tr>
        ${serverErrorRate > 0 ? `<tr><td>5xx 오류율</td><td style="color:#b91c1c">${serverErrorRate.toFixed(1)}%</td><td style="color:#b91c1c">서버 오류</td></tr>` : ''}
      </table>
      <div class="suggestions">
        <div class="suggestions-title">권장사항</div>
        <ul>${suggestions.map(s => `<li>${s}</li>`).join('')}</ul>
      </div>
    </div>

    <div class="section">
      <h2>요청 통계</h2>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-label">총 요청 수</div><div class="stat-value">${p.totalRequests.toLocaleString()}</div></div>
        <div class="stat-card" style="border-color:#166534"><div class="stat-label">성공</div><div class="stat-value" style="color:#166534">${p.successCount.toLocaleString()}</div></div>
        <div class="stat-card" style="border-color:#b91c1c"><div class="stat-label">실패</div><div class="stat-value" style="color:#b91c1c">${p.failCount.toLocaleString()}</div></div>
        <div class="stat-card"><div class="stat-label">성공률</div><div class="stat-value">${successRate.toFixed(1)}%</div></div>
        <div class="stat-card"><div class="stat-label">소요 시간</div><div class="stat-value">${fmtMs(p.elapsedTimeMs)}</div></div>
        <div class="stat-card"><div class="stat-label">최대 TPS</div><div class="stat-value">${(p.maxTps || p.currentTps || 0).toFixed(1)}</div></div>
      </div>
    </div>

    <div class="section">
      <h2>응답시간 분포</h2>
      <table>
        <tr><th>지표</th><th>수치</th></tr>
        <tr><td>평균 (Avg)</td><td>${Math.round(p.avgResponseTimeMs)}ms</td></tr>
        <tr><td>최솟값 (Min)</td><td>${Math.round(p.minResponseTimeMs || 0)}ms</td></tr>
        <tr><td>최댓값 (Max)</td><td>${Math.round(p.maxResponseTimeMs || 0)}ms</td></tr>
        <tr><td>P95</td><td>${Math.round(p.p95ResponseTimeMs)}ms</td></tr>
        <tr><td>P99</td><td>${Math.round(p.p99ResponseTimeMs)}ms</td></tr>
      </table>
    </div>

    ${statusRows ? `
    <div class="section">
      <h2>HTTP 상태 코드 분포</h2>
      <table>
        <tr><th>상태 코드</th><th>횟수</th><th>비율</th></tr>
        ${statusRows}
      </table>
    </div>` : ''}
  `;
}

const VERDICT_LABELS = { GOOD: '정상', WARNING: '주의', BREAKING: '한계', BROKEN: '초과' };
const VERDICT_COLORS = { GOOD: '#166534', WARNING: '#b45309', BREAKING: '#c2410c', BROKEN: '#b91c1c' };

function thresholdSection(p) {
  const steps = p.stepResults || [];
  return `
    <div class="section">
      <h2>임계점 측정 요약</h2>
      <div class="stat-grid">
        <div class="stat-card" style="border-color:#166534">
          <div class="stat-label">안전 운영 한계</div>
          <div class="stat-value" style="color:#166534">${p.safeOperatingConcurrency != null ? `동시접속 ${p.safeOperatingConcurrency}명` : '-'}</div>
        </div>
        <div class="stat-card" style="border-color:#b91c1c">
          <div class="stat-label">성능 저하 시작</div>
          <div class="stat-value" style="color:#b91c1c">${p.breakingPointConcurrency != null ? `동시접속 ${p.breakingPointConcurrency}명` : '-'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">최대 TPS</div>
          <div class="stat-value">${p.maxTps > 0 ? `${p.maxTps.toFixed(1)} req/s` : '-'}</div>
        </div>
      </div>
    </div>

    ${steps.length > 0 ? `
    <div class="section">
      <h2>단계별 측정 결과</h2>
      <table>
        <tr><th>동시접속</th><th>성공</th><th>실패</th><th>에러율</th><th>Avg</th><th>P95</th><th>TPS</th><th>판정</th></tr>
        ${steps.map(s => `
          <tr>
            <td style="font-weight:700">${s.concurrency}명</td>
            <td style="color:#166534">${s.successCount}</td>
            <td style="color:#b91c1c">${s.failCount}</td>
            <td style="color:${s.errorRate > 5 ? '#b91c1c' : '#374151'}">${s.errorRate.toFixed(1)}%</td>
            <td>${Math.round(s.avgResponseTimeMs)}ms</td>
            <td>${Math.round(s.p95ResponseTimeMs)}ms</td>
            <td>${s.tps.toFixed(1)}</td>
            <td style="font-weight:700;color:${VERDICT_COLORS[s.verdict] || '#374151'}">${VERDICT_LABELS[s.verdict] || s.verdict}</td>
          </tr>`).join('')}
      </table>
    </div>` : ''}

    ${p.recommendation ? `
    <div class="section">
      <h2>분석 결과</h2>
      <p class="recommendation">${p.recommendation}</p>
    </div>` : ''}
  `;
}

function autoSection(p) {
  const steps = p.stepResults || [];
  const isUnstable = p.finalThreshold === 0;
  const isStable = p.breakingPointConcurrency == null && p.finalThreshold !== 0;
  const thLabel = isUnstable ? '서버 불안정' : isStable ? '임계점 미도달 — 서버 안정적' : `발견된 임계점: 동시접속 ${p.finalThreshold}명`;
  const thColor = isUnstable ? '#b91c1c' : isStable ? '#1d4ed8' : '#166534';
  const thBg   = isUnstable ? '#fef2f2'  : isStable ? '#eff6ff'  : '#f0fdf4';

  return `
    <div class="section">
      <h2>자동 임계점 측정 요약</h2>
      <div class="verdict-box" style="background:${thBg};border-left:4px solid ${thColor}">
        <span class="verdict-label" style="color:${thColor}">${thLabel}</span>
        ${!isUnstable && !isStable ? `<span class="verdict-desc">${p.breakingPointConcurrency}명부터 성능 저하 시작</span>` : ''}
      </div>
      <div class="stat-grid" style="margin-top:14px">
        <div class="stat-card">
          <div class="stat-label">최대 TPS</div>
          <div class="stat-value">${p.maxTps > 0 ? `${p.maxTps.toFixed(1)} req/s` : '-'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">총 측정 단계</div>
          <div class="stat-value">${steps.length}단계</div>
        </div>
      </div>
    </div>

    ${steps.length > 0 ? `
    <div class="section">
      <h2>단계별 측정 결과</h2>
      <table>
        <tr><th>단계</th><th>탐색 유형</th><th>동시접속</th><th>에러율</th><th>Avg</th><th>P95</th><th>TPS</th><th>판정</th></tr>
        ${steps.map((s, i) => `
          <tr>
            <td style="color:#6b7280">${i + 1}</td>
            <td style="font-size:11px;color:${s.phaseLabel === '정밀 탐색' ? '#6d28d9' : '#1d4ed8'}">${s.phaseLabel || '-'}</td>
            <td style="font-weight:700">${s.concurrency}명</td>
            <td style="color:${s.errorRate > 5 ? '#b91c1c' : '#374151'}">${s.errorRate.toFixed(1)}%</td>
            <td>${Math.round(s.avgResponseTimeMs)}ms</td>
            <td>${Math.round(s.p95ResponseTimeMs)}ms</td>
            <td>${s.tps.toFixed(1)}</td>
            <td style="font-weight:700;color:${VERDICT_COLORS[s.verdict] || '#374151'}">${VERDICT_LABELS[s.verdict] || s.verdict}</td>
          </tr>`).join('')}
      </table>
    </div>` : ''}

    ${p.recommendation ? `
    <div class="section">
      <h2>분석 결과</h2>
      <p class="recommendation">${p.recommendation}</p>
    </div>` : ''}
  `;
}

const TYPE_LABELS = {
  traffic:   '트래픽 테스트',
  threshold: '임계점 측정',
  auto:      '자동 임계점 측정',
};

export function exportToPdf(item) {
  const { type, url, savedAt, progress: p } = item;
  const typeLabel = TYPE_LABELS[type] || type;
  const dateStr = fmtDate(savedAt);

  let bodyContent = '';
  if (type === 'traffic')   bodyContent = trafficSection(p);
  if (type === 'threshold') bodyContent = thresholdSection(p);
  if (type === 'auto')      bodyContent = autoSection(p);

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${typeLabel} 결과 보고서</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', Arial, sans-serif;
    font-size: 13px;
    color: #111827;
    background: #fff;
    padding: 36px 40px;
    line-height: 1.5;
  }
  /* Header */
  .report-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 16px;
    border-bottom: 2px solid #1d4ed8;
    margin-bottom: 24px;
  }
  .report-title { font-size: 20px; font-weight: 700; color: #111827; }
  .report-sub   { font-size: 13px; color: #374151; margin-top: 4px; }
  .report-meta  { text-align: right; font-size: 12px; color: #374151; line-height: 1.8; }
  .type-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 700;
    background: #dbeafe;
    color: #1d4ed8;
    margin-bottom: 6px;
  }
  /* Sections */
  .section { margin-bottom: 24px; }
  .section h2 {
    font-size: 13px;
    font-weight: 700;
    color: #111827;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e5e7eb;
  }
  /* Table */
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th {
    background: #f3f4f6;
    padding: 7px 10px;
    text-align: left;
    font-weight: 700;
    color: #111827;
    border-bottom: 1px solid #d1d5db;
    white-space: nowrap;
  }
  td {
    padding: 7px 10px;
    border-bottom: 1px solid #f3f4f6;
    color: #374151;
  }
  tr:last-child td { border-bottom: none; }
  /* Stat grid */
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  .stat-card {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px 14px;
    text-align: center;
  }
  .stat-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #374151;
    margin-bottom: 4px;
  }
  .stat-value { font-size: 18px; font-weight: 700; color: #111827; }
  /* Verdict */
  .verdict-box {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 10px;
  }
  .verdict-label { font-size:14px; font-weight:700; white-space:nowrap; }
  .verdict-desc  { font-size:13px; color:#374151; }
  /* Suggestions */
  .suggestions { background:#f9fafb; border-radius:8px; padding:12px 14px; margin-top:10px; }
  .suggestions-title { font-size:11px; font-weight:700; color:#111827; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px; }
  .suggestions ul { padding-left:16px; }
  .suggestions li { font-size:12px; color:#374151; margin-bottom:4px; line-height:1.5; }
  /* Recommendation */
  .recommendation { font-size:13px; color:#374151; line-height:1.7; background:#f9fafb; border-radius:8px; padding:12px 14px; }
  /* Footer */
  .report-footer {
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
    font-size: 11px;
    color: #6b7280;
    text-align: center;
  }
  @media print {
    body { padding: 20px 24px; }
    @page { margin: 15mm; }
  }
</style>
</head>
<body>
  <div class="report-header">
    <div>
      <div class="report-title">Traffic Generator 테스트 결과</div>
      <div class="report-sub">${url}</div>
    </div>
    <div class="report-meta">
      <div><span class="type-badge">${typeLabel}</span></div>
      <div>저장 시각: ${dateStr}</div>
      <div>상태: ${p.status || '-'}</div>
    </div>
  </div>

  ${bodyContent}

  <div class="report-footer">
    Traffic Generator · ${dateStr} 기준 · 본 보고서는 테스트 시점의 스냅샷입니다.
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('팝업이 차단되었습니다. 브라우저에서 팝업을 허용해 주세요.');
    return;
  }
  win.document.write(html);
  win.document.close();
}
