export function haversineDistanceKm(pointA, pointB) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(pointB.lat - pointA.lat);
  const longitudeDelta = toRadians(pointB.lng - pointA.lng);
  const latitudeA = toRadians(pointA.lat);
  const latitudeB = toRadians(pointB.lat);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(longitudeDelta / 2) ** 2;

  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusKm * arc;
}

export function formatDistanceKm(distanceKm) {
  if (distanceKm === null || Number.isNaN(distanceKm)) {
    return 'N/A';
  }

  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`;
  }

  return `${Math.round(distanceKm)} km`;
}

export function formatTimestamp(timestamp) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

export function formatLatLng(point) {
  return `${point.lat.toFixed(3)}, ${point.lng.toFixed(3)}`;
}
