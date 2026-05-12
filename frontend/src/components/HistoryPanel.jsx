import React, { useState } from 'react';
import HistoryDetailModal from './HistoryDetailModal';
import CompareModal from './CompareModal';

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

function HistoryItem({ item, onOpen, onDelete, compareMode, isSelected, onToggleSelect }) {
  const cfg = TYPE_CFG[item.type];

  const handleClick = () => {
    if (compareMode) {
      onToggleSelect(item);
    } else {
      onOpen(item);
    }
  };

  return (
    <div
      className={`hist-item ${compareMode ? 'hist-item-selectable' : ''} ${isSelected ? 'hist-item-selected' : ''}`}
      onClick={handleClick}
    >
      <div className="hist-item-header">
        <div className="hist-item-left">
          {compareMode && (
            <div className={`hist-item-check ${isSelected ? 'hist-item-check-on' : ''}`}>
              {isSelected && <span className="hist-check-mark">✓</span>}
            </div>
          )}
          <span className={`hist-badge ${cfg.cls}`}>{cfg.label}</span>
          <span className="hist-url" title={item.url}>{item.url}</span>
        </div>
        <div className="hist-item-right">
          <span className="hist-time">{formatTime(item.savedAt)}</span>
          {!compareMode && (
            <button
              className="hist-del-btn"
              title="삭제"
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            >✕</button>
          )}
          {!compareMode && <span className="hist-chevron">›</span>}
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
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [compareItems, setCompareItems] = useState(null);

  const enterCompareMode = () => {
    setCompareMode(true);
    setSelectedIds(new Set());
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedIds(new Set());
  };

  const handleToggleSelect = (item) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else if (next.size < 2) {
        next.add(item.id);
      }
      return next;
    });
  };

  const handleCompare = () => {
    const reversed = [...results].reverse();
    const selected = reversed.filter(r => selectedIds.has(r.id));
    if (selected.length === 2) {
      setCompareItems([selected[0], selected[1]]);
    }
  };

  if (results.length === 0) {
    return (
      <div className="hist-empty">
        <p>저장된 기록이 없습니다.</p>
        <p className="hist-empty-sub">테스트가 완료되면 자동으로 기록이 저장됩니다.</p>
      </div>
    );
  }

  const canCompare = results.length >= 2;
  const selCount = selectedIds.size;

  return (
    <>
      <div className="hist-panel">
        <div className="hist-header">
          <span className="hist-count">{results.length}개의 기록</span>
          <div className="hist-header-actions">
            {!compareMode && canCompare && (
              <button className="hist-compare-btn" onClick={enterCompareMode}>
                비교 분석하기
              </button>
            )}
            {!compareMode && (
              <button className="hist-clear-btn" onClick={onClear}>전체 삭제</button>
            )}
          </div>
        </div>

        {compareMode && (
          <div className="hist-compare-bar">
            <span className="hist-compare-hint">
              {selCount === 0 && '비교할 결과 2개를 선택하세요'}
              {selCount === 1 && '1개 선택됨 · 하나 더 선택하세요'}
              {selCount === 2 && '2개 선택 완료'}
            </span>
            <button
              className="hist-do-compare-btn"
              onClick={handleCompare}
              disabled={selCount !== 2}
            >
              비교하기
            </button>
            <button className="hist-cancel-compare-btn" onClick={exitCompareMode}>
              취소
            </button>
          </div>
        )}

        <div className="hist-list">
          {[...results].reverse().map(item => (
            <HistoryItem
              key={item.id}
              item={item}
              onOpen={setSelectedItem}
              onDelete={onDelete}
              compareMode={compareMode}
              isSelected={selectedIds.has(item.id)}
              onToggleSelect={handleToggleSelect}
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

      {compareItems && (
        <CompareModal
          itemA={compareItems[0]}
          itemB={compareItems[1]}
          onClose={() => setCompareItems(null)}
        />
      )}
    </>
  );
}
