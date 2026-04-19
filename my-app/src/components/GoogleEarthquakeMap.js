import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  hoveredId,
  loading,
  minMag,
  onHover,
  onMinMagChange,
  onSelect,
  onYearChange,
  panelOpen,
  selectedEarthquake,
  selectedId,
  selectedYear,
}) {
  const { status, error } = useGoogleMapsApi();
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const overlayRef = useRef(null);
  const listenersRef = useRef([]);
  const [streetViewActive, setStreetViewActive] = useState(false);
  const latestStateRef = useRef({
    earthquakes,
    onHover,
    onSelect,
  });
  const [overlayReady, setOverlayReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const playIntervalRef = useRef(null);

  const togglePlay = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  useEffect(() => {
    if (playing) {
      playIntervalRef.current = window.setInterval(() => {
        onYearChange((prev) => {
          if (prev >= 2026) {
            setPlaying(false);
            return 2000;
          }
          return prev + 1;
        });
      }, 800);
    } else {
      window.clearInterval(playIntervalRef.current);
    }
    return () => window.clearInterval(playIntervalRef.current);
  }, [playing, onYearChange]);

  useEffect(() => {
    latestStateRef.current = {
      earthquakes,
      onHover,
      onSelect,
    };
  }, [earthquakes, onHover, onSelect]);

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
        position: window.google.maps.ControlPosition.LEFT_BOTTOM,
      },
    });

    mapRef.current = map;
    overlayRef.current = overlay;

    const sv = map.getStreetView();
    const svService = new window.google.maps.StreetViewService();

    // Restrict to outdoor imagery only
    sv.setOptions({
      source: window.google.maps.StreetViewSource.OUTDOOR,
    });

    let svVerified = false;

    sv.addListener('visible_changed', () => {
      const visible = sv.getVisible();

      if (visible && !svVerified) {
        // Immediately hide before the user sees anything
        sv.setVisible(false);

        const dropPos = sv.getPosition();
        if (!dropPos) return;

        // Find nearest panorama within 50m — reject if too far for accuracy
        svService.getPanorama(
          { location: dropPos, radius: 50, source: window.google.maps.StreetViewSource.OUTDOOR },
          (data, svStatus) => {
            if (svStatus === window.google.maps.StreetViewStatus.OK) {
              svVerified = true;
              const panoLatLng = data.location.latLng;
              // Compute heading from panorama to the actual drop point
              const heading = window.google.maps.geometry
                ? window.google.maps.geometry.spherical.computeHeading(panoLatLng, dropPos)
                : 0;
              sv.setPano(data.location.pano);
              sv.setPov({ heading, pitch: 0 });
              sv.setVisible(true);
            }
          }
        );
      } else if (visible && svVerified) {
        svVerified = false;
        setStreetViewActive(true);
      } else if (!visible) {
        svVerified = false;
        setStreetViewActive(false);
      }
    });

    return () => {
      listenersRef.current.forEach((listener) => listener.remove());
      listenersRef.current = [];

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

        // Clicked outside any point — deselect
        latestStateRef.current.onSelect(null);
      }),
    ];

    return () => {
      listenersRef.current.forEach((listener) => listener.remove());
      listenersRef.current = [];
    };
  }, [overlayReady]);

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
    <div className={`map-stage${streetViewActive ? ' streetview-active' : ''}`}>
      <div className="map-canvas" ref={mapNodeRef} />

      {status === 'loaded' && overlayReady && !streetViewActive ? (
        <AuraCanvas
          earthquakes={earthquakes}
          hoveredId={hoveredId}
          map={mapRef.current}
          overlay={overlayRef.current}
          selectedId={selectedId}
        />
      ) : null}

      {!streetViewActive && (
        <div className="map-overlay">
        <div className="map-badge">
          <h1>Earthquake Visualization Dashboard</h1>
          <p>
            Click an epicenter to inspect its magnitude, coordinates,
            and event details.
          </p>
        </div>

        {mapStatusMessage ? (
          <div className="map-status">
            <strong>{mapStatusMessage.title}</strong>
            <p>{mapStatusMessage.body}</p>
          </div>
        ) : null}
      </div>
      )}

      {!streetViewActive && (
      <div className="map-legend">
        <div className="legend-title">Severity</div>
        <div className="legend-gradient-bar" />
        <div className="legend-gradient-labels">
          <span>0</span>
          <span>1.5</span>
          <span>3</span>
          <span>4.5</span>
          <span>6</span>
          <span>7+</span>
        </div>
        <div className="legend-gradient-caption">Magnitude</div>
        <div className="legend-divider" />
        <div className="legend-row">
          <span className="legend-dot" data-tone="selected" />
          <span className="legend-ring" data-tone="selected" />
          <span className="legend-label">Selected</span>
        </div>
        <div className="legend-row">
          <span className="legend-dot" data-tone="dimmed" />
          <span className="legend-label">Other events</span>
        </div>
      </div>
      )}

      {!streetViewActive && (
      <div className="year-slider-container">
        <div className="year-slider-header">
          <div className="year-slider-left">
            <button
              className={`year-play-btn${playing ? ' playing' : ''}`}
              onClick={togglePlay}
              title={playing ? 'Pause' : 'Play'}
            >
              {playing ? '❚❚' : '▶'}
            </button>
            <label>Year</label>
          </div>
          <span className="year-value">{selectedYear}</span>
        </div>
        <input
          type="range"
          min={2000}
          max={2026}
          step={1}
          value={selectedYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
        />
        <div className="year-slider-bounds">
          <span>2000</span>
          <span>2026</span>
        </div>

        <div className="mag-filter-divider" />

        <div className="year-slider-header">
          <label>Min Magnitude</label>
          <span className="year-value">{minMag.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={7}
          step={0.5}
          value={minMag}
          onChange={(e) => onMinMagChange(Number(e.target.value))}
        />
        <div className="year-slider-bounds">
          <span>0</span>
          <span>7+</span>
        </div>
      </div>
      )}
    </div>
  );
}

export default memo(GoogleEarthquakeMap);
