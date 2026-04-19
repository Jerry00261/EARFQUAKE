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
import {
  getEarthquakes,
  getLocationHistory,
  getLocationYearEvents,
  subscribeToEarthquakeFeed,
} from './services/earthquakeService';

function App() {
  const [earthquakes, setEarthquakes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [minMag, setMinMag] = useState(0);
  const selectedLocationRef = useRef(null);
  const mapShellRef = useRef(null);
  const shakeAnimationRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function loadEarthquakes() {
      try {
        setLoading(true);
        const dataset = await getEarthquakes(selectedYear);

        if (!isMounted) {
          return;
        }

        setEarthquakes(dataset);

        // Re-select same location after year change
        if (selectedLocationRef.current) {
          const match = dataset.find(
            (q) => q.locationId === selectedLocationRef.current
          );
          if (match) {
            setSelectedId(match.id);
          }
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'Unable to load mock earthquakes.');
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
    () => earthquakes.filter((q) => q.mag >= minMag),
    [earthquakes, minMag]
  );

  const earthquakeMap = useMemo(
    () => new Map(filteredEarthquakes.map((quake) => [quake.id, quake])),
    [filteredEarthquakes]
  );

  const selectedEarthquake = selectedId ? earthquakeMap.get(selectedId) : null;

  const locationHistory = useMemo(() => {
    if (!selectedEarthquake) return [];
    return getLocationHistory(selectedEarthquake.locationId);
  }, [selectedEarthquake]);

  const yearEvents = useMemo(() => {
    if (!selectedEarthquake) return [];
    return getLocationYearEvents(selectedEarthquake.locationId, selectedYear);
  }, [selectedEarthquake, selectedYear]);

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

  return (
    <div className="app-shell">
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
          />
        </div>

        <DashboardPanel
          locationHistory={locationHistory}
          onClose={handleClosePanel}
          panelOpen={panelOpen}
          selectedEarthquake={selectedEarthquake}
          selectedYear={selectedYear}
          yearEvents={yearEvents}
        />
      </div>
    </div>
  );
}

export default App;
