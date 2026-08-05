// Fallback fast food locations, used until the OpenStreetMap Overpass API
// responds (or if it fails and there's no cached real data yet). Real
// locations come from src/overpass.js; wait times come from crowdsourced
// user reports.

export const WAIT_LEVELS = {
  low: { label: "Short wait", color: "#2ecc71", minutes: "0-3 min" },
  medium: { label: "Moderate wait", color: "#f39c12", minutes: "4-8 min" },
  high: { label: "Long wait", color: "#e74c3c", minutes: "9+ min" },
  unknown: { label: "No reports yet", color: "#8e8e93", minutes: "—" },
};

// Sample locations around a generic downtown area (lat/lng are illustrative).
export const INITIAL_LOCATIONS = [
  {
    id: "ff-1",
    name: "Burger King - Main St",
    address: "123 Main St",
    lat: 40.7128,
    lng: -74.006,
    wait: "low",
    reports: 4,
    lastUpdated: Date.now() - 3 * 60 * 1000,
  },
  {
    id: "ff-2",
    name: "McDonald's - 5th Ave",
    address: "455 5th Ave",
    lat: 40.7484,
    lng: -73.9857,
    wait: "high",
    reports: 11,
    lastUpdated: Date.now() - 1 * 60 * 1000,
  },
  {
    id: "ff-3",
    name: "KFC - Riverside Dr",
    address: "88 Riverside Dr",
    lat: 40.7,
    lng: -74.017,
    wait: "medium",
    reports: 6,
    lastUpdated: Date.now() - 7 * 60 * 1000,
  },
  {
    id: "ff-4",
    name: "Taco Bell - Highway 9 Exit 4",
    address: "Highway 9, Exit 4",
    lat: 40.73,
    lng: -73.935,
    wait: "medium",
    reports: 3,
    lastUpdated: Date.now() - 12 * 60 * 1000,
  },
  {
    id: "ff-5",
    name: "Wendy's - Union Sq",
    address: "20 Union Sq E",
    lat: 40.7359,
    lng: -73.9911,
    wait: "low",
    reports: 2,
    lastUpdated: Date.now() - 2 * 60 * 1000,
  },
];

export function timeAgo(ts) {
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  return `${mins} min ago`;
}
