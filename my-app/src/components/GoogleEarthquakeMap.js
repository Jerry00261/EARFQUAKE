import { memo, useEffect, useMemo, useRef, useState } from 'react';
import AuraCanvas from './AuraCanvas';
import { useGoogleMapsApi } from '../hooks/useGoogleMapsApi';

const DEFAULT_CENTER = { lat: 33.92, lng: -117.97 };

const MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#1c2a3a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a9bb8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#141e2e' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2e4058' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#6a7d98' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1e2e40' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6a7d98' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a3028' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#243446' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a2636' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c3e52' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1e2e40' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#111c2a' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a6480' }] },
];

function findIntersectingEarthquake(event, container, overlay, earthquakes) {
  if (!event.domEvent || !container || !overlay?.getProjection?.() || !window.google?.maps) {
    return null;
  }

  const rect = container.getBoundingClientRect();
  const x = event.domEvent.clientX - rect.left;
  const y = event.domEvent.clientY - rect.top;
  const projection = overlay.getProjection();

  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  earthquakes.forEach((quake) => {
    const pixel = projection.fromLatLngToContainerPixel(
      new window.google.maps.LatLng(quake.lat, quake.lng)
    );

    if (!pixel) {
      return;
    }

    const dx = x - pixel.x;
    const dy = y - pixel.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const hitRadius = 12 + quake.mag * 3.4;

    if (distance <= hitRadius && distance < nearestDistance) {
      nearest = quake;
      nearestDistance = distance;
    }
  });

  return nearest;
}

