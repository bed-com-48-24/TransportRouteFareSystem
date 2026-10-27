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
    setMessage("Report submitted.");
    setItemName("");
    setDescription("");
    setLocation("");

  }

  return (
    <main className="account-page">
      <section className="account-card report-card" aria-labelledby="report-title">
        <Link href="/" className="account-back">← Home</Link>
        <h1 id="report-title">Report an issue</h1>
        <p className="account-description">Report incorrect route, fare, or stop details.</p>

        <form className="account-form" onSubmit={handleSubmit}>
          <label htmlFor="reportType">Issue type</label>
          <select id="reportType" value={reportType} onChange={(event) => setReportType(event.target.value)} required>
            <option value="Route">Route</option>
            <option value="Fare">Fare</option>
            <option value="Stop">Stop</option>
            <option value="Other">Other</option>
          </select>

          <label htmlFor="itemName">Route, fare, or stop name</label>
          <input id="itemName" type="text" value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="e.g. Blantyre to Limbe" required />

          <label htmlFor="location">Location <span className="account-optional">Optional</span></label>
          <input id="location" type="text" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Town or area" />

          <label htmlFor="description">Details</label>
          <textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the issue" rows={5} minLength={10} required />

          <button className="account-submit" type="submit">Submit report <span aria-hidden="true">→</span></button>
          {message && <p className="account-message" role="status">{message}</p>}
        </form>
      </section>
    </main>
  );
}
