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