function GoogleEarthquakeMap({
  earthquakes,
  focusNearby,
  hoveredId,
  loading,
  nearbyIds,
  onHover,
  onSelect,
  onUserPointChange,
  panelOpen,
  selectedEarthquake,
  selectedId,
  userPoint,
}) {
  const { status, error } = useGoogleMapsApi();
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const overlayRef = useRef(null);
  const markerRef = useRef(null);
  const listenersRef = useRef([]);
  const latestStateRef = useRef({
    earthquakes,
    onHover,
    onSelect,
    onUserPointChange,
  });
  const [overlayReady, setOverlayReady] = useState(false);

  useEffect(() => {
    latestStateRef.current = {
      earthquakes,
      onHover,
      onSelect,
      onUserPointChange,
    };
  }, [earthquakes, onHover, onSelect, onUserPointChange]);

  useEffect(() => {
    if (status !== 'loaded' || mapRef.current || !mapNodeRef.current) {
      return undefined;
    }

    const map = new window.google.maps.Map(mapNodeRef.current, {
      center: DEFAULT_CENTER,
      zoom: 8,
      minZoom: 6,
      maxZoom: 13,
      disableDefaultUI: true,
      streetViewControl: true,
      clickableIcons: false,
      gestureHandling: 'greedy',
      backgroundColor: '#1c2a3a',
      styles: MAP_STYLES,
    });

    const overlay = new window.google.maps.OverlayView();
    overlay.onAdd = () => {};
    overlay.draw = () => {
      setOverlayReady(true);
    };
    overlay.onRemove = () => {
      setOverlayReady(false);
    };
    overlay.setMap(map);

    map.setOptions({
      streetViewControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_BOTTOM,
      },
    });

    mapRef.current = map;
    overlayRef.current = overlay;

    return () => {
      listenersRef.current.forEach((listener) => listener.remove());
      listenersRef.current = [];

      if (markerRef.current) {
        window.google.maps.event.clearInstanceListeners(markerRef.current);
        markerRef.current.setMap(null);
        markerRef.current = null;
      }

      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }

      if (mapRef.current) {
        window.google.maps.event.clearInstanceListeners(mapRef.current);
        mapRef.current = null;
      }
    };
  }, [status]);

  useEffect(() => {
    if (!mapRef.current) return;
    // Trigger a resize so Google Maps recalculates controls after the container changes size
    window.google.maps.event.trigger(mapRef.current, 'resize');
  }, [panelOpen]);

  useEffect(() => {
    if (!mapRef.current || !overlayRef.current) {
      return undefined;
    }

    listenersRef.current.forEach((listener) => listener.remove());

    listenersRef.current = [
      mapRef.current.addListener('mousemove', (event) => {
        const activeQuake = findIntersectingEarthquake(
          event,
          mapNodeRef.current,
          overlayRef.current,
          latestStateRef.current.earthquakes
        );

        latestStateRef.current.onHover(activeQuake?.id ?? null);
      }),
      mapRef.current.addListener('mouseout', () => {
        latestStateRef.current.onHover(null);
      }),
      mapRef.current.addListener('click', (event) => {
        const activeQuake = findIntersectingEarthquake(
          event,
          mapNodeRef.current,
          overlayRef.current,
          latestStateRef.current.earthquakes
        );

        if (activeQuake) {
          latestStateRef.current.onSelect(activeQuake.id);
          return;
        }

        if (event.latLng) {
          latestStateRef.current.onUserPointChange({
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
          });
        }
      }),
    ];

    return () => {
      listenersRef.current.forEach((listener) => listener.remove());
      listenersRef.current = [];
    };
  }, [overlayReady]);

  useEffect(() => {
    if (!mapRef.current || status !== 'loaded' || !window.google?.maps) {
      return undefined;
    }

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        draggable: true,
        map: null,
        zIndex: 100,
        title: 'Reference point',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#ef6c00',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      markerRef.current.addListener('dragend', (event) => {
        if (event.latLng) {
          onUserPointChange({
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
          });
        }
      });
    }

    if (userPoint) {
      markerRef.current.setMap(mapRef.current);
      markerRef.current.setPosition(userPoint);
    } else {
      markerRef.current.setMap(null);
    }

    return undefined;
  }, [onUserPointChange, status, userPoint]);

  useEffect(() => {
    if (!mapRef.current || !selectedEarthquake) {
      return;
    }

    mapRef.current.panTo({
      lat: selectedEarthquake.lat,
      lng: selectedEarthquake.lng,
    });
  }, [selectedEarthquake]);

  const mapStatusMessage = useMemo(() => {
    if (status === 'missing-key') {
      return {
        title: 'Google Maps key needed',
        body:
          'Add REACT_APP_GOOGLE_MAPS_API_KEY to enable the live basemap. The dashboard logic and animation layer are already wired for real map rendering.',
      };
    }

    if (status === 'error') {
      return {
        title: 'Map engine unavailable',
        body: error || 'The Google Maps script could not be loaded.',
      };
    }

    if (loading || status === 'loading') {
      return {
        title: 'Loading map engine',
        body: 'Booting the basemap, animation overlay, and interaction layer.',
      };
    }

    return null;
  }, [error, loading, status]);

  return (
    <div className="map-stage">
      <div className="map-canvas" ref={mapNodeRef} />

      {status === 'loaded' && overlayReady ? (
        <AuraCanvas
          earthquakes={earthquakes}
          focusNearby={focusNearby}
          hoveredId={hoveredId}
          map={mapRef.current}
          nearbyIds={nearbyIds}
          overlay={overlayRef.current}
          selectedId={selectedId}
          userPoint={userPoint}
        />
      ) : null}

      <div className="map-overlay">
        <div className="map-badge">
          <h1>Earthquake Visualization Dashboard</h1>
          <p>
            Click an epicenter to inspect it, then click the map to drop a custom
            marker and explore nearby seismic activity.
          </p>
        </div>

        {mapStatusMessage ? (
          <div className="map-status">
            <strong>{mapStatusMessage.title}</strong>
            <p>{mapStatusMessage.body}</p>
          </div>
        ) : null}
      </div>

      <div className="map-legend">
        <div className="legend-title">Severity</div>
        <div className="legend-row">
          <span className="legend-dot" data-tone="low" />
          <span className="legend-ring" data-tone="low" />
          <span className="legend-label">Low (M &lt; 3)</span>
        </div>
        <div className="legend-row">
          <span className="legend-dot" data-tone="mid" />
          <span className="legend-ring" data-tone="mid" />
          <span className="legend-label">Moderate (M 3–5)</span>
        </div>
        <div className="legend-row">
          <span className="legend-dot" data-tone="high" />
          <span className="legend-ring" data-tone="high" />
          <span className="legend-label">Severe (M 5+)</span>
        </div>
        <div className="legend-divider" />
        <div className="legend-row">
          <span className="legend-dot" data-tone="selected" />
          <span className="legend-ring" data-tone="selected" />
          <span className="legend-label">Selected</span>
        </div>
        <div className="legend-row">
          <span className="legend-dot" data-tone="dimmed" />
          <span className="legend-label">Outside threshold</span>
        </div>
        <div className="legend-divider" />
        <div className="legend-row">
          <span className="legend-marker" />
          <span className="legend-label">Reference marker</span>
        </div>
      </div>
    </div>
  );
}

export default memo(GoogleEarthquakeMap);
