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
        <h1 style={{ fontSize: "clamp(42px, 6vw, 58px)", fontWeight: 800, letterSpacing: "-1.6px", lineHeight: 1.08 }}>
          Passenger help
        </h1>
        <p>Find help with booking, or report incorrect travel information to the team.</p>
        <div className="module-shortcuts">
          <Link className="primary-button" href="/transport-booking">Browse trips <span aria-hidden="true">→</span></Link>
          <Link href="#report-issue">Report an issue <span aria-hidden="true">→</span></Link>
        </div>
      </header>

      <div
        className="help-content-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 460px), 1fr))",
          alignItems: "start",
          gap: 20,
        }}
      >
        <section
          className="module-section help-steps-section"
          aria-labelledby="booking-help-heading"
          style={{ backgroundColor: "rgba(234, 242, 251, 0.94)", borderColor: "#cbdced" }}
        >
          <details className="help-report-disclosure">
            <summary className="help-report-summary" style={{ cursor: "pointer" }}>
              <span>
                <span className="module-eyebrow">FOUR STEPS</span>
                <span className="help-report-title" id="booking-help-heading">From departure to ticket</span>
                <span className="help-report-hint">Open to view the booking instructions</span>
              </span>
              <span className="help-report-chevron" aria-hidden="true" />
            </summary>
            <div className="help-report-content">
              <ol className="booking-help-steps">
                {bookingSteps.map((step) => (
                  <li key={step.number}>
                    <span>{step.number}</span>
                    <div><h3>{step.title}</h3><p>{step.detail}</p></div>
                  </li>
                ))}
              </ol>
              <p className="module-footnote">This is a frontend demonstration. Trips, bookings, and payments are mock data stored locally in this browser.</p>
            </div>
          </details>

          <section
            className="module-section help-topics-section"
            aria-labelledby="passenger-help-topics-heading"
            style={{ backgroundColor: "rgba(234, 242, 251, 0.94)", borderColor: "#cbdced" }}
          >
            <details className="help-report-disclosure">
              <summary className="help-report-summary" style={{ cursor: "pointer" }}>
                <span>
                  <span className="module-eyebrow">QUICK ANSWERS</span>
                  <span className="help-report-title" id="passenger-help-topics-heading">More passenger help</span>
                  <span className="help-report-hint">Open to browse common passenger questions</span>
                </span>
                <span className="help-report-chevron" aria-hidden="true" />
              </summary>
              <div className="help-report-content">
                <div className="help-topic-list">
                  {passengerHelpTopics.map((topic) => (
                    <details className="help-topic" key={topic.question}>
                      <summary style={{ cursor: "pointer", color: "var(--navy)", fontSize: 15, fontWeight: 700 }}>
                        <span>{topic.question}</span>
                        <span className="help-report-chevron" aria-hidden="true" />
                      </summary>
                      <p>{topic.answer}</p>
                    </details>
                  ))}
                </div>
              </div>
            </details>
          </section>
        </section>

        <section
          className="module-section help-report-section"
          id="report-issue"
          aria-labelledby="report-issue-heading"
          style={{ backgroundColor: "rgba(234, 242, 251, 0.94)", borderColor: "#cbdced" }}
        >
          <details className="help-report-disclosure">
            <summary className="help-report-summary" style={{ cursor: "pointer" }}>
              <span>
                <span className="module-eyebrow">PASSENGER REPORTS</span>
                <span className="help-report-title" id="report-issue-heading">Report an issue</span>
                <span className="help-report-hint">Open to submit a report or check for updates</span>
              </span>
              <span className="help-report-chevron" aria-hidden="true" />
            </summary>
            <div className="help-report-content">
              <p className="module-copy">Tell us about incorrect or out-of-date route, fare, or stop information. Include your contact details so staff can identify who submitted the report.</p>
              <PassengerReportForm />
              <p className="module-footnote">Reports are saved in this browser for this project demonstration; they are not sent to a live service.</p>
            </div>
          </details>
        </section>
      </div>

    </main>
  );
}
