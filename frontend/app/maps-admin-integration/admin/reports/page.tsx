"use client";

import { useState } from "react";
import RequireAdmin from "@/components/RequireAdmin";
import { KEYS } from "@/lib/seed";
import { loadList, saveList, useStoredList } from "@/lib/storage";
import type { ReportItem, ReportStatus } from "@/lib/types";

const NONE: ReportItem[] = []; // stable reference for the hook
const STATUSES: ReportStatus[] = ["open", "reviewing", "resolved", "dismissed"];

export default function AdminReports() {
  const reports = useStoredList<ReportItem>(KEYS.reports, NONE);
  const [filter, setFilter] = useState<"all" | ReportStatus>("all");

  function update(id: string, patch: Partial<ReportItem>) {
    saveList(KEYS.reports, loadList<ReportItem>(KEYS.reports, NONE).map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  const shown = [...reports]
    .filter((r) => filter === "all" || r.status === filter)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <RequireAdmin>
      <h1 style={{ fontSize: 26, fontWeight: 700 }}>Passenger reports</h1>
      <label style={{ display: "block", margin: "12px 0" }}>
        Show:{" "}
        <select value={filter} onChange={(e) => setFilter(e.target.value as "all" | ReportStatus)}>
          <option value="all">All ({reports.length})</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      {shown.length === 0 && <p>No reports to show.</p>}
      <div style={{ display: "grid", gap: 12 }}>
        {shown.map((r) => (
          <article key={r.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
            <strong>{r.type}: {r.itemName}</strong>
            <p>{r.description}</p>
            <small>{r.location ? `Location: ${r.location} · ` : ""}{new Date(r.createdAt).toLocaleString()}</small>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <select value={r.status} onChange={(e) => update(r.id, { status: e.target.value as ReportStatus })}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <input
                className="booking-input"
                placeholder="Admin note (saved when you leave the box)"
                defaultValue={r.adminNote}
                onBlur={(e) => e.target.value !== r.adminNote && update(r.id, { adminNote: e.target.value })}
              />
              <button className="text-action" onClick={() => confirm("Delete this report?") && saveList(KEYS.reports, loadList<ReportItem>(KEYS.reports, NONE).filter((x) => x.id !== r.id))}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </RequireAdmin>
  );
}