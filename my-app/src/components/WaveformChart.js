import { memo, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

function WaveformChart({ waveformMs, sampleRateHz = 10, playheadFrame = null }) {
  const data = useMemo(() => {
    if (!waveformMs || waveformMs.length === 0) return [];
    return waveformMs.map((value, i) => ({
      time: +(i / sampleRateHz).toFixed(2),
      velocity: +value.toFixed(6),
    }));
  }, [waveformMs, sampleRateHz]);

  const playheadTime = useMemo(() => {
    if (playheadFrame == null) return null;
    const time = playheadFrame / sampleRateHz;
    return Math.max(0, Math.min(60, +time.toFixed(2)));
  }, [playheadFrame, sampleRateHz]);

  if (data.length === 0) return null;

  return (
    <div className="waveform-chart-container">
      <div className="waveform-header">
        <span className="eyebrow">Seismogram Waveform</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(140,170,220,0.1)" />
          <XAxis
            dataKey="time"
            type="number"
            domain={[0, 60]}
            tick={{ fill: '#6a7d98', fontSize: 10 }}
            tickCount={7}
            label={{ value: 'Time (s)', position: 'insideBottom', offset: -2, fill: '#6a7d98', fontSize: 10 }}
          />
          <YAxis
            tick={{ fill: '#6a7d98', fontSize: 10 }}
            tickFormatter={(v) => v.toFixed(3)}
            label={{ value: 'm/s', angle: -90, position: 'insideLeft', offset: 16, fill: '#6a7d98', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(12,18,32,0.95)',
              border: '1px solid rgba(140,170,220,0.2)',
              borderRadius: 10,
              fontSize: 11,
              color: '#e8edf5',
            }}
            formatter={(value) => [`${value.toFixed(5)} m/s`, 'Velocity']}
            labelFormatter={(label) => `${label} s`}
          />
          <Line
            type="monotone"
            dataKey="velocity"
            stroke="#ef4444"
            strokeWidth={1.2}
            dot={false}
            isAnimationActive={false}
          />
          {playheadTime != null && (
            <ReferenceLine
              x={playheadTime}
              stroke="#f59e0b"
              strokeWidth={2}
              strokeOpacity={0.95}
              ifOverflow="visible"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(WaveformChart);
