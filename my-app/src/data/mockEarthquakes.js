// 16 locations × 27 years (2000–2026) of seismic data
// Each location has unique seismic character: spread, bigChance, eventRange
const LOCATIONS = [
  { locationId: 'dtla', place: 'Downtown Los Angeles', lat: 34.0522, lng: -118.2437, baseMag: 3.8, spread: 1.8, bigChance: 0.08, eventRange: [12, 22] },
  { locationId: 'longbeach', place: 'Long Beach Shelf', lat: 33.7701, lng: -118.1937, baseMag: 2.2, spread: 0.8, bigChance: 0.02, eventRange: [8, 14] },
  { locationId: 'santaclarita', place: 'Santa Clarita Corridor', lat: 34.3917, lng: -118.5426, baseMag: 1.5, spread: 0.6, bigChance: 0.01, eventRange: [6, 10] },
  { locationId: 'sanbernardino', place: 'San Bernardino Valley', lat: 34.1083, lng: -117.2898, baseMag: 5.1, spread: 2.6, bigChance: 0.18, eventRange: [15, 30] },
  { locationId: 'ontario', place: 'Ontario Fault Line', lat: 34.0633, lng: -117.6509, baseMag: 2.5, spread: 1.0, bigChance: 0.03, eventRange: [8, 12] },
  { locationId: 'palmsprings', place: 'Palm Springs Basin', lat: 33.8303, lng: -116.5453, baseMag: 5.5, spread: 3.0, bigChance: 0.22, eventRange: [18, 35] },
  { locationId: 'temecula', place: 'Temecula Ridge', lat: 33.4936, lng: -117.1484, baseMag: 3.2, spread: 1.4, bigChance: 0.05, eventRange: [10, 18] },
  { locationId: 'sandiego', place: 'San Diego Coast', lat: 32.7157, lng: -117.1611, baseMag: 2.0, spread: 0.7, bigChance: 0.01, eventRange: [6, 12] },
  { locationId: 'oceanside', place: 'Oceanside Shelf', lat: 33.1959, lng: -117.3795, baseMag: 1.3, spread: 0.4, bigChance: 0.005, eventRange: [5, 8] },
  { locationId: 'riverside', place: 'Riverside Plain', lat: 33.9806, lng: -117.3755, baseMag: 4.2, spread: 2.0, bigChance: 0.10, eventRange: [12, 22] },
  { locationId: 'anaheim', place: 'Anaheim Hills', lat: 33.8366, lng: -117.9143, baseMag: 1.8, spread: 0.6, bigChance: 0.01, eventRange: [5, 10] },
  { locationId: 'ventura', place: 'Ventura Offshore', lat: 34.2746, lng: -119.229, baseMag: 4.8, spread: 2.4, bigChance: 0.14, eventRange: [14, 26] },
  { locationId: 'santabarbara', place: 'Santa Barbara Channel', lat: 34.4208, lng: -119.6982, baseMag: 2.8, spread: 1.2, bigChance: 0.04, eventRange: [8, 16] },
  { locationId: 'imperial', place: 'Imperial Valley North', lat: 32.8473, lng: -115.5694, baseMag: 5.3, spread: 2.8, bigChance: 0.20, eventRange: [16, 32] },
  { locationId: 'laguna', place: 'Laguna Niguel Rise', lat: 33.5225, lng: -117.7076, baseMag: 1.4, spread: 0.5, bigChance: 0.005, eventRange: [4, 8] },
  { locationId: 'pasadena', place: 'Pasadena Arc', lat: 34.1478, lng: -118.1445, baseMag: 3.5, spread: 1.6, bigChance: 0.07, eventRange: [10, 20] },
];

// Simple seeded pseudo-random number generator for reproducible data
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateAllEarthquakes() {
  const data = [];
  let id = 1;

  for (const loc of LOCATIONS) {
    const rng = seededRandom(
      loc.place.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 137
    );

    for (let year = 2000; year <= 2026; year++) {
      // Strong year-dependent drift: tectonic cycles unique per location
      const phase = loc.baseMag * 1.7 + loc.spread * 0.9;
      const yearFactor = Math.sin((year - 2000) * 0.45 + phase) * 1.2
        + Math.cos((year - 2000) * 0.2 + phase * 0.6) * 0.5;
      const effectiveBase = Math.max(0.8, loc.baseMag + yearFactor);

      // Event count also varies per year
      const [minEvents, maxEvents] = loc.eventRange;
      const yearEventShift = Math.floor(Math.sin((year - 2000) * 0.7 + phase) * 4);
      const eventCount = Math.max(minEvents, Math.min(maxEvents,
        minEvents + Math.floor(rng() * (maxEvents - minEvents + 1)) + yearEventShift));

      for (let e = 0; e < eventCount; e++) {
        const roll = rng();
        let mag;

        if (roll < loc.bigChance) {
          // Big event
          mag = +(5.0 + rng() * 2.5).toFixed(1);
        } else if (roll < loc.bigChance + 0.15) {
          // High cluster
          mag = +(effectiveBase + 0.5 + rng() * loc.spread * 1.2).toFixed(1);
        } else if (roll < loc.bigChance + 0.40) {
          // Near-base scatter — wider for high-spread locations
          mag = +(effectiveBase + (rng() - 0.5) * loc.spread * 2.0).toFixed(1);
        } else {
          // Low-magnitude background noise — centered lower for low-base locations
          mag = +(0.2 + rng() * Math.max(1.5, effectiveBase * 0.6)).toFixed(1);
        }
        mag = Math.max(0.2, Math.min(7.9, mag));

        const latJitter = (rng() - 0.5) * 0.06;
        const lngJitter = (rng() - 0.5) * 0.06;
        const month = Math.floor(rng() * 12);
        const day = 1 + Math.floor(rng() * 27);
        const hour = Math.floor(rng() * 24);
        const minute = Math.floor(rng() * 60);
        const timestamp = new Date(year, month, day, hour, minute).toISOString();

        data.push({
          id: id++,
          locationId: loc.locationId,
          place: loc.place,
          lat: +(loc.lat + latJitter).toFixed(4),
          lng: +(loc.lng + lngJitter).toFixed(4),
          mag,
          year,
          timestamp,
        });
      }
    }
  }

  return data;
}

export const allEarthquakes = generateAllEarthquakes();
export const LOCATIONS_LIST = LOCATIONS;

// Default export: only the latest year for backward compat
export const mockEarthquakes = allEarthquakes.filter((q) => q.year === 2026);
