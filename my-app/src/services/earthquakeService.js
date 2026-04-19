const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';

function mapEarthquake(item) {
  return {
    id: item.id,
    source: item.source || null,
    locationId: item.place || `${item.lat},${item.lon}`,
    place: item.place || item.original_place || 'Unknown',
    originalPlace: item.original_place || item.place || 'Unknown',
    lat: item.lat,
    lng: item.lon,
    mag: item.mag,
    depth: item.depth,
    vs30: item.vs30 || null,
    siteClass: item.site_class || null,
    mmi: item.mmi || null,
    sig: item.sig || null,
    year: item.time ? new Date(item.time).getFullYear() : null,
    timestamp: item.time,
  };
}

export async function getEarthquakes(year) {
  const response = await fetch(
    `${API_BASE}${API_PREFIX}/earthquakes?limit=500&sort_by=time`
  );
  if (!response.ok) throw new Error('Failed to fetch earthquakes');
  const data = await response.json();

  let items = data.items.map(mapEarthquake);

  if (year != null) {
    items = items.filter((q) => q.year === year);
  }

  // Group by location, pick strongest event per location
  const byLocation = new Map();
  for (const q of items) {
    if (q.mag == null) continue;
    const existing = byLocation.get(q.locationId);
    if (!existing || q.mag > existing.mag) {
      byLocation.set(q.locationId, q);
    }
  }

  const locations = [...byLocation.values()].sort(
    (left, right) => new Date(right.timestamp) - new Date(left.timestamp)
  );

  return { locations, totalCount: items.filter((q) => q.mag != null).length };
}

export async function getLocationHistory(locationId) {
  const response = await fetch(
    `${API_BASE}${API_PREFIX}/earthquakes?limit=500&place=${encodeURIComponent(locationId)}&sort_by=time`
  );
  if (!response.ok) throw new Error('Failed to fetch location history');
  const data = await response.json();

  return data.items.map(mapEarthquake).sort((a, b) => a.year - b.year);
}

export async function getLocationYearEvents(locationId, year) {
  const response = await fetch(
    `${API_BASE}${API_PREFIX}/earthquakes?limit=500&place=${encodeURIComponent(locationId)}&sort_by=magnitude`
  );
  if (!response.ok) throw new Error('Failed to fetch location events');
  const data = await response.json();

  return data.items
    .map(mapEarthquake)
    .filter((q) => q.year === year)
    .sort((a, b) => b.mag - a.mag);
}

export function subscribeToEarthquakeFeed(_onEvent, _options = {}) {
  // No real-time feed from the backend yet
  return () => {};
}
