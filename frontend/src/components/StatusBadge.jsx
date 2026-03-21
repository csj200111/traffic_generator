import React from 'react';

const STATUS_STYLES = {
  IDLE: { label: 'IDLE', className: 'status-idle' },
  RUNNING: { label: 'RUNNING', className: 'status-running' },
  COMPLETED: { label: 'COMPLETED', className: 'status-completed' },
  STOPPED: { label: 'STOPPED', className: 'status-stopped' },
  FAILED: { label: 'FAILED', className: 'status-failed' },
};

export default function StatusBadge({ status = 'IDLE' }) {
  const config = STATUS_STYLES[status] || STATUS_STYLES.IDLE;

  return (
    <span className={`status-badge ${config.className}`}>
      {config.label}
    </span>
  );
}
