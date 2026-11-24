"use client";

import { useEffect, useState, type FormEvent } from "react";
import { readPassengerSession } from "@/lib/passenger-auth";
import { KEYS, MOCK_REPORTS } from "@/lib/seed";
import { loadList, newId, saveList } from "@/lib/storage";
import type { ReportItem } from "@/lib/types";
import { notifyReportUpdate } from "@/lib/notifications";

export default function PassengerReportForm() {
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [reportType, setReportType] = useState<ReportItem["type"]>("Route");
  const [itemName, setItemName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const passenger = readPassengerSession();
        if (passenger) {
          setReporterName(passenger.fullName);
          setReporterEmail(passenger.email);
        }
      } catch {
        // Reporting remains available to guests as a browser-only demo.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    if (reporterName.trim().length < 2 || itemName.trim().length < 2 || description.trim().length < 10) {
      setFeedback("Enter your name, the route or stop name, and at least 10 characters describing the issue.");
      return;
    }
    const report: ReportItem = {
      id: newId("demo-report"),
      reporterName: reporterName.trim(),
      reporterEmail: reporterEmail.trim().toLowerCase(),
      type: reportType,
      itemName: itemName.trim(),
      description: description.trim(),
      location: location.trim(),
      status: "open",
      adminNote: "",
      createdAt: new Date().toISOString(),
    };
    try {
      saveList(KEYS.reports, [report, ...loadList<ReportItem>(KEYS.reports, MOCK_REPORTS)]);
      notifyReportUpdate("Your report was received and is awaiting company review.", report.id, report.reporterEmail);
      setItemName("");
      setLocation("");
      setDescription("");
      setFeedback(`Report ${report.id.toUpperCase()} saved.`);
    } catch {
      setFeedback("The report could not be saved. Please try again.");
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
        <label>Describe the issue<textarea className="report-description" minLength={10} maxLength={1000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} required /></label>
        <button className="primary-button form-submit" type="submit">Report</button>
      </form>
      {feedback && <p className="module-feedback" role="status">{feedback}</p>}
    </>
  );
}
