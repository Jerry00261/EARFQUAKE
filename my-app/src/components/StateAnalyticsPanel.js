import { memo, useMemo } from 'react';

const MAG_BINS = [
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

function StateAnalyticsPanel({ earthquakes, loading, onClose }) {
  const stats = useMemo(() => {
    if (!earthquakes || earthquakes.length === 0) return null;

    const withMag = earthquakes.filter((q) => q.mag != null);
    if (withMag.length === 0) return null;

    const totalEvents = withMag.length;
    const avgMag = withMag.reduce((sum, q) => sum + q.mag, 0) / totalEvents;

    let strongest = withMag[0];
    let weakest = withMag[0];
    for (const q of withMag) {
      if (q.mag > strongest.mag) strongest = q;
      if (q.mag < weakest.mag) weakest = q;
    }

    // Magnitude distribution
    const magCounts = MAG_BINS.map(() => 0);
    for (const q of withMag) {
      for (let i = 0; i < MAG_BINS.length; i++) {
        if (q.mag >= MAG_BINS[i].min && q.mag < MAG_BINS[i].max) {
          magCounts[i]++;
          break;
        }
      }
    }
    const maxMagCount = Math.max(...magCounts, 1);

    // Time series: count per year
    const yearMap = {};
    for (const q of withMag) {
      if (q.year != null) {
        yearMap[q.year] = (yearMap[q.year] || 0) + 1;
      }
    }
    const years = Object.keys(yearMap).map(Number).sort((a, b) => a - b);
    const minYear = years[0] || 1932;
    const maxYear = years[years.length - 1] || 2026;
    const timeSeries = [];
    for (let y = minYear; y <= maxYear; y++) {
      timeSeries.push({ year: y, count: yearMap[y] || 0 });
    }
    const maxFreq = Math.max(...timeSeries.map((t) => t.count), 1);

    return {
      totalEvents,
      avgMag: avgMag.toFixed(2),
      strongest,
      weakest,
      magCounts,
      maxMagCount,
      timeSeries,
      maxFreq,
      minYear,
      maxYear,
    };
  }, [earthquakes]);

  return (
    <div className="state-analytics-overlay">
      <div className="state-analytics-panel">
        <div className="state-analytics-header">
          <h2>California — Aggregate Analysis</h2>
          <button className="state-analytics-close" onClick={onClose}>✕</button>
        </div>

        {loading && (
          <div className="state-analytics-loading">Loading data…</div>
        )}

        {!loading && !stats && (
          <div className="state-analytics-loading">No earthquake data available.</div>
        )}

        {!loading && stats && (
          <div className="state-analytics-body">
            {/* Key stats */}
            <div className="sa-stats-grid">
              <div className="sa-stat-card">
                <span className="sa-stat-value">{stats.totalEvents.toLocaleString()}</span>
                <span className="sa-stat-label">Total Events</span>
              </div>
              <div className="sa-stat-card">
                <span className="sa-stat-value">{stats.avgMag}</span>
                <span className="sa-stat-label">Avg Magnitude</span>
              </div>
              <div className="sa-stat-card sa-stat-strong">
                <span className="sa-stat-value">{stats.strongest.mag.toFixed(2)}</span>
                <span className="sa-stat-label">Strongest</span>
                <span className="sa-stat-detail">{stats.strongest.place}</span>
                {stats.strongest.year && (
                  <span className="sa-stat-detail">{stats.strongest.year}</span>
                )}
              </div>
              <div className="sa-stat-card">
                <span className="sa-stat-value">{stats.weakest.mag.toFixed(2)}</span>
                <span className="sa-stat-label">Weakest</span>
              </div>
            </div>

            {/* Magnitude distribution */}
            <div className="sa-section">
              <h3>Magnitude Distribution</h3>
              <div className="sa-histogram">
                {MAG_BINS.map((bin, i) => (
                  <div className="sa-hist-col" key={bin.label}>
                    <span className="sa-hist-count">{stats.magCounts[i] || ''}</span>
                    <div
                      className="sa-hist-bar"
                      style={{
                        height: `${(stats.magCounts[i] / stats.maxMagCount) * 100}%`,
                        backgroundColor: binColor(i),
                      }}
                    />
                    <span className="sa-hist-label">{bin.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Time series */}
            <div className="sa-section">
              <h3>Earthquake Frequency Over Time</h3>
              <div className="sa-timeseries">
                <div className="sa-ts-chart">
                  {stats.timeSeries.map((pt) => (
                    <div
                      className="sa-ts-bar"
                      key={pt.year}
                      style={{ height: `${(pt.count / stats.maxFreq) * 100}%` }}
                      title={`${pt.year}: ${pt.count} events`}
                    />
                  ))}
                </div>
                <div className="sa-ts-labels">
                  <span>{stats.minYear}</span>
                  <span>{stats.maxYear}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(StateAnalyticsPanel);
