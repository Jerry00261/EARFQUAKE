import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import './App.css';
import DashboardPanel from './components/DashboardPanel';
import GoogleEarthquakeMap from './components/GoogleEarthquakeMap';
import SeismicRiskMap from './components/SeismicRiskMap';
import PredictionPanel from './components/PredictionPanel';
import StateAnalyticsPanel from './components/StateAnalyticsPanel';
import { useGoogleMapsApi } from './hooks/useGoogleMapsApi';
import {
  getAllEarthquakes,
  getEarthquakes,
  getLocationHistory,
  getLocationYearEvents,
  subscribeToEarthquakeFeed,
} from './services/earthquakeService';
import {
  fetchHeatmap,
  fetchPrediction,
  fetchSeismogram,
} from './services/seismicService';

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

function App() {
  const [activeView, setActiveView] = useState('explorer');

  // --- Shared map state ---
  const { status: mapApiStatus, error: mapApiError } = useGoogleMapsApi();
  const mapNodeRef = useRef(null);
  const sharedMapRef = useRef(null);
  const overlayRef = useRef(null);
  const streetViewContainerRef = useRef(null);
  const [sharedMapReady, setSharedMapReady] = useState(false);
  const [overlayReady, setOverlayReady] = useState(false);
  const [streetViewActive, setStreetViewActive] = useState(false);

  // --- Explorer view state ---
  const [earthquakes, setEarthquakes] = useState([]);
  const [totalEventCount, setTotalEventCount] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [minMag, setMinMag] = useState(0);
  const selectedLocationRef = useRef(null);
  const mapShellRef = useRef(null);
  const shakeAnimationRef = useRef(null);

  // --- Seismic Risk view state ---
  const [heatmapPoints, setHeatmapPoints] = useState(null);
  const [pinLatLng, setPinLatLng] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [seismogram, setSeismogram] = useState(null);
  const [seismogramPlayheadFrame, setSeismogramPlayheadFrame] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [seismicPanelOpen, setSeismicPanelOpen] = useState(false);
  const [seekTarget, setSeekTarget] = useState(null);
  const seekIdRef = useRef(0);
  const seismicDataLoadedRef = useRef(false);
  const lastPredictCoordsRef = useRef(null);

  // --- State analytics ---
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [allEarthquakes, setAllEarthquakes] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const analyticsLoadedRef = useRef(false);

  // --- Create shared map once ---
  useEffect(() => {
    if (mapApiStatus !== 'loaded' || sharedMapRef.current || !mapNodeRef.current) return;

    const map = new window.google.maps.Map(mapNodeRef.current, {
      center: { lat: 33.92, lng: -117.97 },
      zoom: 8,
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

    const overlay = new window.google.maps.OverlayView();
    overlay.onAdd = () => {};
    overlay.draw = () => setOverlayReady(true);
    overlay.onRemove = () => setOverlayReady(false);
    overlay.setMap(map);

    sharedMapRef.current = map;
    overlayRef.current = overlay;
    setSharedMapReady(true);
  }, [mapApiStatus]);

  // Close street view when switching tabs
  const handleTabSwitch = useCallback((view) => {
    if (sharedMapRef.current) {
      const sv = sharedMapRef.current.getStreetView();
      if (sv.getVisible()) {
        sv.setVisible(false);
      }
    }
    setStreetViewActive(false);
    setActiveView(view);
  }, []);

  const handleStreetViewChange = useCallback((active) => {
    setStreetViewActive(active);
  }, []);

  const handleExitStreetView = useCallback(() => {
    if (sharedMapRef.current) {
      const sv = sharedMapRef.current.getStreetView();
      if (sv.getVisible()) sv.setVisible(false);
    }
    setStreetViewActive(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadEarthquakes() {
      try {
        setLoading(true);
        const dataset = await getEarthquakes(selectedYear);

        if (!isMounted) {
          return;
        }

        setEarthquakes(dataset.locations);
        setTotalEventCount(dataset.totalCount);

        // Re-select same location after year change
        if (selectedLocationRef.current) {
          const match = dataset.locations.find(
            (q) => q.locationId === selectedLocationRef.current
          );
          if (match) {
            setSelectedId(match.id);
          }
        }
      } catch (loadError) {
        if (isMounted) {
          console.error(loadError.message || 'Unable to load mock earthquakes.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadEarthquakes();

    return () => {
      isMounted = false;
    };
  }, [selectedYear]);

  const triggerScreenShake = useCallback((magnitude) => {
    if (magnitude < 3 || !mapShellRef.current) {
      return;
    }

    const amplitude =
      magnitude >= 5
        ? Math.min(20, 4 + magnitude * 2.4)
        : Math.min(10, 1.5 + magnitude * 1.25);

    shakeAnimationRef.current?.cancel();

    shakeAnimationRef.current = mapShellRef.current.animate(
      [
        { transform: 'translate3d(0, 0, 0)' },
        { transform: `translate3d(${amplitude}px, ${-amplitude * 0.35}px, 0)` },
        {
          transform: `translate3d(${-amplitude * 0.9}px, ${amplitude * 0.28}px, 0)`,
        },
        {
          transform: `translate3d(${amplitude * 0.75}px, ${amplitude * 0.2}px, 0)`,
        },
        {
          transform: `translate3d(${-amplitude * 0.55}px, ${-amplitude * 0.18}px, 0)`,
        },
        { transform: 'translate3d(0, 0, 0)' },
      ],
      {
        duration: 380,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    );
  }, []);

  useEffect(
    () => () => {
      shakeAnimationRef.current?.cancel();
    },
    []
  );

  useEffect(() => {
    return subscribeToEarthquakeFeed((incomingQuake) => {
      startTransition(() => {
        setEarthquakes((current) => [incomingQuake, ...current].slice(0, 1500));
      });

      if (incomingQuake.mag >= 5) {
        triggerScreenShake(incomingQuake.mag);
      }
    });
  }, [triggerScreenShake]);

  const filteredEarthquakes = useMemo(
    () => earthquakes.filter((q) => q.mag != null && q.mag >= minMag),
    [earthquakes, minMag]
  );

  const earthquakeMap = useMemo(
    () => new Map(filteredEarthquakes.map((quake) => [quake.id, quake])),
    [filteredEarthquakes]
  );

  const selectedEarthquake = selectedId ? earthquakeMap.get(selectedId) : null;
  const selectedLocationId = selectedEarthquake?.locationId ?? null;

  const [locationHistory, setLocationHistory] = useState([]);
  const [yearEvents, setYearEvents] = useState([]);

  useEffect(() => {
    if (!selectedLocationId) {
      setLocationHistory([]);
      return;
    }
    let cancelled = false;
    getLocationHistory(selectedLocationId).then((data) => {
      if (!cancelled) setLocationHistory(data);
    });
    return () => { cancelled = true; };
  }, [selectedLocationId]);

  useEffect(() => {
    if (!selectedLocationId) {
      setYearEvents([]);
      return;
    }
    let cancelled = false;
    getLocationYearEvents(selectedLocationId, selectedYear).then((data) => {
      if (!cancelled) setYearEvents(data);
    });
    return () => { cancelled = true; };
  }, [selectedLocationId, selectedYear]);

  const handleSelectEarthquake = useCallback(
    (quakeId) => {
      if (quakeId == null) {
        setSelectedId(null);
        selectedLocationRef.current = null;
        setPanelOpen(false);
        return;
      }
      const quake = earthquakeMap.get(quakeId);
      setSelectedId(quakeId);
      if (quake) {
        selectedLocationRef.current = quake.locationId;
      }
      setPanelOpen(true);

      if (quake) {
        triggerScreenShake(quake.mag);
      }
    },
    [earthquakeMap, triggerScreenShake]
  );

  const handleHoverEarthquake = useCallback((quakeId) => {
    setHoveredId(quakeId);
  }, []);

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  // --- Seismic Risk: load data on mount ---
  useEffect(() => {
    if (activeView !== 'seismic') return;
    if (seismicDataLoadedRef.current) return;
    let cancelled = false;

    Promise.all([fetchHeatmap()])
      .then(([hmap]) => {
        if (cancelled) return;
        setHeatmapPoints(hmap);
        seismicDataLoadedRef.current = true;
      })
      .catch((err) => console.error('Seismic data load error:', err));

    return () => { cancelled = true; };
  }, [activeView]);

  // --- Seismic Risk: map click handler ---
  const handleSeismicMapClick = useCallback(async (latLng) => {
    const last = lastPredictCoordsRef.current;
    const sameLocation = last &&
      Math.abs(last.lat - latLng.lat) < 0.0001 &&
      Math.abs(last.lng - latLng.lng) < 0.0001;

    setPinLatLng(latLng);
    setSeismicPanelOpen(true);

    if (sameLocation) return;

    lastPredictCoordsRef.current = latLng;
    setPrediction(null);
    setSeismogram(null);
    setSeismogramPlayheadFrame(null);
    setSeekTarget(null);
    setPredictionLoading(true);

    try {
      const pred = await fetchPrediction(latLng.lat, latLng.lng);
      setPrediction(pred);

      const seis = await fetchSeismogram(latLng.lat, latLng.lng, pred.vs30, pred.pga_g);
      setSeismogram(seis);
    } catch (err) {
      console.error('Prediction error:', err);
    } finally {
      setPredictionLoading(false);
    }
  }, []);

  const handleCloseSeismicPanel = useCallback(() => {
    setSeismicPanelOpen(false);
    setPinLatLng(null);
    setPrediction(null);
    setSeismogram(null);
    setSeismogramPlayheadFrame(null);
    setSeekTarget(null);
    lastPredictCoordsRef.current = null;
  }, []);

  const handleSeismogramSeek = useCallback((frame) => {
    seekIdRef.current += 1;
    setSeekTarget({ frame, id: seekIdRef.current });
  }, []);

  const handleToggleAnalytics = useCallback(() => {
    setAnalyticsOpen((prev) => {
      const opening = !prev;
      if (opening && !analyticsLoadedRef.current) {
        setAnalyticsLoading(true);
        getAllEarthquakes()
          .then((data) => {
            setAllEarthquakes(data);
            analyticsLoadedRef.current = true;
          })
          .catch((err) => console.error('Analytics load error:', err))
          .finally(() => setAnalyticsLoading(false));
      }
      return opening;
    });
  }, []);

  const currentPanelOpen = activeView === 'explorer' ? panelOpen : seismicPanelOpen;

  return (
    <div className="app-shell">
      <nav className="app-tab-bar">
        <button
          className={`tab-btn${activeView === 'explorer' ? ' active' : ''}`}
          onClick={() => handleTabSwitch('explorer')}
        >
          Explorer
        </button>
        <button
          className={`tab-btn${activeView === 'seismic' ? ' active' : ''}`}
          onClick={() => handleTabSwitch('seismic')}
        >
          Seismic Risk
        </button>
        <span className="app-nav-title">EARFQUAKE</span>
      </nav>

      <div className="app-frame">
        <div
          className={`map-shell${currentPanelOpen ? ' panel-open' : ''}`}
          ref={mapShellRef}
        >
          <div className={`map-stage${activeView === 'seismic' ? ' seismic-map-stage' : ''}${streetViewActive ? ' streetview-active' : ''}`}>
            <div className="seismic-streetview-container" ref={streetViewContainerRef}>
              <div className="map-canvas" ref={mapNodeRef} />
            </div>

            {activeView === 'seismic' && streetViewActive && (
              <button
                className="streetview-back-btn"
                type="button"
                onClick={handleExitStreetView}
              >
                ← Back to Map
              </button>
            )}

            {activeView === 'explorer' && sharedMapReady && (
              <GoogleEarthquakeMap
                map={sharedMapRef.current}
                overlay={overlayRef.current}
                overlayReady={overlayReady}
                mapNode={mapNodeRef.current}
                earthquakes={filteredEarthquakes}
                hoveredId={hoveredId}
                loading={loading}
                mapApiStatus={mapApiStatus}
                mapApiError={mapApiError}
                minMag={minMag}
                onHover={handleHoverEarthquake}
                onMinMagChange={setMinMag}
                onSelect={handleSelectEarthquake}
                onYearChange={setSelectedYear}
                panelOpen={panelOpen}
                selectedEarthquake={selectedEarthquake}
                selectedId={selectedId}
                selectedYear={selectedYear}
                streetViewActive={streetViewActive}
                onStreetViewChange={handleStreetViewChange}
                totalEventCount={totalEventCount}
              />
            )}

            {activeView === 'seismic' && sharedMapReady && (
              <SeismicRiskMap
                map={sharedMapRef.current}
                streetViewContainerRef={streetViewContainerRef}
                mapApiStatus={mapApiStatus}
                mapApiError={mapApiError}
                heatmapPoints={heatmapPoints}
                onMapClick={handleSeismicMapClick}
                pinLatLng={pinLatLng}
                panelOpen={seismicPanelOpen}
                seismogram={seismogram}
                onPlayheadFrameChange={setSeismogramPlayheadFrame}
                seekTarget={seekTarget}
                streetViewActive={streetViewActive}
                onStreetViewChange={handleStreetViewChange}
              />
            )}
          </div>
        </div>

        {activeView === 'explorer' && (
          <DashboardPanel
            locationHistory={locationHistory}
            minMag={minMag}
            onClose={handleClosePanel}
            panelOpen={panelOpen}
            selectedEarthquake={selectedEarthquake}
            selectedYear={selectedYear}
            yearEvents={yearEvents}
          />
        )}

        {activeView === 'seismic' && (
          <PredictionPanel
            prediction={prediction}
            seismogram={seismogram}
            playheadFrame={seismogramPlayheadFrame}
            pinLatLng={pinLatLng}
            onClose={handleCloseSeismicPanel}
            loading={predictionLoading}
            onSeek={handleSeismogramSeek}
          />
        )}
      </div>

      {activeView === 'explorer' && !streetViewActive && (
        <button
          className="state-analytics-toggle"
          type="button"
          onClick={handleToggleAnalytics}
        >
          {analyticsOpen ? 'Close Analytics' : 'State Analytics'}
        </button>
      )}

      {analyticsOpen && (
        <StateAnalyticsPanel
          earthquakes={allEarthquakes}
          loading={analyticsLoading}
          onClose={handleToggleAnalytics}
        />
      )}
    </div>
  );
}

export default App;
