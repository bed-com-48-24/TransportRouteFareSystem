"use client";

import { useState, type FormEvent } from "react";

export default function ReportPage() {
  const [reportType, setReportType] = useState("Route");
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage(
      "Report form validated. Submitting reports will be connected to the backend later."
    );
  }

  return (
    <main className="report-container">
      <h1>Report Inaccurate Information</h1>
      <p>
        Help us improve public transport information by reporting
        incorrect or outdated details.
      </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="reportType">What are you reporting?</label>
        <select
          id="reportType"
          value={reportType}
          onChange={(event) => setReportType(event.target.value)}
          required
        >
          <option value="Route">Transport route</option>
          <option value="Fare">Transport fare</option>
          <option value="Stop">Transport stop</option>
          <option value="Other">Other information</option>
        </select>

        <label htmlFor="itemName">Route, fare or stop name</label>
        <input
          id="itemName"
          type="text"
          value={itemName}
          onChange={(event) => setItemName(event.target.value)}
          placeholder="Enter the relevant name"
          required
        />

        <label htmlFor="location">Location (optional)</label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Where did you notice the problem?"
        />

        <label htmlFor="description">Describe the problem</label>
        <textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Explain what is incorrect or outdated..."
          rows={5}
          minLength={10}
          required
        />

        <button type="submit">Submit Report</button>

        {message && <p role="status">{message}</p>}
      </form>
    </main>
  );
}