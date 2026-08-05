// Persists user-submitted wait reports across sessions, keyed by location id.

const STORAGE_KEY = "bk-queue-reports";

export function loadStoredReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredReport(id, report) {
  const all = loadStoredReports();
  all[id] = report;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // localStorage unavailable (private browsing, quota) — report still lives in memory
  }
}

// The last set of real locations successfully fetched from Overpass. Used as
// the fallback when a later fetch fails, so an outage shows stale-but-real
// nearby locations instead of jumping back to the hardcoded NYC sample set.
const LAST_GOOD_KEY = "bk-queue-last-good-locations";

export function loadLastGoodLocations() {
  try {
    const raw = localStorage.getItem(LAST_GOOD_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLastGoodLocations(locations) {
  try {
    localStorage.setItem(LAST_GOOD_KEY, JSON.stringify(locations));
  } catch {
    // localStorage unavailable — next failed fetch just falls back to sample data
  }
}
