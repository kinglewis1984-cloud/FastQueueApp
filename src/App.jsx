import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { INITIAL_LOCATIONS, WAIT_LEVELS, timeAgo } from "./data";
import { fetchBurgerKingLocations } from "./overpass";
import {
  loadStoredReports,
  saveStoredReport,
  loadLastGoodLocations,
  saveLastGoodLocations,
} from "./storage";
import { distanceKm, formatDistance } from "./geo";
import "./App.css";

const CENTER = [40.72, -73.99];
const DEFAULT_RADIUS_M = 8000;
const NEARBY_RADIUS_M = 6000;

function mergeWithStoredReports(rawLocations, storedReports) {
  return rawLocations.map((loc) => {
    const stored = storedReports[loc.id];
    if (stored) return { ...loc, ...stored };
    return {
      ...loc,
      wait: loc.wait ?? "unknown",
      reports: loc.reports ?? 0,
      lastUpdated: loc.lastUpdated ?? null,
    };
  });
}

function RecenterMap({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom ?? map.getZoom());
  }, [center, zoom, map]);
  return null;
}

function App() {
  const [locations, setLocations] = useState(() => {
    const cached = loadLastGoodLocations();
    const base = cached && cached.length > 0 ? cached : INITIAL_LOCATIONS;
    return mergeWithStoredReports(base, loadStoredReports());
  });
  const [selectedId, setSelectedId] = useState(() => {
    const cached = loadLastGoodLocations();
    return cached && cached.length > 0 ? cached[0].id : INITIAL_LOCATIONS[0].id;
  });
  const [mapCenter, setMapCenter] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState(null);
  const latestRequestId = useRef(0);

  const loadNearby = useCallback(async (lat, lng, radiusMeters) => {
    const requestId = ++latestRequestId.current;
    setLoading(true);
    setError(null);
    try {
      const results = await fetchBurgerKingLocations(lat, lng, radiusMeters);
      if (requestId !== latestRequestId.current) return; // superseded by a newer request
      if (results.length === 0) {
        setError("No Burger King locations found nearby.");
        return;
      }
      saveLastGoodLocations(results);
      const merged = mergeWithStoredReports(results, loadStoredReports());
      setLocations(merged);
      setSelectedId(merged[0].id);
    } catch {
      if (requestId !== latestRequestId.current) return;
      const cached = loadLastGoodLocations();
      if (cached && cached.length > 0) {
        setLocations(mergeWithStoredReports(cached, loadStoredReports()));
        setError("Couldn't reach OpenStreetMap — showing the last locations we found.");
      } else {
        setError("Couldn't reach OpenStreetMap — showing sample data instead.");
      }
    } finally {
      if (requestId === latestRequestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNearby(CENTER[0], CENTER[1], DEFAULT_RADIUS_M);
  }, [loadNearby]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation isn't supported in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserPos({ lat: latitude, lng: longitude });
        setMapCenter([latitude, longitude]);
        setLocating(false);
        loadNearby(latitude, longitude, NEARBY_RADIUS_M);
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location — check browser permissions.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function reportWait(id, level) {
    setLocations((prev) =>
      prev.map((loc) => {
        if (loc.id !== id) return loc;
        const updated = {
          ...loc,
          wait: level,
          reports: loc.reports + 1,
          lastUpdated: Date.now(),
        };
        saveStoredReport(id, {
          wait: updated.wait,
          reports: updated.reports,
          lastUpdated: updated.lastUpdated,
        });
        return updated;
      })
    );
  }

  const selected = locations.find((l) => l.id === selectedId) ?? locations[0];

  const sortedLocations = locations
    .map((loc) =>
      userPos ? { ...loc, distKm: distanceKm(userPos.lat, userPos.lng, loc.lat, loc.lng) } : loc
    )
    .sort((a, b) => (userPos ? a.distKm - b.distKm : a.name.localeCompare(b.name)));

  return (
    <div className="phone">
      <header className="app-header">
        <h1>Drive-Thru Watch</h1>
        <p className="subtitle">Live-ish Burger King wait times</p>
        <button className="locate-btn" onClick={useMyLocation} disabled={locating}>
          {locating ? "Locating…" : "📍 Use my location"}
        </button>
      </header>

      {error && <div className="banner banner-error">{error}</div>}
      {loading && <div className="banner banner-loading">Loading nearby locations…</div>}

      <div className="map-wrap">
        <MapContainer
          center={CENTER}
          zoom={12}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <RecenterMap center={mapCenter} zoom={13} />
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {userPos && (
            <CircleMarker
              center={[userPos.lat, userPos.lng]}
              radius={8}
              pathOptions={{ color: "#0a84ff", fillColor: "#0a84ff", fillOpacity: 0.9 }}
            >
              <Popup>You are here</Popup>
            </CircleMarker>
          )}
          {locations.map((loc) => (
            <CircleMarker
              key={loc.id}
              center={[loc.lat, loc.lng]}
              radius={10}
              pathOptions={{
                color: WAIT_LEVELS[loc.wait].color,
                fillColor: WAIT_LEVELS[loc.wait].color,
                fillOpacity: 0.85,
              }}
              eventHandlers={{ click: () => setSelectedId(loc.id) }}
            >
              <Popup>
                <strong>{loc.name}</strong>
                <br />
                {WAIT_LEVELS[loc.wait].label} ({WAIT_LEVELS[loc.wait].minutes})
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div className="list">
        {sortedLocations.map((loc) => (
          <button
            key={loc.id}
            className={`loc-card ${loc.id === selectedId ? "active" : ""}`}
            onClick={() => setSelectedId(loc.id)}
          >
            <div className="loc-info">
              <div className="loc-name">{loc.name}</div>
              <div className="loc-address">{loc.address}</div>
              <div className="loc-meta">
                {loc.reports} reports
                {loc.lastUpdated ? ` · updated ${timeAgo(loc.lastUpdated)}` : ""}
                {loc.distKm != null ? ` · ${formatDistance(loc.distKm)}` : ""}
              </div>
            </div>
            <div
              className="badge"
              style={{ backgroundColor: WAIT_LEVELS[loc.wait].color }}
            >
              {WAIT_LEVELS[loc.wait].minutes}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="report-bar">
          <div className="report-title">Report wait at {selected.name}</div>
          <div className="report-buttons">
            {Object.entries(WAIT_LEVELS)
              .filter(([key]) => key !== "unknown")
              .map(([key, level]) => (
                <button
                  key={key}
                  className="report-btn"
                  style={{ borderColor: level.color, color: level.color }}
                  onClick={() => reportWait(selected.id, key)}
                >
                  {level.label}
                </button>
              ))}
          </div>
        </div>
      )}

      <footer className="disclaimer">
        Locations from OpenStreetMap. Wait times are crowdsourced from reports
        made in this app.
      </footer>
    </div>
  );
}

export default App;
