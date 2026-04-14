import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const STATUS_COLORS = {
  '2xx': '#22c55e',
  '3xx': '#3b82f6',
  '4xx': '#f59e0b',
  '5xx': '#ef4444',
};

function groupStatusCodes(statusCodeCounts) {
  const groups = {};
  for (const [code, count] of Object.entries(statusCodeCounts)) {
    const codeNum = parseInt(code);
    let group;
    if (codeNum >= 200 && codeNum < 300) group = '2xx';
    else if (codeNum >= 300 && codeNum < 400) group = '3xx';
    else if (codeNum >= 400 && codeNum < 500) group = '4xx';
    else group = '5xx';
    groups[group] = (groups[group] || 0) + count;
  }
  return Object.entries(groups).map(([name, value]) => ({ name, value }));
}

export default function StatusCodeChart({ statusCodeCounts = {} }) {
  if (!statusCodeCounts || Object.keys(statusCodeCounts).length === 0) return null;

  const data = groupStatusCodes(statusCodeCounts);

  return (
    <div className="chart-container">
      <h3 className="chart-title">Status Codes</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={STATUS_COLORS[entry.name] || '#64748b'} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#1e2b3a', border: '1px solid #3a4a5e', borderRadius: 8 }}
            formatter={(value, name) => [`${value} requests`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
