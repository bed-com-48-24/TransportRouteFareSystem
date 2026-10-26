"use client";

import { useState, type FormEvent } from "react";
import RequireAdmin from "@/components/RequireAdmin";
import { hasCoords } from "@/lib/geo";
import { KEYS, SEED_STOPS } from "@/lib/seed";
import { loadList, newId, saveList, useStoredList } from "@/lib/storage";
import type { StopItem, StopKind } from "@/lib/types";

const empty = { name: "", kind: "pickup" as StopKind, city: "", lat: "", lng: "" };

export default function AdminStops() {
  const stops = useStoredList<StopItem>(KEYS.stops, SEED_STOPS);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.city.trim()) return setError("Name and city are required.");
    // coordinates are optional, but if given they must be valid
    const lat = form.lat.trim() === "" ? null : Number(form.lat);
    const lng = form.lng.trim() === "" ? null : Number(form.lng);
    if ((lat === null) !== (lng === null)) return setError("Enter both latitude and longitude, or leave both empty.");
    const candidate = { lat, lng };
    if (lat !== null && !hasCoords(candidate)) return setError("Latitude must be -90..90 and longitude -180..180.");
    const item = { name: form.name.trim(), kind: form.kind, city: form.city.trim(), lat, lng };
    const current = loadList<StopItem>(KEYS.stops, SEED_STOPS);
    saveList(
      KEYS.stops,
      editingId
        ? current.map((s) => (s.id === editingId ? { ...s, ...item } : s))
        : [...current, { id: newId("s"), ...item }],
    );
    setForm(empty);
    setEditingId(null);
    setError("");
  }

  return (
    <RequireAdmin>
      <h1 style={{ fontSize: 26, fontWeight: 700 }}>Manage pickup and drop-off stops</h1>
      <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
        <input className="booking-input" placeholder="Stop name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <select className="booking-input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as StopKind })}>
          <option value="pickup">Pickup</option>
          <option value="dropoff">Drop-off</option>
        </select>
        <input className="booking-input" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <input className="booking-input" placeholder="Latitude (optional)" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
        <input className="booking-input" placeholder="Longitude (optional)" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
        <button className="confirm-button" type="submit">{editingId ? "Save changes" : "Add stop"}</button>
      </form>
      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th align="left">Name</th><th align="left">Type</th><th align="left">City</th><th align="left">Coordinates</th><th /></tr></thead>
        <tbody>
          {stops.map((s) => (
            <tr key={s.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{s.name}</td><td>{s.kind}</td><td>{s.city}</td>
              <td>{hasCoords(s) ? `${s.lat}, ${s.lng}` : "not set"}</td>
              <td align="right">
                <button className="text-action" onClick={() => { setEditingId(s.id); setForm({ name: s.name, kind: s.kind, city: s.city, lat: s.lat?.toString() ?? "", lng: s.lng?.toString() ?? "" }); }}>Edit</button>{" "}
                <button className="text-action" onClick={() => confirm("Delete this stop?") && saveList(KEYS.stops, loadList<StopItem>(KEYS.stops, SEED_STOPS).filter((x) => x.id !== s.id))}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </RequireAdmin>
  );
}
