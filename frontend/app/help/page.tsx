"use client";

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
    title: "Complete checkout",
    detail: "Review the fare and select a payment method. The booking and payment request are sent to the YendaRoute backend.",
  },
  {
    number: "04",
    title: "Keep your ticket",
    detail: "Your ticket appears with a QR code and booking reference. Download the PNG and show it when boarding.",
  },
];

export default function HelpPage() {
  return (
    <main className="module-shell transport-page-shell">
      <div className="transport-background" aria-hidden="true" />
      <div className="help-layout">
        <section className="module-section help-steps" aria-labelledby="booking-help-heading">
          <div className="module-section-heading">
            <div>
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
        </section>

        <section className="module-section help-report" aria-labelledby="report-heading">
          <div className="module-section-heading">
            <div>
              <h2 id="report-heading">Report an issue</h2>
            </div>
          </div>
          <PassengerReportForm />
        </section>
      </div>
    </main>
  );
}
