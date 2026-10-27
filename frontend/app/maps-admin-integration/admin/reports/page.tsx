"use client";

import Link from "next/link";
import RequireAdmin from "@/components/RequireAdmin";
import { KEYS } from "@/lib/seed";
import { loadList, saveList, useStoredList } from "@/lib/storage";
import type { ReportItem, ReportStatus } from "@/lib/types";

const statuses: ReportStatus[] = ["open", "reviewing", "resolved", "dismissed"];

export default function AdminReportsPage() {
  const reports = useStoredList<ReportItem>(KEYS.reports, []);

  function updateStatus(id: string, status: ReportStatus) {
    const latest = loadList<ReportItem>(KEYS.reports, []);
    saveList(KEYS.reports, latest.map((report) => report.id === id ? { ...report, status } : report));
  }

  return (
    <RequireAdmin>
      <section className="admin-content">
        <Link href="/maps-admin-integration" className="nearby-back">← Administration</Link>
        <p className="admin-kicker">PASSENGER FEEDBACK</p>
        <h1 className="admin-title">Information reports</h1>
        <p className="admin-description">Review and update passenger reports saved in this browser.</p>
      {reports.length === 0 ? (
        <p className="admin-empty">No passenger reports have been submitted yet.</p>
      ) : (
        <ul className="admin-report-list">
          {[...reports].reverse().map((report) => (
            <li key={report.id}>
              <div className="admin-report-main">
                <div>
                  <p className="admin-report-meta">{report.type} · {new Date(report.createdAt).toLocaleDateString()}</p>
                  <h2>{report.itemName}</h2>
                  {report.location && <p className="admin-report-location">Location: {report.location}</p>}
                  <p className="admin-report-description">{report.description}</p>
                </div>
                <label className="admin-status-label">
                  Review status
                  <select className="booking-input" value={report.status} onChange={(event) => updateStatus(report.id, event.target.value as ReportStatus)}>
                    {statuses.map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}
                  </select>
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="admin-footnote">Prototype reports are stored in this browser. Production review requires shared server storage.</p>
      </section>
    </RequireAdmin>
  );
}
