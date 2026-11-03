"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { KEYS } from "@/lib/seed";
import { loadList, newId, saveList } from "@/lib/storage";
import type { ReportCategory, ReportItem } from "@/lib/types";

const bookingSteps = [
  {
    number: "01",
    title: "Choose a departure",
    detail: "Browse the trip cards or switch to Map. Filter by destination or date to narrow the sample schedule.",
  },
  {
    number: "02",
    title: "Enter passenger details",
    detail: "Select a trip, choose pickup and drop-off points, set the passenger count, and enter a name and email.",
  },
  {
    number: "03",
    title: "Complete demo checkout",
    detail: "Review the mock amount and choose a mock payment method. Press Pay to simulate checkout; no money is charged.",
  },
  {
    number: "04",
    title: "Keep your ticket",
    detail: "Your ticket appears with a QR code and booking reference. Download the PNG and show it when boarding.",
  },
];

export default function HelpPage() {
  const [category, setCategory] = useState<ReportCategory>("Issue report");
  const [type, setType] = useState<ReportItem["type"]>("Other");
  const [itemName, setItemName] = useState("");
  const [location, setLocation] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [description, setDescription] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (itemName.trim().length < 2 || description.trim().length < 10) {
      setFeedback({ kind: "error", message: "Add a subject and at least 10 characters describing your report." });
      return;
    }

    const report: ReportItem = {
      id: newId("report"),
      category,
      type,
      itemName: itemName.trim(),
      description: description.trim(),
      location: location.trim(),
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      status: "open",
      adminNote: "",
      createdAt: new Date().toISOString(),
    };

    try {
      saveList(KEYS.reports, [...loadList<ReportItem>(KEYS.reports, []), report]);
      setItemName("");
      setLocation("");
      setCustomerName("");
      setCustomerEmail("");
      setDescription("");
      setFeedback({ kind: "success", message: "Thank you. Your message has been sent to the team for review." });
    } catch {
      setFeedback({ kind: "error", message: "Your message could not be saved on this device. Please try again." });
    }
  }

  return (
    <main className="module-shell">
      <header className="module-intro">
        <p className="module-eyebrow">PASSENGER HELP</p>
        <h1>How to book a trip</h1>
        <p>Follow these steps to choose a departure and get a mock QR ticket.</p>
        <div className="module-shortcuts">
          <Link className="primary-button" href="/transport-booking">Browse trips <span aria-hidden="true">→</span></Link>
        </div>
      </header>

      <section className="module-section" aria-labelledby="booking-help-heading">
        <div className="module-section-heading">
          <div>
            <p className="module-eyebrow">FOUR STEPS</p>
            <h2 id="booking-help-heading">From departure to ticket</h2>
          </div>
        </div>
        <ol className="booking-help-steps">
          {bookingSteps.map((step) => (
            <li key={step.number}>
              <span>{step.number}</span>
              <div><h3>{step.title}</h3><p>{step.detail}</p></div>
            </li>
          ))}
        </ol>
        <p className="module-footnote">This is a frontend demonstration. Trips, bookings, and payments are mock data stored locally in this browser.</p>
      </section>

      <section className="module-section" aria-labelledby="help-report-heading">
        <div className="module-section-heading">
          <div>
            <p className="module-eyebrow">CUSTOMER SUPPORT</p>
            <h2 id="help-report-heading">Report a problem or send feedback</h2>
          </div>
        </div>
        <p className="module-copy">Send an issue report, complaint, or feedback to the team. Add contact details if you would like a follow-up.</p>
        <form className="module-form help-report-form" onSubmit={submitReport}>
          <div className="module-form-grid">
            <label>Message type
              <select value={category} onChange={(event) => setCategory(event.target.value as ReportCategory)}>
                <option value="Issue report">Issue report</option>
                <option value="Complaint">Complaint</option>
                <option value="Feedback">Feedback</option>
              </select>
            </label>
            <label>Related to
              <select value={type} onChange={(event) => setType(event.target.value as ReportItem["type"])}>
                <option value="Route">Route</option>
                <option value="Fare">Fare</option>
                <option value="Stop">Pickup or drop-off point</option>
                <option value="Other">Other / general service</option>
              </select>
            </label>
            <label>Subject<input minLength={2} maxLength={120} value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="Briefly summarize the problem" required /></label>
            <label>Town or area <span className="optional-label">Optional</span><input maxLength={100} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Where did this happen?" /></label>
            <label>Your name <span className="optional-label">Optional</span><input autoComplete="name" maxLength={100} value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Name" /></label>
            <label>Email address <span className="optional-label">Optional</span><input type="email" autoComplete="email" maxLength={254} value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="you@example.com" /></label>
          </div>
          <label>Details<textarea minLength={10} maxLength={1000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Tell us what happened or how we can improve…" required /></label>
          <button className="primary-button form-submit" type="submit">Send to support</button>
        </form>
        {feedback && (
          <p className={`module-feedback ${feedback.kind}`} role={feedback.kind === "error" ? "alert" : "status"}>
            {feedback.message}
          </p>
        )}
        <p className="module-footnote">Demo only: messages are stored in this browser. An administrator can review them under Admin → Passenger reports on this same browser.</p>
      </section>
    </main>
  );
}