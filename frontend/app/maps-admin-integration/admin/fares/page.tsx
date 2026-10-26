"use client";

import { useState, type FormEvent } from "react";
import RequireAdmin from "@/components/RequireAdmin";
import { KEYS, SEED_FARES, SEED_ROUTES } from "@/lib/seed";
import { loadList, newId, saveList, useStoredList } from "@/lib/storage";
import type { FareItem, RouteItem } from "@/lib/types";

export default function AdminFares() {
  const routes = useStoredList<RouteItem>(KEYS.routes, SEED_ROUTES);
  const fares = useStoredList<FareItem>(KEYS.fares, SEED_FARES);
  const [routeId, setRouteId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  const label = (id: string) => {
    const r = routes.find((x) => x.id === id);
    return r ? `${r.origin} → ${r.destination} (${r.service})` : "Unknown route";
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    const chosen = routeId || routes[0]?.id;
    if (!chosen) return setError("Add a route first.");
    if (!Number.isFinite(value) || value <= 0) return setError("Fare must be a number greater than 0.");
    const current = loadList<FareItem>(KEYS.fares, SEED_FARES);
    const existing = current.find((f) => f.routeId === chosen);
    saveList(
      KEYS.fares,
      existing
        ? current.map((f) => (f.id === existing.id ? { ...f, amount: value } : f))
        : [...current, { id: newId("f"), routeId: chosen, amount: value }],
    );
    setAmount("");
    setError("");
  }

  return (
    <RequireAdmin>
      <h1 style={{ fontSize: 26, fontWeight: 700 }}>Manage estimated fares</h1>
      <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
        <select className="booking-input" value={routeId || routes[0]?.id || ""} onChange={(e) => setRouteId(e.target.value)}>
          {routes.map((r) => <option key={r.id} value={r.id}>{label(r.id)}</option>)}
        </select>
        <input className="booking-input" inputMode="numeric" placeholder="Fare in MWK" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button className="confirm-button" type="submit">Set fare</button>
      </form>
      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th align="left">Route</th><th align="right">Estimated fare</th><th /></tr></thead>
        <tbody>
          {fares.map((f) => (
            <tr key={f.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{label(f.routeId)}</td>
              <td align="right">MWK {f.amount.toLocaleString()}</td>
              <td align="right">
                <button className="text-action" onClick={() => confirm("Remove this fare?") && saveList(KEYS.fares, loadList<FareItem>(KEYS.fares, SEED_FARES).filter((x) => x.id !== f.id))}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: 12, fontSize: 13 }}>Fares are estimates and may differ from what an operator charges.</p>
    </RequireAdmin>
  );
}
