// Fetches real fast food restaurant locations from the OpenStreetMap
// Overpass API. Free, no API key required. https://overpass-api.de

// The public Overpass network gets overloaded often enough that trying one
// endpoint at a time isn't reliable. Race several full-planet mirrors in
// parallel instead and use whichever answers first.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RESULTS = 60;

function buildQuery(lat, lng, radiusMeters) {
  return `[out:json][timeout:25];
(
  nwr["amenity"="fast_food"](around:${radiusMeters},${lat},${lng});
);
out center tags;`;
}

function formatAddress(tags) {
  const streetParts = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean);
  if (streetParts.length) return streetParts.join(" ");
  if (tags["addr:full"]) return tags["addr:full"];
  if (tags["addr:city"]) return tags["addr:city"];
  return "Address unavailable";
}

function toLocation(element) {
  const coords =
    element.type === "node"
      ? { lat: element.lat, lng: element.lon }
      : element.center
        ? { lat: element.center.lat, lng: element.center.lon }
        : null;
  if (!coords) return null;

  const tags = element.tags || {};
  return {
    id: `osm-${element.type}-${element.id}`,
    name: tags.name || tags.brand || "Fast Food Restaurant",
    address: formatAddress(tags),
    lat: coords.lat,
    lng: coords.lng,
  };
}

// OSM sometimes maps the same restaurant as both a node and a way (e.g. a
// POI point plus the building outline) — collapse near-duplicates so they
// don't render as two markers for one location.
function dedupeByCoords(locations) {
  const seen = new Set();
  return locations.filter((loc) => {
    const key = `${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function queryEndpoint(url, query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Overpass request failed: ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchFastFoodLocations(lat, lng, radiusMeters = 8000) {
  const query = buildQuery(lat, lng, radiusMeters);
  let data;
  try {
    data = await Promise.any(OVERPASS_ENDPOINTS.map((url) => queryEndpoint(url, query)));
  } catch (aggregateError) {
    throw aggregateError.errors?.[0] ?? aggregateError;
  }
  const locations = data.elements.map(toLocation).filter(Boolean);
  return dedupeByCoords(locations).slice(0, MAX_RESULTS);
}
