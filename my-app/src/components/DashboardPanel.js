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

  const [clusterCardOpen, setClusterCardOpen] = useState(false);
  const prevLocationRef = useRef(null);

  useEffect(() => {
    const loc = selectedEarthquake?.locationId ?? null;
    if (loc !== prevLocationRef.current) {
      prevLocationRef.current = loc;
      setClusterCardOpen(false);
    }
  }, [selectedEarthquake?.locationId]);

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

  const individualEvents = useMemo(() => {
    if (filteredYearEvents.length > 0) {
      return filteredYearEvents;
    }

    return selectedEarthquake ? [selectedEarthquake] : [];
  }, [filteredYearEvents, selectedEarthquake]);

  const formatEventTime = useCallback((timestamp) => {
    if (!timestamp) {
      return 'Unknown';
    }

    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(timestamp));
  }, []);

  const clusterLabel = selectedEarthquake?.place || selectedEarthquake?.originalPlace || 'No selection';

  return (
    <aside className={`dashboard-panel${panelOpen ? ' is-open' : ''}${clusterCardOpen ? ' cluster-open' : ''}`}>
      <button className="panel-close-btn" onClick={onClose} aria-label="Close panel">×</button>

      <div className="panel-card-row">
        <div className={`cluster-card-shell${clusterCardOpen ? ' is-open' : ''}`}>
          <section className="panel-card panel-card-cluster">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Cluster Statistics</span>
                <h3>{clusterLabel}</h3>
              </div>
            </div>

            {selectedEarthquake && yearStats ? (
              <>
                <div className="detail-grid">
                  <div className="detail">
                    <label>Events</label>
                    <strong>{yearStats.count}</strong>
                    <span>Earthquakes in this cluster</span>
                  </div>
                  <div className="detail">
                    <label>Average</label>
                    <strong>{yearStats.mean}</strong>
                    <span>Mean magnitude</span>
                  </div>
                  <div className="detail">
                    <label>Strongest</label>
                    <strong data-accent="true">{yearStats.strongest.toFixed(2)}</strong>
                    <span>Highest event</span>
                  </div>
                  <div className="detail">
                    <label>Weakest</label>
                    <strong>{yearStats.weakest.toFixed(2)}</strong>
                    <span>Lowest event</span>
                  </div>
                  <div className="detail detail-span-2">
                    <label>Cluster Location</label>
                    <strong>{selectedEarthquake.place}</strong>
                    <span>Shared locality for this event stack</span>
                  </div>
                </div>

                {filteredHistory.length > 0 ? (
                  <Histogram history={filteredHistory} selectedYear={selectedYear} />
                ) : null}
              </>
            ) : (
              <div className="empty-state">
                Cluster-level statistics appear here once a map point is selected.
              </div>
            )}
          </section>
        </div>

        <section className="panel-card panel-card-primary">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Individual Event</span>
              <h2>{selectedEarthquake ? selectedEarthquake.place : 'No selection'}</h2>
            </div>
            {individualEvents.length > 1 ? (
              <span className="event-nav-badge">{individualEvents.length} events</span>
            ) : null}
          </div>

          {individualEvents.length > 0 ? (
            <>
              <div className="panel-action-strip">
                <button
                  className={`cluster-toggle-btn${clusterCardOpen ? ' is-open' : ''}`}
                  onClick={() => setClusterCardOpen((open) => !open)}
                  type="button"
                >
                  <span>{clusterCardOpen ? 'Hide Cluster Stats' : 'Show Cluster Stats'}</span>
                  <span className="cluster-toggle-arrow" aria-hidden="true">‹</span>
                </button>
              </div>

              <div className="individual-events-scroll">
                {individualEvents.map((quake, index) => {
                  const displayDepth = quake.depth != null ? `${quake.depth.toFixed(2)} km` : 'Unknown';
                  const displayLocation = `${quake.lat.toFixed(4)}°, ${quake.lng.toFixed(4)}°`;

                  return (
                    <article
                      className={`individual-event-card${
                        quake.id === selectedEarthquake?.id ? ' is-highlighted' : ''
                      }`}
                      key={quake.id}
                    >
                      <div className="individual-event-head">
                        <div>
                          <span className="individual-event-index">Event {index + 1}</span>
                          <h3>{quake.originalPlace}</h3>
                        </div>
                      </div>

                      <div className="detail-grid individual-detail-grid">
                        <div className="detail">
                          <label>Magnitude</label>
                          <strong data-accent="true">{quake.mag.toFixed(2)}</strong>
                          <span>Selected event intensity</span>
                        </div>
                        <div className="detail">
                          <label>Location</label>
                          <strong>{displayLocation}</strong>
                          <span>{quake.place}</span>
                        </div>
                        <div className="detail">
                          <label>Time</label>
                          <strong>{formatEventTime(quake.timestamp)}</strong>
                          <span>Event occurrence</span>
                        </div>
                        <div className="detail">
                          <label>Depth</label>
                          <strong>{displayDepth}</strong>
                          <span>Below the surface</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="empty-state">
              Click a location on the map to inspect an individual event and reveal its cluster context.
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}

export default memo(DashboardPanel);
