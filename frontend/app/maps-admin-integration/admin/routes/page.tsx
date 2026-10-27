"use client";

import { useState, type FormEvent } from "react";
import RequireAdmin from "@/components/RequireAdmin";
import { KEYS, SEED_FARES, SEED_ROUTES } from "@/lib/seed";
import { loadList, newId, saveList, useStoredList } from "@/lib/storage";
import type { FareItem, RouteItem } from "@/lib/types";

const empty = { origin: "", destination: "", service: "Minibus" };

export default function AdminRoutes() {
  const routes = useStoredList<RouteItem>(KEYS.routes, SEED_ROUTES);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const origin = form.origin.trim();
    const destination = form.destination.trim();
    if (!origin || !destination) return setError("Origin and destination are required.");
    if (origin.toLowerCase() === destination.toLowerCase()) return setError("Origin and destination must differ.");
    const current = loadList<RouteItem>(KEYS.routes, SEED_ROUTES);
    const dup = current.some(
      (r) =>
        r.id !== editingId &&
        r.origin.toLowerCase() === origin.toLowerCase() &&
        r.destination.toLowerCase() === destination.toLowerCase() &&
        r.service === form.service,
    );
    if (dup) return setError("That route already exists.");
    const next = editingId
      ? current.map((r) => (r.id === editingId ? { ...r, origin, destination, service: form.service } : r))
      : [...current, { id: newId("r"), origin, destination, service: form.service }];
    saveList(KEYS.routes, next);
    setForm(empty);
    setEditingId(null);
    setError("");
  }

  function remove(id: string) {
    if (!confirm("Delete this route and its fare?")) return;
    saveList(KEYS.routes, loadList<RouteItem>(KEYS.routes, SEED_ROUTES).filter((r) => r.id !== id));
    // keep data consistent: remove the route's fares too
    saveList(KEYS.fares, loadList<FareItem>(KEYS.fares, SEED_FARES).filter((f) => f.routeId !== id));
  }

  return (
    <RequireAdmin>
      <section className="admin-content">
      <p className="admin-kicker">NETWORK INFORMATION</p>
      <h1 className="admin-title">Manage routes</h1>
      <p className="admin-description">Add and maintain the routes passengers can find in journey search.</p>
      <form className="admin-form" onSubmit={submit}>
        <input className="booking-input" placeholder="Origin" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} />
        <input className="booking-input" placeholder="Destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
        <select className="booking-input" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
          <option>Minibus</option>
          <option>Intercity coach</option>
          <option>Bus</option>
        </select>
        <button className="confirm-button" type="submit">{editingId ? "Save changes" : "Add route"}</button>
        {editingId && <button type="button" className="text-action" onClick={() => { setEditingId(null); setForm(empty); }}>Cancel</button>}
      </form>
      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
      <div className="admin-table-wrap"><table className="admin-table" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th align="left">Origin</th><th align="left">Destination</th><th align="left">Service</th><th /></tr></thead>
        <tbody>
          {routes.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{r.origin}</td><td>{r.destination}</td><td>{r.service}</td>
              <td align="right">
                <button className="text-action" onClick={() => { setEditingId(r.id); setForm({ origin: r.origin, destination: r.destination, service: r.service }); }}>Edit</button>{" "}
                <button className="text-action" onClick={() => remove(r.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {routes.length === 0 && <p>No routes yet.</p>}
      </section>
    </RequireAdmin>
  );
}
