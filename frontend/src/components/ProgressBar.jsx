import React from 'react';

export default function ProgressBar({ value = 0 }) {
  const percent = Math.round(value * 100);

  return (
    <div className="progress-bar-container">
      <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
      <span className="progress-bar-text">{percent}%</span>
    </div>
  );
}
