import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function TpsChart({ tpsHistory = [], currentConcurrency }) {
  if (!tpsHistory || tpsHistory.length === 0) return null;

  const data = tpsHistory.map(([time, tps]) => ({
    time: Math.round(time * 10) / 10,
    tps: Math.round(tps * 10) / 10,
  }));

  return (
    <div className="chart-container">
      <h3 className="chart-title">TPS (Throughput)</h3>
      {currentConcurrency > 0 && (
        <span className="chart-subtitle">Concurrency: {currentConcurrency}</span>
      )}
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4e" />
          <XAxis
            dataKey="time"
            stroke="#6b8aab"
            fontSize={11}
            tickFormatter={(v) => `${v}s`}
          />
          <YAxis stroke="#6b8aab" fontSize={11} />
          <Tooltip
            contentStyle={{ background: '#1e2b3a', border: '1px solid #3a4a5e', borderRadius: 8 }}
            labelStyle={{ color: '#94a3b8' }}
            itemStyle={{ color: '#60a5fa' }}
            formatter={(value) => [`${value} req/s`, 'TPS']}
            labelFormatter={(label) => `${label}s`}
          />
          <Line type="monotone" dataKey="tps" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
