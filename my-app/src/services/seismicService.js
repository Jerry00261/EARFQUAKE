const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

export async function fetchSeismicEarthquakes() {
  const response = await fetch(
    `${API}/earthquakes?limit=5000&min_magnitude=3.0&sort_by=time`
  );
  if (!response.ok) throw new Error('Failed to fetch seismic earthquakes');
  const data = await response.json();
  return data.items.map((item) => ({
    id: item.id,
    lat: item.lat,
    lon: item.lon,
    mag: item.mag,
    depth: item.depth,
    time: item.time,
    place: item.place || item.original_place || 'Unknown',
    vs30: item.vs30,
    siteClass: item.site_class,
  }));
}

export async function fetchHeatmap() {
  const response = await fetch(`${API}/ml/heatmap`);
  if (!response.ok) throw new Error('Failed to fetch heatmap');
  const data = await response.json();
  return data.points;
}

export async function fetchPrediction(lat, lon) {
  const response = await fetch(
    `${API}/ml/predict?lat=${lat}&lon=${lon}`
  );
  if (!response.ok) throw new Error('Failed to fetch prediction');
  return response.json();
}

export async function fetchSeismogram(sourceLat, sourceLon, vs30, pgaG) {
  const response = await fetch(
    `${API}/ml/seismogram?source_lat=${sourceLat}&source_lon=${sourceLon}&vs30=${vs30}&pga_g=${pgaG}`
  );
  if (!response.ok) throw new Error('Failed to fetch seismogram');
  return response.json();
}
