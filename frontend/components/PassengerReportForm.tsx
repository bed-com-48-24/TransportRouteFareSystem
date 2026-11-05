"use client";

import { useEffect, useState, type FormEvent } from "react";
import { readPassengerSession } from "@/lib/passenger-auth";
import { KEYS } from "@/lib/seed";
import { loadList, newId, saveList, useStoredList } from "@/lib/storage";
import type { ReportItem, ReportStatus } from "@/lib/types";

const EMPTY_REPORTS: ReportItem[] = [];

const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  open: "Awaiting review",
  reviewing: "Being considered",
  resolved: "Resolved",
  dismissed: "Closed",
};

const REPORT_STATUS_MESSAGES: Record<ReportStatus, string> = {
  open: "Your report has been received and is waiting for staff review.",
  reviewing: "Staff are considering your report.",
  resolved: "Staff marked this report as resolved.",
  dismissed: "Staff closed this report without further action.",
};

export default function PassengerReportForm() {
  const reports = useStoredList<ReportItem>(KEYS.reports, EMPTY_REPORTS);
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [reportType, setReportType] = useState<ReportItem["type"]>("Route");
  const [itemName, setItemName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const matchingReports = reports
    .filter((report) => report.reporterEmail?.trim().toLowerCase() === reporterEmail.trim().toLowerCase())
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));

  useEffect(() => {
    try {
      const session = readPassengerSession();
      if (session) {
        setReporterName(session.fullName);
        setReporterEmail(session.email);
      }
    } catch (reason) {
      setFeedback({
        kind: "error",
        message: reason instanceof Error ? reason.message : "Your passenger details could not be loaded.",
      });
    }
  }, []);

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    if (reporterName.trim().length < 2 || itemName.trim().length < 2 || description.trim().length < 10) {
      setFeedback({ kind: "error", message: "Enter your name, the route or stop name, and at least 10 characters describing the issue." });
      return;
    }

    const report: ReportItem = {
      id: newId("report"),
      reporterName: reporterName.trim(),
      reporterEmail: reporterEmail.trim(),
      type: reportType,
      itemName: itemName.trim(),
      description: description.trim(),
      location: location.trim(),
      status: "open",
      adminNote: "",
      createdAt: new Date().toISOString(),
    };

    try {
      saveList(KEYS.reports, [...loadList<ReportItem>(KEYS.reports, []), report]);
      setItemName("");
      setLocation("");
      setDescription("");
      setFeedback({
        kind: "success",
        message: `Report ${report.id.toUpperCase()} submitted. You can check its status and staff updates below.`,
      });
    } catch {
      setFeedback({ kind: "error", message: "Your report could not be saved on this device. Please try again." });
    }
  }

  return (
    <>
      <form className="module-form narrow-form" onSubmit={submitReport}>
        <label>Your name<input autoComplete="name" minLength={2} maxLength={100} value={reporterName} onChange={(event) => setReporterName(event.target.value)} required /></label>
        <label>Email address<input type="email" autoComplete="email" maxLength={254} value={reporterEmail} onChange={(event) => setReporterEmail(event.target.value)} required /></label>
        <label>What needs attention?
          <select value={reportType} onChange={(event) => setReportType(event.target.value as ReportItem["type"])}>
            <option value="Route">Route</option><option value="Fare">Fare</option><option value="Stop">Pickup or drop-off point</option><option value="Other">Other</option>
          </select>
        </label>
        <label>Route, fare, or stop name<input maxLength={120} value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="e.g. Blantyre to Zomba" required /></label>
        <label>Town or area <span className="optional-label">Optional</span><input maxLength={100} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Where did you see the issue?" /></label>
        <label>Describe the issue<textarea minLength={10} maxLength={1000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explain what is wrong or what has changed…" required /></label>
        <button className="primary-button form-submit" type="submit">Submit report</button>
      </form>
      {feedback && (
        <p className={`module-feedback ${feedback.kind}`} role={feedback.kind === "error" ? "alert" : "status"}>
          {feedback.message}
        </p>
      )}
      <section className="report-updates" aria-labelledby="report-updates-heading" aria-live="polite">
        <div>
          <p className="module-eyebrow">YOUR UPDATES</p>
          <h3 id="report-updates-heading">Report status and staff updates</h3>
          <p className="module-copy">
            Enter the same email address used for your report to see its current status and any staff note.
            Updates are saved in this browser. These are on-page demo notifications only; no email is sent.
          </p>
        </div>
        {!reporterEmail.trim() ? (
          <p className="module-empty">Enter your email address above to check for report updates.</p>
        ) : matchingReports.length === 0 ? (
          <p className="module-empty">No reports were found for this email address in this browser.</p>
        ) : (
          <div className="report-update-list">
            {matchingReports.map((report) => (
              <article className="report-update-card" key={report.id}>
                <div className="report-update-heading">
                  <div>
                    <strong>{report.type}: {report.itemName}</strong>
                    <small>Reference: {report.id.toUpperCase()} · Submitted {new Date(report.createdAt).toLocaleDateString()}</small>
                  </div>
                  <span className={`report-status-badge is-${report.status}`}>
                    {REPORT_STATUS_LABELS[report.status]}
                  </span>
                </div>
                <p>{REPORT_STATUS_MESSAGES[report.status]}</p>
                {report.adminNote.trim() && (
                  <div className="report-staff-note">
                    <strong>Staff update</strong>
                    <p>{report.adminNote}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
