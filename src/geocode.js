// Turns a free-text location (address, city, postcode, landmark) into
// coordinates using OpenStreetMap's Nominatim search API. Free, no API key.

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function geocodeAddress(query) {
  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Geocoding request failed: ${res.status}`);
  }

  const results = await res.json();
  if (results.length === 0) {
    throw new Error("No matching location found");
  }

  const { lat, lon, display_name } = results[0];
  return { lat: parseFloat(lat), lng: parseFloat(lon), label: display_name };
}
