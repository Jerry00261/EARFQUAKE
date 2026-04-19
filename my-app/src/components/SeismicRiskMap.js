import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useGoogleMapsApi } from '../hooks/useGoogleMapsApi';

const CA_CENTER = { lat: 36.77, lng: -119.42 };

const MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#1c2a3a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a9bb8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#141e2e' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2e4058' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1e2e40' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a3028' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#243446' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c3e52' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#111c2a' }] },
];

const TIER_COLORS = { extreme: '#ef4444', high: '#f97316', medium: '#facc15', low: '#4ade80' };

function SeismicRiskMap({ earthquakes, heatmapPoints, onMapClick, pinLatLng, panelOpen }) {
  const { status, error } = useGoogleMapsApi();
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const pinMarkerRef = useRef(null);
  const quakeMarkersRef = useRef([]);
  const heatmapRectsRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (status !== 'loaded' || mapRef.current || !mapNodeRef.current) return;

    const map = new window.google.maps.Map(mapNodeRef.current, {
      center: CA_CENTER,
      zoom: 6,
      minZoom: 5,
      maxZoom: 14,
      disableDefaultUI: true,
      zoomControl: true,
      streetViewControl: true,
      clickableIcons: false,
      gestureHandling: 'greedy',
      backgroundColor: '#1c2a3a',
      styles: MAP_STYLES,
    });

    map.setOptions({
      streetViewControlOptions: {
        position: window.google.maps.ControlPosition.LEFT_BOTTOM,
      },
    });

    mapRef.current = map;
    setMapReady(true);

    // Click on map also triggers prediction
    map.addListener('click', (e) => {
      if (!e.latLng) return;
      onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });

    // Intercept pegman drop: use drop position for prediction instead of Street View
    const sv = map.getStreetView();
    sv.addListener('visible_changed', () => {
      if (sv.getVisible()) {
        sv.setVisible(false);
        const dropPos = sv.getPosition();
        if (dropPos) {
          onMapClick({ lat: dropPos.lat(), lng: dropPos.lng() });
        }
      }
    });

    return () => {
      window.google.maps.event.clearInstanceListeners(map);
      window.google.maps.event.clearInstanceListeners(sv);
      mapRef.current = null;
    };
  }, [status, onMapClick]);

  // Resize on panel toggle
  useEffect(() => {
    if (mapRef.current) {
      window.google.maps.event.trigger(mapRef.current, 'resize');
    }
  }, [panelOpen]);

  // Draw heatmap tiles
  useEffect(() => {
    if (!mapReady || !mapRef.current || !heatmapPoints) return;

    // Clear old rects
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
        map: mapRef.current,
        zIndex: 0,
      });
    });

    heatmapRectsRef.current = rects;

    return () => {
      rects.forEach((r) => r.setMap(null));
    };
  }, [mapReady, heatmapPoints]);

  // Draw earthquake dots
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    quakeMarkersRef.current.forEach((c) => c.setMap(null));
    quakeMarkersRef.current = [];

    const markers = earthquakes.map((eq) => {
      const radius = Math.max(2, eq.mag * 1.8);
      return new window.google.maps.Circle({
        center: { lat: eq.lat, lng: eq.lon },
        radius: radius * 800,
        fillColor: magToColor(eq.mag),
        fillOpacity: 0.7,
        strokeColor: magToColor(eq.mag),
        strokeWeight: 0.5,
        strokeOpacity: 0.9,
        clickable: false,
        map: mapRef.current,
        zIndex: 1,
      });
    });

    quakeMarkersRef.current = markers;

    return () => {
      markers.forEach((m) => m.setMap(null));
    };
  }, [mapReady, earthquakes]);

  // Pin marker
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    if (pinMarkerRef.current) {
      pinMarkerRef.current.setMap(null);
      pinMarkerRef.current = null;
    }

    if (pinLatLng) {
      const marker = new window.google.maps.Marker({
        position: { lat: pinLatLng.lat, lng: pinLatLng.lng },
        map: mapRef.current,
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
      mapRef.current.panTo({ lat: pinLatLng.lat, lng: pinLatLng.lng });
    }
  }, [mapReady, pinLatLng]);

  return (
    <div className={`seismic-map-stage${panelOpen ? ' seismic-panel-open' : ''}`}>
      <div className="map-canvas" ref={mapNodeRef} />

      <div className="map-overlay">
        <div className="map-badge">
          <h1>Seismic Risk Map</h1>
          <p>Drag the pegman or click anywhere to predict seismic risk and view a simulated seismogram.</p>
        </div>
        {status === 'loading' && (
          <div className="map-status"><strong>Loading map…</strong></div>
        )}
        {status === 'error' && (
          <div className="map-status"><strong>Map error</strong><p>{error}</p></div>
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
        <div className="legend-title">Earthquake Dots</div>
        <div className="legend-gradient-bar" />
        <div className="legend-gradient-labels">
          <span>3.0</span><span>5.0</span><span>7+</span>
        </div>
        <div className="legend-divider" />
        <div className="legend-row">
          <span className="legend-marker" />
          <span className="legend-label">Prediction pin</span>
        </div>
      </div>
    </div>
  );
}

function magToColor(mag) {
  if (mag <= 3) return '#4ade80';
  if (mag <= 4) return '#a0dc50';
  if (mag <= 5) return '#facc15';
  if (mag <= 6) return '#f58220';
  return '#ef4444';
}

export default memo(SeismicRiskMap);
