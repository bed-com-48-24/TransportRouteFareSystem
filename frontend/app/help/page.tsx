import Link from "next/link";
import PassengerReportForm from "@/components/PassengerReportForm";

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

const passengerHelpTopics = [
  {
    question: "How do I find a route, departure time, or fare?",
    answer: "Open Routes & fares or Browse trips to compare the sample routes, schedules, and fares shown in this demo.",
  },
  {
    question: "How do I book a trip?",
    answer: "Choose a trip, enter your passenger details, select pickup and drop-off points, then follow the demo checkout steps.",
  },
  {
    question: "Was I charged for a payment?",
    answer: "No. Checkout is a demonstration only. It does not process a real payment or charge money.",
  },
  {
    question: "Where can I find my ticket?",
    answer: "After completing demo checkout, the ticket and booking reference appear on screen. Bookings are stored in this browser, so they may not be available on another device.",
  },
  {
    question: "Can I change or cancel my booking?",
    answer: "This demo is not connected to a live transport operator. Check the booking options shown in the app, or contact the operator directly for real changes, cancellations, and refund policies.",
  },
  {
    question: "How do I find a pickup or drop-off point?",
    answer: "Use the Map & nearby stops page to explore the sample stops. If a location looks incorrect, open Report an issue and send the details.",
  },
  {
    question: "Where can I check delays or service changes?",
    answer: "Live delay and service alerts are not available in this demo. Please check directly with the transport operator for current travel information.",
  },
  {
    question: "How can I request accessibility assistance or report lost property?",
    answer: "This demo does not connect to passenger assistance or lost-property services. Contact the transport operator directly so they can help with your specific trip.",
  },
];

export default function HelpPage() {
  return (
    <main className="module-shell help-page">
      <header className="module-intro">
        <p className="module-eyebrow">PASSENGER HELP</p>
        <h1>Passenger help</h1>
        <p>Find help with booking your trip from start to finish, or report incorrect travel information to the team.</p>
        <div className="module-shortcuts help-cta-row">
          <Link className="primary-button help-cta-button" href="/transport-booking">
            <span>Browse trips</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>

      <div className="help-layout">
        <section className="module-section help-panel help-panel--steps" aria-labelledby="booking-help-heading">
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
          <section className="help-topics-section" aria-labelledby="passenger-help-topics-heading">
            <div className="module-section-heading">
              <div>
                <p className="module-eyebrow">QUICK ANSWERS</p>
                <h2 id="passenger-help-topics-heading">More passenger help</h2>
              </div>
            </div>
            <div className="help-topic-list">
              {passengerHelpTopics.map((topic) => (
                <details className="help-topic" key={topic.question}>
                  <summary>
                    <span>{topic.question}</span>
                    <span className="help-report-chevron" aria-hidden="true" />
                  </summary>
                  <p>{topic.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </section>

        <section className="module-section help-panel help-panel--report" id="report-issue" aria-labelledby="report-issue-heading">
          <div className="module-section-heading">
            <div>
              <p className="module-eyebrow">PASSENGER REPORTS</p>
              <h2 id="report-issue-heading">Report an issue</h2>
            </div>
          </div>
          <p className="module-copy">Tell us about incorrect or out-of-date route, fare, or stop information. Include your contact details so staff can identify who submitted the report.</p>
          <PassengerReportForm />
          <p className="module-footnote">Reports are saved in this browser for this project demonstration; they are not sent to a live service.</p>
        </section>
      </div>

    </main>
  );
}
