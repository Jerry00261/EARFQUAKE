import { memo, useMemo } from 'react';

const BINS = [
  { label: '0–1', min: 0, max: 1 },
  { label: '1–2', min: 1, max: 2 },
  { label: '2–3', min: 2, max: 3 },
  { label: '3–4', min: 3, max: 4 },
  { label: '4–5', min: 4, max: 5 },
  { label: '5–6', min: 5, max: 6 },
  { label: '6–7', min: 6, max: 7 },
  { label: '7+', min: 7, max: Infinity },
];

function binColor(index) {
  const colors = [
    '#4ade80', '#a0dc50', '#facc15', '#f58220',
    '#ef4444', '#dc2626', '#b91c1c', '#a01414',
  ];
  return colors[index] || colors[colors.length - 1];
}

function Histogram({ history, selectedYear }) {
  const filtered = useMemo(
    () => (selectedYear != null ? history.filter((q) => q.year === selectedYear) : history),
    [history, selectedYear]
  );

  const { counts, maxCount, mean } = useMemo(() => {
    const c = BINS.map(() => 0);
    let sum = 0;

    for (const quake of filtered) {
      sum += quake.mag;
      for (let i = 0; i < BINS.length; i++) {
        if (quake.mag >= BINS[i].min && quake.mag < BINS[i].max) {
          c[i]++;
          break;
        }
      }
    }

    return {
      counts: c,
      maxCount: Math.max(...c, 1),
      mean: filtered.length ? (sum / filtered.length).toFixed(2) : '—',
    };
  }, [filtered]);

  return (
    <div className="histogram-container">
      <div className="histogram-header">
        <span className="eyebrow">Magnitude Distribution</span>
        <span className="histogram-mean">
          Mean Magnitude: <strong>{mean}</strong>
        </span>
      </div>
      <div className="histogram-subtitle">
        {filtered.length} events in {selectedYear || 'all years'}
      </div>
      <div className="histogram-chart">
        {BINS.map((bin, i) => (
          <div className="histogram-col" key={bin.label}>
            <span className="histogram-count">{counts[i] || ''}</span>
            <div
              className="histogram-bar"
              style={{
                height: `${(counts[i] / maxCount) * 100}%`,
                backgroundColor: binColor(i),
              }}
            />
            <span className="histogram-label">{bin.label}</span>
          </div>
        ))}
      </div>
      <div className="histogram-axis-label">Magnitude (Richter)</div>
    </div>
  );
}

export default memo(Histogram);
