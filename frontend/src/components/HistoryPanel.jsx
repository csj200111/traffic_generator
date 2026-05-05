import React, { useState } from 'react';
import HistoryDetailModal from './HistoryDetailModal';

const TYPE_CFG = {
  traffic:   { label: '트래픽',      cls: 'hist-badge-traffic' },
  threshold: { label: '임계점',      cls: 'hist-badge-threshold' },
  auto:      { label: '자동 임계점', cls: 'hist-badge-auto' },
};

function formatTime(date) {
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function MetricRow({ items }) {
  return (
    <div className="hist-metrics">
      {items.filter(Boolean).map((item, i) => (
        <span key={i} className="hist-metric">{item}</span>
      ))}
    </div>
  );
}

function TrafficMetrics({ progress }) {
  const rate = progress.totalRequests > 0
    ? (progress.successCount / progress.totalRequests * 100).toFixed(1)
    : '0.0';
  return (
    <MetricRow items={[
      `성공률 ${rate}%`,
      progress.avgResponseTimeMs > 0 && `Avg ${Math.round(progress.avgResponseTimeMs)}ms`,
      `요청 ${progress.totalRequests}개`,
      progress.currentTps > 0 && `TPS ${progress.currentTps.toFixed(1)}`,
    ]} />
  );
}

function ThresholdMetrics({ progress }) {
  return (
    <MetricRow items={[
      `안전 한계 ${progress.safeOperatingConcurrency != null ? progress.safeOperatingConcurrency + '명' : '-'}`,
      `저하 시작 ${progress.breakingPointConcurrency != null ? progress.breakingPointConcurrency + '명' : '-'}`,
      progress.maxTps > 0 && `최대 TPS ${progress.maxTps.toFixed(1)}`,
    ]} />
  );
}

function AutoMetrics({ progress }) {
  const t = progress.finalThreshold;
  const label = t === 0
    ? '서버 불안정'
    : progress.breakingPointConcurrency == null
      ? '서버 안정적'
      : `임계점 ${t}명`;
  return (
    <MetricRow items={[
      label,
      progress.maxTps > 0 && `최대 TPS ${progress.maxTps.toFixed(1)}`,
      progress.stepResults?.length && `${progress.stepResults.length}단계 측정`,
    ]} />
  );
}

function HistoryItem({ item, onOpen, onDelete }) {
  const cfg = TYPE_CFG[item.type];

  return (
    <div className="hist-item" onClick={() => onOpen(item)}>
      <div className="hist-item-header">
        <div className="hist-item-left">
          <span className={`hist-badge ${cfg.cls}`}>{cfg.label}</span>
          <span className="hist-url" title={item.url}>{item.url}</span>
        </div>
        <div className="hist-item-right">
          <span className="hist-time">{formatTime(item.savedAt)}</span>
          <button
            className="hist-del-btn"
            title="삭제"
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
          >✕</button>
          <span className="hist-chevron">›</span>
        </div>
      </div>

      {item.type === 'traffic'   && <TrafficMetrics   progress={item.progress} />}
      {item.type === 'threshold' && <ThresholdMetrics progress={item.progress} />}
      {item.type === 'auto'      && <AutoMetrics      progress={item.progress} />}
    </div>
  );
}

export default function HistoryPanel({ results, onDelete, onClear }) {
  const [selectedItem, setSelectedItem] = useState(null);

  if (results.length === 0) {
    return (
      <div className="hist-empty">
        <p>저장된 기록이 없습니다.</p>
        <p className="hist-empty-sub">테스트가 완료되면 자동으로 기록이 저장됩니다.</p>
      </div>
    );
  }

  return (
    <>
      <div className="hist-panel">
        <div className="hist-header">
          <span className="hist-count">{results.length}개의 기록</span>
          <button className="hist-clear-btn" onClick={onClear}>전체 삭제</button>
        </div>
        <div className="hist-list">
          {[...results].reverse().map(item => (
            <HistoryItem
              key={item.id}
              item={item}
              onOpen={setSelectedItem}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>

      {selectedItem && (
        <HistoryDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
}
