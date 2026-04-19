const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

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
  let url = `${API}/earthquakes?sort_by=time`;
  if (year != null) {
    url += `&year=${year}`;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch earthquakes');
  const data = await response.json();

  let items = data.items.map(mapEarthquake);

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

export async function getAllEarthquakes() {
  const url = `${API}/earthquakes?limit=20000&sort_by=time`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch all earthquakes');
  const data = await response.json();
  return data.items.map(mapEarthquake);
}

export async function getLocationHistory(locationId) {
  const response = await fetch(
    `${API}/earthquakes?place=${encodeURIComponent(locationId)}&sort_by=time`
  );
  if (!response.ok) throw new Error('Failed to fetch location history');
  const data = await response.json();

  return data.items.map(mapEarthquake).sort((a, b) => a.year - b.year);
}

export async function getLocationYearEvents(locationId, year) {
  let url = `${API}/earthquakes?place=${encodeURIComponent(locationId)}&sort_by=magnitude`;
  if (year != null) {
    url += `&year=${year}`;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch location events');
  const data = await response.json();

  return data.items
    .map(mapEarthquake)
    .sort((a, b) => b.mag - a.mag);
}

export function subscribeToEarthquakeFeed(_onEvent, _options = {}) {
  // No real-time feed from the backend yet
  return () => {};
}
