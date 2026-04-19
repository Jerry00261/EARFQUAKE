import {
  startTransition,
  useCallback,
  useDeferredValue,
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
  subscribeToEarthquakeFeed,
} from './services/earthquakeService';
import { haversineDistanceKm } from './utils/geo';

function App() {
  const [earthquakes, setEarthquakes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [userPoint, setUserPoint] = useState(null);
  const [distanceThresholdKm, setDistanceThresholdKm] = useState(90);
  const [sortMode, setSortMode] = useState('distance');
  const [focusNearby, setFocusNearby] = useState(false);
  const [liveFeedEnabled, setLiveFeedEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const mapShellRef = useRef(null);
  const shakeAnimationRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function loadEarthquakes() {
      try {
        setLoading(true);
        const dataset = await getEarthquakes();

        if (!isMounted) {
          return;
        }

        setEarthquakes(dataset);
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
  }, []);

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
    if (!liveFeedEnabled) {
      return undefined;
    }

    return subscribeToEarthquakeFeed((incomingQuake) => {
      startTransition(() => {
        setEarthquakes((current) => [incomingQuake, ...current].slice(0, 1500));
      });

      if (incomingQuake.mag >= 5) {
        triggerScreenShake(incomingQuake.mag);
      }
    });
  }, [liveFeedEnabled, triggerScreenShake]);

  const earthquakeMap = useMemo(
    () => new Map(earthquakes.map((quake) => [quake.id, quake])),
    [earthquakes]
  );

  const selectedEarthquake = selectedId ? earthquakeMap.get(selectedId) : null;
  const hoveredEarthquake = hoveredId ? earthquakeMap.get(hoveredId) : null;

  const referencePoint = useMemo(() => {
    if (userPoint) {
      return {
        ...userPoint,
        label: 'Custom reference point',
      };
    }

    if (selectedEarthquake) {
      return {
        lat: selectedEarthquake.lat,
        lng: selectedEarthquake.lng,
        label: 'Selected earthquake',
      };
    }

    return null;
  }, [selectedEarthquake, userPoint]);

  const nearbyEarthquakes = useMemo(() => {
    const enriched = earthquakes
      .filter((quake) => {
        if (!userPoint && selectedEarthquake && quake.id === selectedEarthquake.id) {
          return false;
        }

        return true;
      })
      .map((quake) => ({
        ...quake,
        distanceKm: referencePoint
          ? haversineDistanceKm(referencePoint, quake)
          : null,
      }));

    if (referencePoint) {
      const withinThreshold = enriched.filter(
        (quake) => quake.distanceKm !== null && quake.distanceKm <= distanceThresholdKm
      );

      withinThreshold.sort((left, right) => {
        if (sortMode === 'magnitude') {
          return right.mag - left.mag || left.distanceKm - right.distanceKm;
        }

        return left.distanceKm - right.distanceKm || right.mag - left.mag;
      });

      return withinThreshold;
    }

    const ranked = [...enriched];
    ranked.sort((left, right) => right.mag - left.mag);
    return ranked;
  }, [distanceThresholdKm, earthquakes, referencePoint, selectedEarthquake, sortMode, userPoint]);

  const deferredNearbyEarthquakes = useDeferredValue(nearbyEarthquakes);

  const nearbyIds = useMemo(
    () => new Set(nearbyEarthquakes.map((quake) => quake.id)),
    [nearbyEarthquakes]
  );

  const strongestNearby = useMemo(() => {
    return nearbyEarthquakes.reduce((top, quake) => {
      if (!top || quake.mag > top.mag) {
        return quake;
      }

      return top;
    }, null);
  }, [nearbyEarthquakes]);

  const selectedDistanceKm =
    userPoint && selectedEarthquake
      ? haversineDistanceKm(userPoint, selectedEarthquake)
      : null;

  const summary = useMemo(() => {
    const totalMagnitude = earthquakes.reduce((sum, quake) => sum + quake.mag, 0);
    const highMagnitudeCount = earthquakes.filter((quake) => quake.mag >= 5).length;

    return {
      count: earthquakes.length,
      highMagnitudeCount,
      averageMagnitude:
        earthquakes.length > 0 ? totalMagnitude / earthquakes.length : 0,
    };
  }, [earthquakes]);

  const handleSelectEarthquake = useCallback(
    (quakeId) => {
      const quake = earthquakeMap.get(quakeId);
      setSelectedId(quakeId);
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

  const handleUserPointChange = useCallback((nextPoint) => {
    setUserPoint(nextPoint);
    setFocusNearby(true);
  }, []);

  const handleClearUserPoint = useCallback(() => {
    setUserPoint(null);
  }, []);

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  return (
    <div className="app-shell">
      <div className="app-frame">
        <div className={`map-shell${panelOpen ? ' panel-open' : ''}`} ref={mapShellRef}>
          <GoogleEarthquakeMap
            earthquakes={earthquakes}
            focusNearby={focusNearby}
            hoveredId={hoveredId}
            loading={loading}
            nearbyIds={nearbyIds}
            onHover={handleHoverEarthquake}
            onSelect={handleSelectEarthquake}
            onUserPointChange={handleUserPointChange}
            panelOpen={panelOpen}
            selectedEarthquake={selectedEarthquake}
            selectedId={selectedId}
            userPoint={userPoint}
          />
        </div>

        <DashboardPanel
          deferredNearbyEarthquakes={deferredNearbyEarthquakes}
          distanceThresholdKm={distanceThresholdKm}
          error={error}
          focusNearby={focusNearby}
          hoveredEarthquake={hoveredEarthquake}
          liveFeedEnabled={liveFeedEnabled}
          loading={loading}
          onClearUserPoint={handleClearUserPoint}
          onClose={handleClosePanel}
          onSelectEarthquake={handleSelectEarthquake}
          onSetDistanceThresholdKm={setDistanceThresholdKm}
          onSetFocusNearby={setFocusNearby}
          onSetLiveFeedEnabled={setLiveFeedEnabled}
          onSetSortMode={setSortMode}
          panelOpen={panelOpen}
          referencePoint={referencePoint}
          selectedDistanceKm={selectedDistanceKm}
          selectedEarthquake={selectedEarthquake}
          sortMode={sortMode}
          strongestNearby={strongestNearby}
          summary={summary}
          userPoint={userPoint}
        />
      </div>
    </div>
  );
}

export default App;
