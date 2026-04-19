import { memo, useCallback, useEffect, useRef, useState } from 'react';

const TIER_COLORS = { extreme: '#ef4444', high: '#f97316', medium: '#facc15', low: '#4ade80' };

function SeismicRiskMap({
  map,
  streetViewContainerRef,
  mapApiStatus,
  mapApiError,
  heatmapPoints,
  onMapClick,
  pinLatLng,
  panelOpen,
  seismogram,
  onPlayheadFrameChange,
  seekTarget,
  streetViewActive,
  onStreetViewChange,
}) {
  const pinMarkerRef = useRef(null);
  const heatmapRectsRef = useRef([]);
  const shakeIntervalRef = useRef(null);
  const shakeEnabledRef = useRef(true);
  const [streetViewSession, setStreetViewSession] = useState(0);
  const [shakeEnabled, setShakeEnabled] = useState(true);
  const [noStreetViewMsg, setNoStreetViewMsg] = useState(false);

  const resetStreetViewTransform = useCallback(() => {
    if (streetViewContainerRef.current) {
      streetViewContainerRef.current.style.transform = 'translate(0px, 0px)';
    }
  }, [streetViewContainerRef]);

  const stopShakeAnimation = useCallback(() => {
    if (shakeIntervalRef.current) {
      clearInterval(shakeIntervalRef.current);
      shakeIntervalRef.current = null;
    }
    resetStreetViewTransform();
  }, [resetStreetViewTransform]);

  useEffect(() => {
    shakeEnabledRef.current = shakeEnabled;
    if (!shakeEnabled) {
      resetStreetViewTransform();
    }
  }, [shakeEnabled, resetStreetViewTransform]);

  // Street view listener + map click
  useEffect(() => {
    if (!map) return;

    const sv = map.getStreetView();
    let skipVisibilityChange = false;

    const svListener = sv.addListener('visible_changed', () => {
      if (skipVisibilityChange) return;
      const visible = sv.getVisible();

      if (visible) {
        const dropPos = sv.getPosition();
        if (!dropPos) {
          skipVisibilityChange = true;
          sv.setVisible(false);
          skipVisibilityChange = false;
          onStreetViewChange(false);
          return;
        }

        const svSvc = new window.google.maps.StreetViewService();
        svSvc.getPanorama(
          { location: { lat: dropPos.lat(), lng: dropPos.lng() }, radius: 50 },
          (result, svStatus) => {
            if (
              svStatus === window.google.maps.StreetViewStatus.OK &&
              result?.location?.latLng
            ) {
              sv.setPosition(result.location.latLng);
              onStreetViewChange(true);
              onMapClick({
                lat: result.location.latLng.lat(),
                lng: result.location.latLng.lng(),
              });
              setStreetViewSession((s) => s + 1);
            } else {
              skipVisibilityChange = true;
              sv.setVisible(false);
              skipVisibilityChange = false;
              onStreetViewChange(false);
              setNoStreetViewMsg(true);
              setTimeout(() => setNoStreetViewMsg(false), 3000);
            }
          }
        );
      } else {
        onStreetViewChange(false);
        stopShakeAnimation();
        onPlayheadFrameChange?.(null);
      }
    });

    const clickListener = map.addListener('click', (e) => {
      if (!e.latLng) return;
      onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });

    return () => {
      svListener.remove();
      clickListener.remove();
    };
  }, [map, onMapClick, onPlayheadFrameChange, onStreetViewChange, stopShakeAnimation]);

  // Resize on panel toggle
  useEffect(() => {
    if (map) {
      window.google.maps.event.trigger(map, 'resize');
    }
  }, [map, panelOpen]);

  // Shake animation
  useEffect(() => {
    if (!streetViewActive) {
      stopShakeAnimation();
      onPlayheadFrameChange?.(null);
      return;
    }

    const px = seismogram?.px;
    const py = seismogram?.py;

    if (!Array.isArray(px) || !Array.isArray(py) || px.length === 0 || py.length === 0) {
      stopShakeAnimation();
      onPlayheadFrameChange?.(null);
      return;
    }

    stopShakeAnimation();

    const totalFrames = Math.min(600, px.length, py.length);
    let frame = seekTarget ? Math.max(0, Math.min(seekTarget.frame, totalFrames - 1)) : 0;

    onPlayheadFrameChange?.(frame);

    shakeIntervalRef.current = setInterval(() => {
      if (frame >= totalFrames) {
        stopShakeAnimation();
        onPlayheadFrameChange?.(null);
        return;
      }

      onPlayheadFrameChange?.(frame);

      if (shakeEnabledRef.current && streetViewContainerRef.current) {
        const x = Number(px[frame]) || 0;
        const y = Number(py[frame]) || 0;
        streetViewContainerRef.current.style.transform = `translate(${x}px, ${y}px)`;
      } else {
        resetStreetViewTransform();
      }

      frame += 1;
    }, 100);

    return () => {
      stopShakeAnimation();
      onPlayheadFrameChange?.(null);
    };
  }, [
    onPlayheadFrameChange,
    resetStreetViewTransform,
    seekTarget,
    seismogram,
    stopShakeAnimation,
    streetViewActive,
    streetViewContainerRef,
    streetViewSession,
  ]);

  useEffect(() => () => {
    stopShakeAnimation();
    onPlayheadFrameChange?.(null);
  }, [onPlayheadFrameChange, stopShakeAnimation]);

  // Draw heatmap tiles
  useEffect(() => {
    if (!map || !heatmapPoints) return;

    heatmapRectsRef.current.forEach((r) => r.setMap(null));
    heatmapRectsRef.current = [];

    const step = 0.1;
    const rects = heatmapPoints.map((pt) => {
      const color = TIER_COLORS[pt.tier] || '#888';
      return new window.google.maps.Rectangle({
        bounds: {
          north: pt.lat + step / 2,
          south: pt.lat - step / 2,
          east: pt.lon + step / 2,
          west: pt.lon - step / 2,
        },
        fillColor: color,
        fillOpacity: 0.22,
        strokeWeight: 0,
        clickable: false,
        map: map,
        zIndex: 0,
      });
    });

    heatmapRectsRef.current = rects;

    return () => {
      rects.forEach((r) => r.setMap(null));
    };
  }, [map, heatmapPoints]);

  // Pin marker
  useEffect(() => {
    if (!map) return;

    if (pinMarkerRef.current) {
      pinMarkerRef.current.setMap(null);
      pinMarkerRef.current = null;
    }

    if (pinLatLng) {
      const marker = new window.google.maps.Marker({
        position: { lat: pinLatLng.lat, lng: pinLatLng.lng },
        map: map,
        draggable: true,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#ef6c00',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        zIndex: 10,
      });

      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (pos) {
          onMapClick({ lat: pos.lat(), lng: pos.lng() });
        }
      });

      pinMarkerRef.current = marker;
      map.panTo({ lat: pinLatLng.lat, lng: pinLatLng.lng });
    }
  }, [map, onMapClick, pinLatLng]);

  return (
    <>
      <div className="map-overlay">
        <div className="map-badge">
          <h1>Seismic Risk Map</h1>
          <p>Drag the pegman or click anywhere to predict seismic risk and view a simulated seismogram.</p>
        </div>
        {mapApiStatus === 'loading' && (
          <div className="map-status"><strong>Loading map…</strong></div>
        )}
        {mapApiStatus === 'error' && (
          <div className="map-status"><strong>Map error</strong><p>{mapApiError}</p></div>
        )}
      </div>

      <div className="map-legend">
        <div className="legend-title">Heatmap Tiers</div>
        {Object.entries(TIER_COLORS).map(([tier, color]) => (
          <div className="legend-row" key={tier}>
            <span className="legend-dot" style={{ background: color }} />
            <span className="legend-label" style={{ textTransform: 'capitalize' }}>{tier}</span>
          </div>
        ))}
        <div className="legend-divider" />
        <div className="legend-row">
          <span className="legend-marker" />
          <span className="legend-label">Prediction pin</span>
        </div>
      </div>

      {streetViewActive && (
        <button
          className="streetview-shake-toggle"
          type="button"
          onClick={() => setShakeEnabled((enabled) => !enabled)}
        >
          {shakeEnabled ? 'Disable Shake' : 'Enable Shake'}
        </button>
      )}

      {noStreetViewMsg && (
        <div className="no-streetview-overlay">
          No Street View available at this location
        </div>
      )}
    </>
  );
}

export default memo(SeismicRiskMap);
