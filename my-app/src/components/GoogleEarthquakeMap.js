import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AuraCanvas from './AuraCanvas';

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
  map,
  overlay,
  overlayReady,
  mapNode,
  earthquakes,
  hoveredId,
  loading,
  mapApiStatus,
  mapApiError,
  minMag,
  onHover,
  onMinMagChange,
  onSelect,
  onYearChange,
  panelOpen,
  selectedEarthquake,
  selectedId,
  selectedYear,
  streetViewActive,
  onStreetViewChange,
  totalEventCount,
}) {
  const listenersRef = useRef([]);
  const latestStateRef = useRef({
    earthquakes,
    onHover,
    onSelect,
  });
  const [playing, setPlaying] = useState(false);
  const playIntervalRef = useRef(null);
  const [draggingYear, setDraggingYear] = useState(null);
  const [yearInput, setYearInput] = useState(String(selectedYear));
  const isDragging = draggingYear != null;
  const displayYear = isDragging ? draggingYear : selectedYear;

  // Keep text input in sync when selectedYear changes externally
  useEffect(() => {
    if (!isDragging) {
      setYearInput(String(selectedYear));
    }
  }, [selectedYear, isDragging]);

  const togglePlay = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  useEffect(() => {
    if (playing) {
      playIntervalRef.current = window.setInterval(() => {
        onYearChange((prev) => {
          if (prev >= 2026) {
            setPlaying(false);
            return 1932;
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

  // Street view verified-drop listener
  useEffect(() => {
    if (!map) return;

    const sv = map.getStreetView();
    const svService = new window.google.maps.StreetViewService();
    sv.setOptions({ source: window.google.maps.StreetViewSource.OUTDOOR });

    let svVerified = false;

    const listener = sv.addListener('visible_changed', () => {
      const visible = sv.getVisible();

      if (visible && !svVerified) {
        sv.setVisible(false);

        const dropPos = sv.getPosition();
        if (!dropPos) return;

        svService.getPanorama(
          { location: dropPos, radius: 50, source: window.google.maps.StreetViewSource.OUTDOOR },
          (data, svStatus) => {
            if (svStatus === window.google.maps.StreetViewStatus.OK) {
              svVerified = true;
              const panoLatLng = data.location.latLng;
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
        onStreetViewChange(true);
      } else if (!visible) {
        svVerified = false;
        onStreetViewChange(false);
      }
    });

    return () => listener.remove();
  }, [map, onStreetViewChange]);

  // Resize on panel toggle
  useEffect(() => {
    if (map) {
      window.google.maps.event.trigger(map, 'resize');
    }
  }, [map, panelOpen]);

  // Click/hover listeners
  useEffect(() => {
    if (!map || !overlay) {
      return undefined;
    }

    listenersRef.current.forEach((listener) => listener.remove());

    listenersRef.current = [
      map.addListener('mousemove', (event) => {
        const activeQuake = findIntersectingEarthquake(
          event,
          mapNode,
          overlay,
          latestStateRef.current.earthquakes
        );

        latestStateRef.current.onHover(activeQuake?.id ?? null);
      }),
      map.addListener('mouseout', () => {
        latestStateRef.current.onHover(null);
      }),
      map.addListener('click', (event) => {
        const activeQuake = findIntersectingEarthquake(
          event,
          mapNode,
          overlay,
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
  }, [map, overlay, mapNode, overlayReady]);

  useEffect(() => {
    if (!map || !selectedEarthquake) {
      return;
    }

    map.panTo({
      lat: selectedEarthquake.lat,
      lng: selectedEarthquake.lng,
    });
  }, [map, selectedEarthquake]);

  const mapStatusMessage = useMemo(() => {
    if (mapApiStatus === 'missing-key') {
      return {
        title: 'Google Maps key needed',
        body:
          'Add REACT_APP_GOOGLE_MAPS_API_KEY to enable the live basemap. The dashboard logic and animation layer are already wired for real map rendering.',
      };
    }

    if (mapApiStatus === 'error') {
      return {
        title: 'Map engine unavailable',
        body: mapApiError || 'The Google Maps script could not be loaded.',
      };
    }

    if (loading || mapApiStatus === 'loading') {
      return {
        title: 'Loading map engine',
        body: 'Booting the basemap, animation overlay, and interaction layer.',
      };
    }

    return null;
  }, [mapApiError, loading, mapApiStatus]);

  return (
    <>
      {map && overlay && overlayReady && !streetViewActive ? (
        <AuraCanvas
          earthquakes={earthquakes}
          hoveredId={hoveredId}
          map={map}
          overlay={overlay}
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
        <div className="earthquake-count">{totalEventCount} event{totalEventCount !== 1 ? 's' : ''} ({earthquakes.length} location{earthquakes.length !== 1 ? 's' : ''})</div>
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
          <input
            className="year-text-input"
            type="text"
            inputMode="numeric"
            value={isDragging ? String(draggingYear) : yearInput}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
              setYearInput(raw);
            }}
            onBlur={() => {
              const n = Number(yearInput);
              if (n >= 1932 && n <= 2026) {
                onYearChange(n);
              } else {
                setYearInput(String(selectedYear));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.target.blur();
              }
            }}
          />
        </div>
        <input
          type="range"
          min={1932}
          max={2026}
          step={1}
          value={displayYear}
          onChange={(e) => setDraggingYear(Number(e.target.value))}
          onPointerUp={(e) => {
            const val = Number(e.target.value);
            setDraggingYear(null);
            onYearChange(val);
          }}
          onKeyUp={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
              onYearChange(displayYear);
              setDraggingYear(null);
            }
          }}
        />
        <div className="year-slider-bounds">
          <span>1932</span>
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
    </>
  );
}

export default memo(GoogleEarthquakeMap);
