import { memo } from 'react';
import { formatDistanceKm, formatLatLng, formatTimestamp } from '../utils/geo';

function DashboardPanel({
  deferredNearbyEarthquakes,
  distanceThresholdKm,
  error,
  focusNearby,
  hoveredEarthquake,
  liveFeedEnabled,
  loading,
  onClearUserPoint,
  onSelectEarthquake,
  onSetDistanceThresholdKm,
  onSetFocusNearby,
  onSetLiveFeedEnabled,
  onSetSortMode,
  referencePoint,
  selectedDistanceKm,
  selectedEarthquake,
  sortMode,
  strongestNearby,
  summary,
  userPoint,
}) {
  const activeEarthquake = hoveredEarthquake || selectedEarthquake;

  return (
    <aside className="dashboard-panel">
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Southern California Seismic Field</span>
            <h2>Epicenter dashboard</h2>
            <p className="panel-copy">
              GPU-driven aura pulses, low-latency selection, and a mock feed
              pipeline ready to swap to USGS-style data.
            </p>
          </div>
          <span
            className="signal-chip"
            data-state={summary.highMagnitudeCount > 0 ? 'alert' : 'stable'}
          >
            {liveFeedEnabled ? 'Live simulation on' : 'Live simulation off'}
          </span>
        </div>

        <div className="stat-grid">
          <div className="stat">
            <label>Tracked quakes</label>
            <strong>{summary.count}</strong>
            <span>Canvas renderer prepared for dense point clouds</span>
          </div>
          <div className="stat">
            <label>Average magnitude</label>
            <strong>{summary.averageMagnitude.toFixed(1)}</strong>
            <span>{summary.highMagnitudeCount} events at magnitude 5+</span>
          </div>
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Selected Event</span>
            <h3>{activeEarthquake ? activeEarthquake.place : 'Awaiting selection'}</h3>
          </div>
          {activeEarthquake ? (
            <strong style={{ fontSize: '1.5rem', color: '#ff9658' }}>
              M {activeEarthquake.mag.toFixed(1)}
            </strong>
          ) : null}
        </div>

        {activeEarthquake ? (
          <div className="detail-grid">
            <div className="detail">
              <label>Coordinates</label>
              <strong>{formatLatLng(activeEarthquake)}</strong>
              <span>Epicenter location</span>
            </div>
            <div className="detail">
              <label>Timestamp</label>
              <strong>{formatTimestamp(activeEarthquake.timestamp)}</strong>
              <span>Mocked event time</span>
            </div>
            <div className="detail">
              <label>Distance to marker</label>
              <strong data-accent="true">
                {selectedDistanceKm !== null
                  ? formatDistanceKm(selectedDistanceKm)
                  : 'Place a point'}
              </strong>
              <span>Updates after click or marker drag</span>
            </div>
            <div className="detail">
              <label>Interaction state</label>
              <strong>{hoveredEarthquake ? 'Hovering' : 'Locked selection'}</strong>
              <span>Screen shake follows the selected magnitude</span>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            Click an earthquake aura on the map to inspect its magnitude,
            coordinates, and surrounding activity.
          </div>
        )}
      </section>

      <section className="panel-card">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Reference Point</span>
            <h3>{referencePoint ? referencePoint.label : 'No custom point yet'}</h3>
          </div>
        </div>

        {referencePoint ? (
          <>
            <div className="detail-grid">
              <div className="detail">
                <label>Marker position</label>
                <strong>{formatLatLng(referencePoint)}</strong>
                <span>Click the map or drag the marker to update</span>
              </div>
              <div className="detail">
                <label>Nearby count</label>
                <strong>{deferredNearbyEarthquakes.length}</strong>
                <span>Within {distanceThresholdKm} km</span>
              </div>
              <div className="detail">
                <label>Strongest nearby</label>
                <strong>
                  {strongestNearby ? `M ${strongestNearby.mag.toFixed(1)}` : 'None'}
                </strong>
                <span>
                  {strongestNearby ? strongestNearby.place : 'No events in range'}
                </span>
              </div>
              <div className="detail">
                <label>Ranking mode</label>
                <strong>{sortMode === 'distance' ? 'Nearest first' : 'Highest mag'}</strong>
                <span>Panel list updates instantly</span>
              </div>
            </div>

            {userPoint ? (
              <div className="action-row">
                <button className="button button-primary" onClick={onClearUserPoint}>
                  Clear custom marker
                </button>
              </div>
            ) : (
              <p className="mini-note">
                Without a custom marker, nearby calculations use the selected
                earthquake as the reference point.
              </p>
            )}
          </>
        ) : (
          <div className="empty-state">
            Click anywhere on the map to place a custom reference marker and
            reveal the closest and strongest nearby earthquakes.
          </div>
        )}
      </section>

      <section className="panel-card">
        <span className="eyebrow">Controls</span>
        <h3>Filtering and simulation</h3>

        <div className="control-stack">
          <div className="control">
            <label htmlFor="distance-threshold">
              Threshold radius: {distanceThresholdKm} km
            </label>
            <input
              id="distance-threshold"
              max="240"
              min="20"
              onChange={(event) => onSetDistanceThresholdKm(Number(event.target.value))}
              step="5"
              type="range"
              value={distanceThresholdKm}
            />
          </div>

          <div className="control">
            <label htmlFor="sort-mode">Nearby list sorting</label>
            <select
              id="sort-mode"
              onChange={(event) => onSetSortMode(event.target.value)}
              value={sortMode}
            >
              <option value="distance">Distance</option>
              <option value="magnitude">Magnitude</option>
            </select>
          </div>

          <div className="toggle-row">
            <label className="toggle">
              <input
                checked={focusNearby}
                onChange={(event) => onSetFocusNearby(event.target.checked)}
                type="checkbox"
              />
              Dim distant auras
            </label>
            <label className="toggle">
              <input
                checked={liveFeedEnabled}
                onChange={(event) => onSetLiveFeedEnabled(event.target.checked)}
                type="checkbox"
              />
              Live mock events
            </label>
          </div>
        </div>
      </section>

      <section className="panel-card">
        <span className="eyebrow">Nearby Earthquakes</span>
        <h3>{referencePoint ? 'In-range epicenters' : 'Regional activity snapshot'}</h3>

        {loading ? (
          <div className="empty-state">Loading mock seismic field...</div>
        ) : error ? (
          <div className="empty-state">{error}</div>
        ) : deferredNearbyEarthquakes.length === 0 ? (
          <div className="empty-state">
            No earthquakes are inside the current threshold. Widen the radius or
            move the marker to a busier corridor.
          </div>
        ) : (
          <div className="nearby-list">
            {deferredNearbyEarthquakes.slice(0, 8).map((quake) => (
              <button
                className={`nearby-item ${
                  selectedEarthquake?.id === quake.id ? 'is-active' : ''
                }`}
                key={quake.id}
                onClick={() => onSelectEarthquake(quake.id)}
                type="button"
              >
                <div className="nearby-item-head">
                  <strong>{quake.place}</strong>
                  <span>M {quake.mag.toFixed(1)}</span>
                </div>
                <div className="nearby-meta">
                  <span>{formatTimestamp(quake.timestamp)}</span>
                  {quake.distanceKm !== null ? (
                    <span>{formatDistanceKm(quake.distanceKm)}</span>
                  ) : null}
                  <span>{formatLatLng(quake)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}

export default memo(DashboardPanel);
