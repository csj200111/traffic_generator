import React, { useEffect } from 'react';

const TYPE_CFG = {
  traffic:   { label: '트래픽 테스트',    cls: 'hist-badge-traffic' },
  threshold: { label: '임계점 측정',      cls: 'hist-badge-threshold' },
  auto:      { label: '자동 임계점 측정', cls: 'hist-badge-auto' },
};

function formatDateTime(date) {
  return date.toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function getCompareRows(itemA, itemB) {
  if (itemA.type !== itemB.type) return null;
  const pA = itemA.progress, pB = itemB.progress;

  if (itemA.type === 'traffic') {
    const rateA = pA.totalRequests > 0 ? (pA.successCount / pA.totalRequests * 100) : 0;
    const rateB = pB.totalRequests > 0 ? (pB.successCount / pB.totalRequests * 100) : 0;
    return [
      { label: '성공률',      a: rateA,                              b: rateB,                              fmt: v => v.toFixed(1) + '%',          higherBetter: true  },
      { label: '총 요청 수',  a: pA.totalRequests,                   b: pB.totalRequests,                   fmt: v => v.toLocaleString() + '개',   neutral: true       },
      { label: '성공 수',     a: pA.successCount,                    b: pB.successCount,                    fmt: v => v.toLocaleString() + '개',   higherBetter: true  },
      { label: '실패 수',     a: pA.failCount,                       b: pB.failCount,                       fmt: v => v.toLocaleString() + '개',   higherBetter: false },
      { label: 'Avg 응답시간', a: pA.avgResponseTimeMs,              b: pB.avgResponseTimeMs,              fmt: v => Math.round(v) + 'ms',        higherBetter: false },
      { label: 'P95 응답시간', a: pA.p95ResponseTimeMs,              b: pB.p95ResponseTimeMs,              fmt: v => Math.round(v) + 'ms',        higherBetter: false },
      { label: 'P99 응답시간', a: pA.p99ResponseTimeMs,              b: pB.p99ResponseTimeMs,              fmt: v => Math.round(v) + 'ms',        higherBetter: false },
      { label: '최대 TPS',    a: pA.maxTps || pA.currentTps || 0,   b: pB.maxTps || pB.currentTps || 0,   fmt: v => v.toFixed(1),                higherBetter: true  },
    ];
  }

  if (itemA.type === 'threshold') {
    return [
      { label: '안전 운영 한계', a: pA.safeOperatingConcurrency,   b: pB.safeOperatingConcurrency,   fmt: v => v != null ? `${v}명` : '-',            higherBetter: true, nullable: true },
      { label: '성능 저하 시작', a: pA.breakingPointConcurrency,   b: pB.breakingPointConcurrency,   fmt: v => v != null ? `${v}명` : '-',            higherBetter: true, nullable: true },
      { label: '최대 TPS',      a: pA.maxTps || 0,                 b: pB.maxTps || 0,                 fmt: v => v > 0 ? `${v.toFixed(1)} req/s` : '-', higherBetter: true  },
      { label: '측정 단계',     a: pA.stepResults?.length || 0,    b: pB.stepResults?.length || 0,    fmt: v => `${v}단계`,                            neutral: true       },
    ];
  }

  if (itemA.type === 'auto') {
    const fmtAuto = (p) => {
      if (p.finalThreshold === 0) return '서버 불안정';
      if (p.breakingPointConcurrency == null) return '서버 안정적';
      return `${p.finalThreshold}명`;
    };
    return [
      {
        label: '임계점',
        a: pA.finalThreshold, b: pB.finalThreshold,
        fmtA: () => fmtAuto(pA), fmtB: () => fmtAuto(pB),
        higherBetter: true, nullable: true,
      },
      { label: '최대 TPS',  a: pA.maxTps || 0,              b: pB.maxTps || 0,              fmt: v => v > 0 ? `${v.toFixed(1)} req/s` : '-', higherBetter: true },
      { label: '측정 단계', a: pA.stepResults?.length || 0, b: pB.stepResults?.length || 0, fmt: v => `${v}단계`,                            neutral: true      },
    ];
  }

  return null;
}

function isWin(row, a, b, side) {
  if (row.neutral) return false;
  if (a == null || b == null) return false;
  if (a === b) return false;
  const aBetter = row.higherBetter ? a > b : a < b;
  return side === 'a' ? aBetter : !aBetter;
}

function CompareTable({ rows }) {
  let aWins = 0, bWins = 0;
  rows.forEach(row => {
    if (!row.neutral && row.a != null && row.b != null && row.a !== row.b) {
      if (isWin(row, row.a, row.b, 'a')) aWins++;
      else bWins++;
    }
  });

  return (
    <>
      <div className="cmp-table-wrapper">
        <table className="cmp-table">
          <thead>
            <tr>
              <th className="cmp-th-label">항목</th>
              <th className="cmp-th-val">결과 A</th>
              <th className="cmp-th-val">결과 B</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const aVal = row.fmtA ? row.fmtA() : row.fmt(row.a);
              const bVal = row.fmtB ? row.fmtB() : row.fmt(row.b);
              const aWin = isWin(row, row.a, row.b, 'a');
              const bWin = isWin(row, row.a, row.b, 'b');
              return (
                <tr key={i}>
                  <td className="cmp-td-label">{row.label}</td>
                  <td className={`cmp-td-val ${aWin ? 'cmp-val-win' : bWin ? 'cmp-val-lose' : ''}`}>
                    {aVal}{aWin && <span className="cmp-win-mark"> ✓</span>}
                  </td>
                  <td className={`cmp-td-val ${bWin ? 'cmp-val-win' : aWin ? 'cmp-val-lose' : ''}`}>
                    {bVal}{bWin && <span className="cmp-win-mark"> ✓</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="cmp-winner-summary">
        <div className="cmp-winner-box">
          <span className="cmp-winner-label">결과 A 우세</span>
          <span className={`cmp-winner-count ${aWins > bWins ? 'cmp-count-win' : 'cmp-count-normal'}`}>{aWins}개</span>
        </div>
        <div className="cmp-winner-divider">|</div>
        <div className="cmp-winner-box">
          <span className="cmp-winner-label">결과 B 우세</span>
          <span className={`cmp-winner-count ${bWins > aWins ? 'cmp-count-win' : 'cmp-count-normal'}`}>{bWins}개</span>
        </div>
      </div>
    </>
  );
}

function ItemSummary({ item, label }) {
  const p = item.progress;
  const cfg = TYPE_CFG[item.type];

  let metrics = [];
  if (item.type === 'traffic') {
    const rate = p.totalRequests > 0 ? (p.successCount / p.totalRequests * 100).toFixed(1) : '0.0';
    metrics = [
      { label: '성공률',       value: rate + '%' },
      { label: '총 요청',      value: p.totalRequests.toLocaleString() + '개' },
      { label: '성공 / 실패',  value: `${p.successCount} / ${p.failCount}` },
      { label: 'Avg 응답시간', value: Math.round(p.avgResponseTimeMs) + 'ms' },
      { label: 'P95 응답시간', value: Math.round(p.p95ResponseTimeMs) + 'ms' },
      { label: 'P99 응답시간', value: Math.round(p.p99ResponseTimeMs) + 'ms' },
      { label: '최대 TPS',     value: (p.maxTps || p.currentTps || 0).toFixed(1) },
    ];
  } else if (item.type === 'threshold') {
    metrics = [
      { label: '안전 운영 한계', value: p.safeOperatingConcurrency != null ? `동시접속 ${p.safeOperatingConcurrency}명` : '-' },
      { label: '성능 저하 시작', value: p.breakingPointConcurrency != null ? `동시접속 ${p.breakingPointConcurrency}명` : '-' },
      { label: '최대 TPS',       value: p.maxTps > 0 ? `${p.maxTps.toFixed(1)} req/s` : '-' },
      { label: '측정 단계',      value: `${p.stepResults?.length || 0}단계` },
    ];
  } else if (item.type === 'auto') {
    const thLabel = p.finalThreshold === 0 ? '서버 불안정' : p.breakingPointConcurrency == null ? '서버 안정적' : `임계점 ${p.finalThreshold}명`;
    metrics = [
      { label: '임계점',    value: thLabel },
      { label: '최대 TPS',  value: p.maxTps > 0 ? `${p.maxTps.toFixed(1)} req/s` : '-' },
      { label: '측정 단계', value: `${p.stepResults?.length || 0}단계` },
    ];
  }

  return (
    <div className="cmp-item-summary">
      <div className="cmp-item-top-label">{label}</div>
      <div className="cmp-item-header">
        <span className={`hist-badge ${cfg.cls}`}>{cfg.label}</span>
        <span className="cmp-item-url" title={item.url}>{item.url}</span>
      </div>
      <div className="cmp-item-time">{formatDateTime(item.savedAt)}</div>
      <div className="cmp-item-metrics">
        {metrics.map((m, i) => (
          <div key={i} className="cmp-metric-row">
            <span className="cmp-metric-label">{m.label}</span>
            <span className="cmp-metric-value">{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CompareModal({ itemA, itemB, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const rows = getCompareRows(itemA, itemB);
  const sameType = itemA.type === itemB.type;
  const cfgA = TYPE_CFG[itemA.type];
  const cfgB = TYPE_CFG[itemB.type];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box cmp-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <span className="cmp-modal-title">비교 분석</span>
            {sameType && <span className={`hist-badge ${cfgA.cls}`}>{cfgA.label}</span>}
          </div>
          <div className="modal-meta-row">
            <span className="modal-saved-at">
              {sameType ? '동일 유형 비교' : `${cfgA.label} vs ${cfgB.label}`}
            </span>
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body">
          {sameType && rows ? (
            <>
              <div className="cmp-headers">
                <div className="cmp-header-item">
                  <span className="cmp-header-side-label">결과 A</span>
                  <span className={`hist-badge ${cfgA.cls}`}>{cfgA.label}</span>
                  <span className="cmp-header-url" title={itemA.url}>{itemA.url}</span>
                  <span className="cmp-header-time">{formatDateTime(itemA.savedAt)}</span>
                </div>
                <div className="cmp-header-vs">VS</div>
                <div className="cmp-header-item cmp-header-item-b">
                  <span className="cmp-header-side-label">결과 B</span>
                  <span className={`hist-badge ${cfgB.cls}`}>{cfgB.label}</span>
                  <span className="cmp-header-url" title={itemB.url}>{itemB.url}</span>
                  <span className="cmp-header-time">{formatDateTime(itemB.savedAt)}</span>
                </div>
              </div>

              <CompareTable rows={rows} />
            </>
          ) : (
            <div className="cmp-diff-type-grid">
              <ItemSummary item={itemA} label="결과 A" />
              <div className="cmp-vs-divider">VS</div>
              <ItemSummary item={itemB} label="결과 B" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
