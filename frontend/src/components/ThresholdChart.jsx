import React from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';

const VERDICT_COLORS = {
  GOOD:     '#22c55e',
  WARNING:  '#f59e0b',
  BREAKING: '#f97316',
  BROKEN:   '#ef4444',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const latency = payload.find((p) => p.dataKey === 'avgResponseTimeMs');
  const errRate = payload.find((p) => p.dataKey === 'errorRate');
  const verdict = payload[0]?.payload?.verdict;

  return (
    <div className="threshold-tooltip">
      <div className="tt-title">동시접속 {label}</div>
      {latency && (
        <div className="tt-row">
          <span>평균 응답시간</span>
          <span>{Math.round(latency.value)} ms</span>
        </div>
      )}
      {errRate && (
        <div className="tt-row">
          <span>에러율</span>
          <span>{errRate.value.toFixed(1)} %</span>
        </div>
      )}
      {verdict && (
        <div className="tt-row">
          <span>판정</span>
          <span style={{ color: VERDICT_COLORS[verdict] }}>{verdict}</span>
        </div>
      )}
    </div>
  );
}

export default function ThresholdChart({ stepResults = [], breakingPoint }) {
  if (!stepResults || stepResults.length === 0) return null;

  const data = stepResults.map((s) => ({
    concurrency: s.concurrency,
    avgResponseTimeMs: Math.round(s.avgResponseTimeMs),
    errorRate: parseFloat(s.errorRate.toFixed(2)),
    tps: parseFloat(s.tps.toFixed(1)),
    verdict: s.verdict,
  }));

  return (
    <div className="chart-container">
      <h3 className="chart-title">동시접속별 성능 지표</h3>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3a4e" />
          <XAxis
            dataKey="concurrency"
            stroke="#6b8aab"
            fontSize={11}
            tickFormatter={(v) => `C${v}`}
          />
          <YAxis
            yAxisId="left"
            stroke="#6b8aab"
            fontSize={11}
            tickFormatter={(v) => `${v}ms`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#6b8aab"
            fontSize={11}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
            formatter={(value) => value === 'avgResponseTimeMs' ? '평균 응답시간(ms)' : '에러율(%)'}
          />
          {breakingPoint && (
            <ReferenceLine
              x={breakingPoint}
              yAxisId="left"
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{ value: '임계점', position: 'top', fontSize: 10, fill: '#ef4444' }}
            />
          )}
          <Bar yAxisId="left" dataKey="avgResponseTimeMs" name="avgResponseTimeMs" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={VERDICT_COLORS[entry.verdict] || '#3b82f6'} fillOpacity={0.85} />
            ))}
          </Bar>
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="errorRate"
            name="errorRate"
            stroke="#f87171"
            strokeWidth={2}
            dot={{ r: 3, fill: '#f87171' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
