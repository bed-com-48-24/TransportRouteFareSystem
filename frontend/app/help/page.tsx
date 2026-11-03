import Link from "next/link";

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
    </main>
  );
}