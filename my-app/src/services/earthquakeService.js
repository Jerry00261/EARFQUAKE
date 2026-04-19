import { allEarthquakes, mockEarthquakes } from '../data/mockEarthquakes';

let nextEarthquakeId = allEarthquakes.length + 1;

const HOTSPOTS = [
  { locationId: 'dtla', place: 'Downtown Los Angeles', lat: 34.0522, lng: -118.2437 },
  { locationId: 'longbeach', place: 'Long Beach Shelf', lat: 33.7701, lng: -118.1937 },
  { locationId: 'sanbernardino', place: 'San Bernardino Valley', lat: 34.1083, lng: -117.2898 },
  { locationId: 'palmsprings', place: 'Palm Springs Basin', lat: 33.8303, lng: -116.5453 },
  { locationId: 'riverside', place: 'Riverside Plain', lat: 33.9806, lng: -117.3755 },
  { locationId: 'ventura', place: 'Ventura Offshore', lat: 34.2746, lng: -119.229 },
  { locationId: 'imperial', place: 'Imperial Valley North', lat: 32.8473, lng: -115.5694 },
  { locationId: 'pasadena', place: 'Pasadena Arc', lat: 34.1478, lng: -118.1445 },
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
    locationId: hotspot.locationId,
    place: hotspot.place,
    lat: round(hotspot.lat + latOffset),
    lng: round(hotspot.lng + lngOffset),
    mag: round(magnitude, 1),
    year: new Date().getFullYear(),
    timestamp: new Date().toISOString(),
  };
}

export async function getEarthquakes(year) {
  await delay(180);
  const source = year != null
    ? allEarthquakes.filter((q) => q.year === year)
    : mockEarthquakes;

  // Group by location, pick strongest event per location
  const byLocation = new Map();
  for (const q of source) {
    const existing = byLocation.get(q.locationId);
    if (!existing || q.mag > existing.mag) {
      byLocation.set(q.locationId, q);
    }
  }

  return [...byLocation.values()].sort(
    (left, right) => new Date(right.timestamp) - new Date(left.timestamp)
  );
}

export function getLocationHistory(locationId) {
  return allEarthquakes
    .filter((q) => q.locationId === locationId)
    .sort((a, b) => a.year - b.year);
}

export function getLocationYearEvents(locationId, year) {
  return allEarthquakes
    .filter((q) => q.locationId === locationId && q.year === year)
    .sort((a, b) => b.mag - a.mag);
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
