"use client";

import { useEffect, useState, type FormEvent } from "react";
import { readPassengerSession } from "@/lib/passenger-auth";
import { KEYS } from "@/lib/seed";
import { loadList, newId, saveList } from "@/lib/storage";
import type { ReportItem } from "@/lib/types";

export default function PassengerReportForm() {
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [reportType, setReportType] = useState<ReportItem["type"]>("Route");
  const [itemName, setItemName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    let active = true;
    void readPassengerSession().then((session) => {
      if (active && session) {
        setReporterName(session.fullName);
        setReporterEmail(session.email);
      }
    }).catch((reason: unknown) => {
      if (!active) return;
      setFeedback({
        kind: "error",
        message: reason instanceof Error ? reason.message : "Your passenger details could not be loaded.",
      });
    });
    return () => {
      active = false;
    };
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
      setFeedback({ kind: "success", message: "Thank you. Your report has been submitted for review." });
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
    </>
  );
}
