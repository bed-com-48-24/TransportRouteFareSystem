"use client";

import Link from "next/link";
import PassengerReportForm from "@/components/PassengerReportForm";

const bookingSteps = [
  {
    number: "01",
    title: "Choose a departure",
    detail: "Enter your starting town, destination, and travel date, then search. Only departures scheduled by the admin can be booked. If none exists for that route and date, booking stays blocked until the admin adds a schedule.",
  },
  {
    number: "02",
    title: "Pick your seats",
    detail: "Select a trip, then pick up to five seats on the bus map and confirm. Seat 1 is reserved by the admin next to the door and the driver seat is never bookable. After confirming, choose pickup and drop-off points and enter a name and email.",
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

      <div className="help-layout">
        <section className="module-section help-steps" aria-labelledby="booking-help-heading">
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

        <section className="module-section help-report" aria-labelledby="report-heading">
          <div className="module-section-heading">
            <div>
              <p className="module-eyebrow">SEND FEEDBACK</p>
              <h2 id="report-heading">Report an issue</h2>
            </div>
          </div>
          <p className="module-copy">
            Tell us if a route, fare, or pickup point looks wrong or out of date. Your report
            appears in the administrator&apos;s report queue, and the status and staff note are
            shown below once they respond.
          </p>
          <PassengerReportForm />
        </section>
      </div>
    </main>
  );
}
