import React, { useEffect } from 'react';
import ResultPanel from './ResultPanel';
import ThresholdResultPanel from './ThresholdResultPanel';
import AutoThresholdResultPanel from './AutoThresholdResultPanel';

const TYPE_CFG = {
  traffic:   { label: '트래픽 테스트',      cls: 'hist-badge-traffic' },
  threshold: { label: '임계점 측정',        cls: 'hist-badge-threshold' },
  auto:      { label: '자동 임계점 측정',   cls: 'hist-badge-auto' },
};

function formatDateTime(date) {
  return date.toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function HistoryDetailModal({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const cfg = TYPE_CFG[item.type];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <span className={`hist-badge ${cfg.cls}`}>{cfg.label}</span>
            <span className="modal-url" title={item.url}>{item.url}</span>
          </div>
          <div className="modal-meta-row">
            <span className="modal-saved-at">저장 시각: {formatDateTime(item.savedAt)}</span>
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body">
          {item.type === 'traffic' && (
            <ResultPanel progress={item.progress} isRunning={false} />
          )}
          {item.type === 'threshold' && (
            <ThresholdResultPanel progress={item.progress} isRunning={false} />
          )}
          {item.type === 'auto' && (
            <AutoThresholdResultPanel progress={item.progress} isRunning={false} />
          )}
        </div>
      </div>
    </div>
  );
}
