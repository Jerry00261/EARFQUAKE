import { memo, useMemo } from 'react';
import Histogram from './Histogram';

function DashboardPanel({ locationHistory, onClose, panelOpen, selectedEarthquake, selectedYear, yearEvents }) {
  const yearStats = useMemo(() => {
    if (!yearEvents || yearEvents.length === 0) return null;
    const mags = yearEvents.map((q) => q.mag);
    const sum = mags.reduce((a, b) => a + b, 0);
    return {
      count: yearEvents.length,
      strongest: Math.max(...mags),
      weakest: Math.min(...mags),
      mean: (sum / mags.length).toFixed(2),
    };
  }, [yearEvents]);

  return (
    <aside className={`dashboard-panel${panelOpen ? ' is-open' : ''}`}>
      <button className="panel-close-btn" onClick={onClose} aria-label="Close panel">×</button>

      <section className="panel-card">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Seismic Zone</span>
            <h2>{selectedEarthquake ? selectedEarthquake.place : 'No selection'}</h2>
          </div>
          {selectedEarthquake ? (
            <strong style={{ fontSize: '1.5rem', color: '#ef6c00' }}>
              M {selectedEarthquake.mag.toFixed(1)}
            </strong>
          ) : null}
        </div>

        {selectedEarthquake && yearStats ? (
          <div className="detail-grid">
            <div className="detail">
              <label>Year</label>
              <strong data-accent="true">{selectedYear}</strong>
              <span>Selected period</span>
            </div>
            <div className="detail">
              <label>Events</label>
              <strong>{yearStats.count}</strong>
              <span>Earthquakes recorded</span>
            </div>
            <div className="detail">
              <label>Strongest</label>
              <strong data-accent="true">{yearStats.strongest.toFixed(1)}</strong>
              <span>Max magnitude</span>
            </div>
            <div className="detail">
              <label>Weakest</label>
              <strong>{yearStats.weakest.toFixed(1)}</strong>
              <span>Min magnitude</span>
            </div>
            <div className="detail">
              <label>Mean</label>
              <strong>{yearStats.mean}</strong>
              <span>Avg magnitude</span>
            </div>
            <div className="detail">
              <label>Location</label>
              <strong>{selectedEarthquake.lat.toFixed(4)}°, {selectedEarthquake.lng.toFixed(4)}°</strong>
              <span>Epicenter zone</span>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            Click a location on the map to view its seismic history.
          </div>
        )}
      </section>

      {selectedEarthquake && locationHistory.length > 0 ? (
        <Histogram history={locationHistory} selectedYear={selectedYear} />
      ) : null}
    </aside>
  );
}

export default memo(DashboardPanel);
