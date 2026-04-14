import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function LatencyChart({ avgResponseTimeMs, minResponseTimeMs, maxResponseTimeMs, p95ResponseTimeMs, p99ResponseTimeMs }) {
  if (!avgResponseTimeMs && !p95ResponseTimeMs) return null;

  const data = [
    { name: 'Min', value: Math.round(minResponseTimeMs), color: '#22c55e' },
    { name: 'Avg', value: Math.round(avgResponseTimeMs), color: '#3b82f6' },
    { name: 'P95', value: Math.round(p95ResponseTimeMs), color: '#f59e0b' },
    { name: 'P99', value: Math.round(p99ResponseTimeMs), color: '#ef4444' },
    { name: 'Max', value: Math.round(maxResponseTimeMs), color: '#dc2626' },
  ];

  return (
    <div className="chart-container">
      <h3 className="chart-title">Response Time (ms)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4e" />
          <XAxis dataKey="name" stroke="#6b8aab" fontSize={11} />
          <YAxis stroke="#6b8aab" fontSize={11} tickFormatter={(v) => `${v}ms`} />
          <Tooltip
            contentStyle={{ background: '#1e2b3a', border: '1px solid #3a4a5e', borderRadius: 8 }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value) => [`${value}ms`]}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
