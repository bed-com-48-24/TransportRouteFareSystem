"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { KEYS } from "@/lib/seed";
import { loadList, newId, saveList } from "@/lib/storage";
import type { ReportItem } from "@/lib/types";

export default function ReportPage() {
  const [reportType, setReportType] = useState("Route");
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  
    if (!reportType || !itemName.trim() || !description.trim()) {
      setMessage("Please fill in all required fields.");
      return;
    }
    const reports = loadList<ReportItem>(KEYS.reports, []);
    const report: ReportItem = {
      id: newId("report"),
      type: reportType as ReportItem["type"],
      itemName: itemName.trim(),
      description: description.trim(),
      location: location.trim(),
      status: "open",
      adminNote: "",
      createdAt: new Date().toISOString(),
    };
    saveList(KEYS.reports, [...reports, report]);
    setMessage("Thank you. Your report has been saved for review.");
    setItemName("");
    setDescription("");
    setLocation("");

  }

  return (
    <main className="account-page">
      <section className="account-card report-card" aria-labelledby="report-title">
        <Link href="/" className="account-back">← Back to SBUS</Link>
        <p className="account-kicker">HELP KEEP INFORMATION CURRENT</p>
        <h1 id="report-title">Report an issue</h1>
        <p className="account-description">Tell us if a route, fare, or stop may be inaccurate or out of date. Passenger reports are reviewed by the transport information team.</p>

        <form className="account-form" onSubmit={handleSubmit}>
          <label htmlFor="reportType">What needs an update?</label>
          <select id="reportType" value={reportType} onChange={(event) => setReportType(event.target.value)} required>
            <option value="Route">Route information</option>
            <option value="Fare">Fare estimate</option>
            <option value="Stop">Pickup or drop-off point</option>
            <option value="Other">Other information</option>
          </select>

          <label htmlFor="itemName">Route, fare, or stop</label>
          <input id="itemName" type="text" value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="For example, Blantyre to Limbe" required />

          <label htmlFor="location">Town or location <span className="account-optional">Optional</span></label>
          <input id="location" type="text" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Where did you notice the issue?" />

          <label htmlFor="description">What should we know?</label>
          <textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe what looks incorrect or outdated..." rows={5} minLength={10} required />

          <button className="account-submit" type="submit">Submit report <span aria-hidden="true">→</span></button>
          {message && <p className="account-message" role="status">{message}</p>}
        </form>
        <p className="account-footnote">Reports are saved in this browser for this prototype. Please confirm current fares with the operator.</p>
      </section>
    </main>
  );
}
