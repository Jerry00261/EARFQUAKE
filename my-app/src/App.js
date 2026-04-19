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
import {
  getEarthquakes,
  getLocationHistory,
  getLocationYearEvents,
  subscribeToEarthquakeFeed,
} from './services/earthquakeService';
import {
  fetchSeismicEarthquakes,
  fetchHeatmap,
  fetchPrediction,
  fetchSeismogram,
} from './services/seismicService';

function App() {
  const [activeView, setActiveView] = useState('explorer');

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
  const [seismicQuakes, setSeismicQuakes] = useState([]);
  const [heatmapPoints, setHeatmapPoints] = useState(null);
  const [pinLatLng, setPinLatLng] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [seismogram, setSeismogram] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [seismicPanelOpen, setSeismicPanelOpen] = useState(false);
  const seismicMapShellRef = useRef(null);
  const shakeIntervalRef = useRef(null);

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
    let cancelled = false;

    Promise.all([fetchSeismicEarthquakes(), fetchHeatmap()])
      .then(([quakes, hmap]) => {
        if (cancelled) return;
        setSeismicQuakes(quakes);
        setHeatmapPoints(hmap);
      })
      .catch((err) => console.error('Seismic data load error:', err));

    return () => { cancelled = true; };
  }, [activeView]);

  // --- Seismic Risk: map click handler ---
  const handleSeismicMapClick = useCallback(async (latLng) => {
    setPinLatLng(latLng);
    setPrediction(null);
    setSeismogram(null);
    setPredictionLoading(true);
    setSeismicPanelOpen(true);

    // Stop any previous shake
    if (shakeIntervalRef.current) {
      clearInterval(shakeIntervalRef.current);
      shakeIntervalRef.current = null;
      if (seismicMapShellRef.current) {
        seismicMapShellRef.current.style.transform = '';
      }
    }

    try {
      const pred = await fetchPrediction(latLng.lat, latLng.lng);
      setPrediction(pred);

      const seis = await fetchSeismogram(latLng.lat, latLng.lng, pred.vs30, pred.pga_g);
      setSeismogram(seis);

      // Animate shake using px/py arrays
      if (seis.px && seis.py && seismicMapShellRef.current) {
        let frame = 0;
        const total = seis.px.length;
        shakeIntervalRef.current = setInterval(() => {
          if (frame >= total || !seismicMapShellRef.current) {
            clearInterval(shakeIntervalRef.current);
            shakeIntervalRef.current = null;
            if (seismicMapShellRef.current) {
              seismicMapShellRef.current.style.transform = '';
            }
            return;
          }
          seismicMapShellRef.current.style.transform =
            `translate3d(${seis.px[frame]}px, ${seis.py[frame]}px, 0)`;
          frame++;
        }, 100);
      }
    } catch (err) {
      console.error('Prediction error:', err);
    } finally {
      setPredictionLoading(false);
    }
  }, []);

  // Cleanup shake on unmount
  useEffect(() => () => {
    if (shakeIntervalRef.current) clearInterval(shakeIntervalRef.current);
  }, []);

  const handleCloseSeismicPanel = useCallback(() => {
    setSeismicPanelOpen(false);
    setPinLatLng(null);
    setPrediction(null);
    setSeismogram(null);
    if (shakeIntervalRef.current) {
      clearInterval(shakeIntervalRef.current);
      shakeIntervalRef.current = null;
      if (seismicMapShellRef.current) {
        seismicMapShellRef.current.style.transform = '';
      }
    }
  }, []);

  return (
    <div className="app-shell">
      <nav className="app-tab-bar">
        <button
          className={`tab-btn${activeView === 'explorer' ? ' active' : ''}`}
          onClick={() => setActiveView('explorer')}
        >
          Explorer
        </button>
        <button
          className={`tab-btn${activeView === 'seismic' ? ' active' : ''}`}
          onClick={() => setActiveView('seismic')}
        >
          Seismic Risk
        </button>
      </nav>

      {activeView === 'explorer' && (
        <div className="app-frame">
          <div className={`map-shell${panelOpen ? ' panel-open' : ''}`} ref={mapShellRef}>
            <GoogleEarthquakeMap
              earthquakes={filteredEarthquakes}
              hoveredId={hoveredId}
              loading={loading}
              minMag={minMag}
              onHover={handleHoverEarthquake}
              onMinMagChange={setMinMag}
              onSelect={handleSelectEarthquake}
              onYearChange={setSelectedYear}
              panelOpen={panelOpen}
              selectedEarthquake={selectedEarthquake}
              selectedId={selectedId}
              selectedYear={selectedYear}
              totalEventCount={totalEventCount}
            />
          </div>

          <DashboardPanel
            locationHistory={locationHistory}
            minMag={minMag}
            onClose={handleClosePanel}
            panelOpen={panelOpen}
            selectedEarthquake={selectedEarthquake}
            selectedYear={selectedYear}
            yearEvents={yearEvents}
          />
        </div>
      )}

      {activeView === 'seismic' && (
        <div className="app-frame">
          <div
            className={`map-shell${seismicPanelOpen ? ' panel-open' : ''}`}
            ref={seismicMapShellRef}
          >
            <SeismicRiskMap
              earthquakes={seismicQuakes}
              heatmapPoints={heatmapPoints}
              onMapClick={handleSeismicMapClick}
              pinLatLng={pinLatLng}
              panelOpen={seismicPanelOpen}
            />
          </div>

          <PredictionPanel
            prediction={prediction}
            seismogram={seismogram}
            pinLatLng={pinLatLng}
            onClose={handleCloseSeismicPanel}
            loading={predictionLoading}
          />
        </div>
      )}
    </div>
  );
}

export default App;
