import { memo } from 'react';
import WaveformChart from './WaveformChart';

const TIER_COLORS = {
  extreme: '#ef4444',
  high: '#f97316',
  medium: '#facc15',
  low: '#4ade80',
};

function PredictionPanel({ prediction, seismogram, playheadFrame, pinLatLng, onClose, loading, onSeek }) {
  if (!pinLatLng) return null;

  const tierColor = prediction ? TIER_COLORS[prediction.tier] || '#8a9bb8' : '#8a9bb8';

  return (
    <aside className={`prediction-panel is-open`}>
      <button className="panel-close-btn" onClick={onClose} aria-label="Close panel">×</button>

      <section className="panel-card">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Seismic Risk Prediction</span>
            <h2>{pinLatLng.lat.toFixed(4)}°, {pinLatLng.lng.toFixed(4)}°</h2>
          </div>
        </div>

        {loading && (
          <div className="spinner-container">
            <div className="spinner" />
            <p className="panel-copy" style={{ color: '#f59e0b', marginTop: 10 }}>Loading prediction…</p>
          </div>
        )}

        {prediction && !loading && (
          <>
            <div className="detail-grid" style={{ marginTop: 16 }}>
              <div className="detail">
                <label>Risk Tier</label>
                <strong style={{ color: tierColor, textTransform: 'capitalize' }}>
                  {prediction.tier}
                </strong>
                <span>Seismic hazard level</span>
              </div>
              <div className="detail">
                <label>PGA (g)</label>
                <strong data-accent="true">{prediction.pga_g.toFixed(4)}</strong>
                <span>Peak ground acceleration</span>
              </div>
              <div className="detail">
                <label>Fault Distance</label>
                <strong>{prediction.fault_dist_km.toFixed(1)} km</strong>
                <span>Distance to nearest fault</span>
              </div>
              <div className="detail">
                <label>Vs30</label>
                <strong>{prediction.vs30.toFixed(0)} m/s</strong>
                <span>Shear-wave velocity</span>
              </div>
            </div>

            {seismogram && (
              <div style={{ marginTop: 16 }}>
                <div className="detail-grid">
                  <div className="detail detail-span-2">
                    <label>Receiver</label>
                    <strong>{seismogram.receiver_name}</strong>
                    <span>Site class: {seismogram.site_class}</span>
                  </div>
                </div>
                <WaveformChart
                  waveformMs={seismogram.waveform_ms}
                  sampleRateHz={seismogram.sample_rate_hz}
                  playheadFrame={playheadFrame}
                  onSeek={onSeek}
                />
              </div>
            )}
          </>
        )}

        {!prediction && !loading && (
          <div className="empty-state" style={{ marginTop: 16 }}>
            Drag the pegman or click the map to generate a seismic risk prediction.
          </div>
        )}
      </section>
    </aside>
  );
}

export default memo(PredictionPanel);
