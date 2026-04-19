import { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import Histogram from './Histogram';

function DashboardPanel({ locationHistory, minMag, onClose, panelOpen, selectedEarthquake, selectedYear, yearEvents }) {
  const filteredHistory = useMemo(
    () => locationHistory.filter((q) => q.mag != null && q.mag >= minMag),
    [locationHistory, minMag]
  );

  const filteredYearEvents = useMemo(
    () => (yearEvents || []).filter((q) => q.mag != null && q.mag >= minMag),
    [yearEvents, minMag]
  );

  const [eventIndex, setEventIndex] = useState(0);
  const prevLocationRef = useRef(null);

  // Reset index only when the selected location changes (not when cycling)
  useEffect(() => {
    const loc = selectedEarthquake?.locationId ?? null;
    if (loc !== prevLocationRef.current) {
      prevLocationRef.current = loc;
      setEventIndex(0);
    }
  }, [selectedEarthquake?.locationId]);

  // Clamp index if filteredYearEvents shrinks (e.g. minMag changes)
  useEffect(() => {
    if (filteredYearEvents.length > 0 && eventIndex >= filteredYearEvents.length) {
      setEventIndex(0);
    }
  }, [filteredYearEvents.length, eventIndex]);

  const hasMultiple = filteredYearEvents.length > 1;

  const handleNext = useCallback(() => {
    setEventIndex((i) => (i + 1) % filteredYearEvents.length);
  }, [filteredYearEvents.length]);

  const handlePrev = useCallback(() => {
    setEventIndex((i) => (i - 1 + filteredYearEvents.length) % filteredYearEvents.length);
  }, [filteredYearEvents.length]);

  const displayQuake = hasMultiple && filteredYearEvents[eventIndex]
    ? filteredYearEvents[eventIndex]
    : selectedEarthquake;

  const yearStats = useMemo(() => {
    if (!filteredYearEvents || filteredYearEvents.length === 0) return null;
    const mags = filteredYearEvents.map((q) => q.mag);
    const sum = mags.reduce((a, b) => a + b, 0);
    return {
      count: filteredYearEvents.length,
      strongest: Math.max(...mags),
      weakest: Math.min(...mags),
      mean: (sum / mags.length).toFixed(2),
    };
  }, [filteredYearEvents]);

  return (
    <aside className={`dashboard-panel${panelOpen ? ' is-open' : ''}`}>
      <button className="panel-close-btn" onClick={onClose} aria-label="Close panel">×</button>

      {hasMultiple ? (
        <button className="event-nav-circle event-nav-left" onClick={handlePrev} aria-label="Previous event">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2.5L4.5 7L9 11.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      ) : null}

      {hasMultiple ? (
        <button className="event-nav-circle event-nav-right" onClick={handleNext} aria-label="Next event">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 2.5L9.5 7L5 11.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      ) : null}

      <section className="panel-card">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Seismic Zone</span>
            <h2>{displayQuake ? displayQuake.place : 'No selection'}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {displayQuake ? (
              <strong style={{ fontSize: '1.5rem', color: '#ef6c00' }}>
                M {displayQuake.mag.toFixed(2)}
              </strong>
            ) : null}
            {hasMultiple ? (
              <span className="event-nav-badge">{eventIndex + 1}/{filteredYearEvents.length}</span>
            ) : null}
          </div>
        </div>

        {displayQuake && yearStats ? (
          <div className="detail-grid">
            <div className="detail">
              <label>Events</label>
              <strong>{yearStats.count}</strong>
              <span>Earthquakes recorded</span>
            </div>
            <div className="detail">
              <label>Strongest</label>
              <strong data-accent="true">{yearStats.strongest.toFixed(2)}</strong>
              <span>Max magnitude</span>
            </div>
            <div className="detail">
              <label>Weakest</label>
              <strong>{yearStats.weakest.toFixed(2)}</strong>
              <span>Min magnitude</span>
            </div>
            <div className="detail">
              <label>Location</label>
              <strong>{displayQuake.lat.toFixed(4)}°, {displayQuake.lng.toFixed(4)}°</strong>
              <span>Epicenter zone</span>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            Click a location on the map to view its seismic history.
          </div>
        )}
      </section>

      {selectedEarthquake && filteredHistory.length > 0 ? (
        <Histogram history={filteredHistory} selectedYear={selectedYear} />
      ) : null}
    </aside>
  );
}

export default memo(DashboardPanel);
