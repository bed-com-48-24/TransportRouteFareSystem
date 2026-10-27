"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { distanceKm, hasCoords } from "@/lib/geo";
import { KEYS, SEED_STOPS } from "@/lib/seed";
import { useStoredList } from "@/lib/storage";
import type { StopItem } from "@/lib/types";

const CITIES: Record<string, [number, number]> = {
  Blantyre: [-15.7861, 35.0058],
  Limbe: [-15.8103, 35.0586],
  Zomba: [-15.3833, 35.3188],
  Lilongwe: [-13.9626, 33.7741],
  Mzuzu: [-11.4656, 34.0207],
  Salima: [-13.7804, 34.4587],
};
const RADIUS_KM = 15;

export default function NearbyPage() {
  const stops = useStoredList<StopItem>(KEYS.stops, SEED_STOPS);
  const [user, setUser] = useState<[number, number] | null>(null);
  const [city, setCity] = useState("Blantyre");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const origin: [number, number] = user ?? CITIES[city];

  function locate() {
    setNotice("");
    if (!("geolocation" in navigator)) {
      setNotice("Location is not supported by this browser. Choose your area below.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUser([pos.coords.latitude, pos.coords.longitude]);
        setBusy(false);
      },
      (err) => {
        setBusy(false);
        setUser(null);
        setNotice(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied. Showing stops near the area you choose."
            : "We could not get your location. Showing stops near the area you choose.",
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }

  const { nearby, unlocated } = useMemo(() => {
    const located = stops
      .filter(hasCoords)
      .map((s) => ({ ...s, km: distanceKm(origin[0], origin[1], s.lat, s.lng) }))
      .sort((a, b) => a.km - b.km);
    return {
      nearby: located.filter((s) => s.km <= RADIUS_KM),
      unlocated: stops.filter((s) => !hasCoords(s)),
    };
  }, [stops, origin]);

  return (
    <main className="nearby-page">
      <Link href="/" className="nearby-back">← Passenger home</Link>
      <p className="admin-kicker">LOCAL TRAVEL</p>
      <h1 className="admin-title">Nearby pickup and drop-off points</h1>
      <p className="admin-description">Find stops near your current location or choose a town to explore.</p>

      <div className="nearby-controls">
        <button type="button" onClick={locate} disabled={busy} className="mode-toggle">
          {busy ? "Locating…" : "Use my location"}
        </button>
        <label className="nearby-city-label">
          Choose a town
          <select
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setUser(null);
            }}
          >
            {Object.keys(CITIES).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      {notice && <p role="alert" className="nearby-alert">{notice}</p>}

      <p className="nearby-note">
        Showing stops within {RADIUS_KM} km of {user ? "your current location" : city}. Distances use the stop coordinates on file.
      </p>

      <h2 className="nearby-heading">
        Within {RADIUS_KM} km ({nearby.length})
      </h2>
      {nearby.length === 0 ? (
        <p>No known stops within {RADIUS_KM} km. Try another area.</p>
      ) : (
        <ul className="nearby-list">
          {nearby.map((s) => (
            <li key={s.id} className="nearby-item">
              <strong>{s.name}</strong> — {s.kind === "pickup" ? "Pickup" : "Drop-off"} · {s.city} ·{" "}
              {s.km.toFixed(1)} km
            </li>
          ))}
        </ul>
      )}

      {unlocated.length > 0 && (
        <>
          <h2 className="nearby-heading">Location not available</h2>
          <ul className="nearby-list">
            {unlocated.map((s) => (
              <li key={s.id}>{s.name} ({s.city}) — map location not recorded yet</li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
