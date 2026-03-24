import React from 'react';

export default function ProgressBar({ value = 0, status = 'RUNNING' }) {
  const percent = Math.round(value * 100);
  const barClass = `bar-${status.toLowerCase()}`;

  return (
    <div className="progress-bar-container">
      <div
        className={`progress-bar-fill ${barClass}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
