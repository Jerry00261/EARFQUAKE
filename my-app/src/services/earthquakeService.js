import { mockEarthquakes } from '../data/mockEarthquakes';

let nextEarthquakeId = mockEarthquakes.length + 1;

const HOTSPOTS = [
  { place: 'Catalina Fracture', lat: 33.386, lng: -118.416 },
  { place: 'Hollywood Segment', lat: 34.101, lng: -118.326 },
  { place: 'Pomona Corridor', lat: 34.055, lng: -117.75 },
  { place: 'Coachella Shelf', lat: 33.702, lng: -116.233 },
  { place: 'Salton Trough', lat: 33.245, lng: -115.856 },
  { place: 'Rancho Cucamonga Front', lat: 34.106, lng: -117.594 },
  { place: 'Simi Valley Ridge', lat: 34.269, lng: -118.781 },
  { place: 'La Jolla Canyon', lat: 32.832, lng: -117.271 },
];

function delay(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function round(value, digits = 4) {
  return Number(value.toFixed(digits));
}

function createRandomEarthquake() {
  const hotspot = HOTSPOTS[Math.floor(Math.random() * HOTSPOTS.length)];
  const isHighMagnitude = Math.random() > 0.74;
  const magnitude = isHighMagnitude
    ? 5 + Math.random() * 1.2
    : 2.6 + Math.random() * 2.3;
  const latOffset = (Math.random() - 0.5) * 0.22;
  const lngOffset = (Math.random() - 0.5) * 0.28;

  return {
    id: nextEarthquakeId++,
    place: hotspot.place,
    lat: round(hotspot.lat + latOffset),
    lng: round(hotspot.lng + lngOffset),
    mag: round(magnitude, 1),
    timestamp: new Date().toISOString(),
  };
}

export async function getEarthquakes() {
  await delay(180);
  return [...mockEarthquakes].sort(
    (left, right) => new Date(right.timestamp) - new Date(left.timestamp)
  );
}

export function subscribeToEarthquakeFeed(onEvent, options = {}) {
  const intervalMs = options.intervalMs ?? 9000;
  const intervalId = window.setInterval(() => {
    onEvent(createRandomEarthquake());
  }, intervalMs);

  return () => {
    window.clearInterval(intervalId);
  };
}
