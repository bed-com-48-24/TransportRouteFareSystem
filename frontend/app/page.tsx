import Link from "next/link";

const highlights = [
  {
    number: "01",
    title: "Find a trip",
    description: "Explore available Malawi routes, departure times, estimated fares, pickup points, and seat availability.",
  },
  {
    number: "02",
    title: "Book your journey",
    description: "Choose a scheduled departure and seats, then add passenger details and continue to the payment demonstration.",
  },
  {
    number: "03",
    title: "Stay up to date",
    description: "Use your profile to check bookings, payment records, report responses, and travel notifications.",
  },
];

const features = [
  ["Routes and fares", "Compare routes and estimated prices to plan your trip."],
  ["Schedules and seats", "See scheduled departures, stops, vehicle capacity, and available seats."],
  ["Passenger profile", "Review your bookings, payment status, notifications, and submitted reports."],
  ["Company workspace", "Transport administrators can manage routes, schedules, fleet, bookings, and passenger reports."],
];

export default function WelcomePage() {
  return (
    <main className="welcome-page">
      <header className="welcome-nav">
        <Link className="welcome-brand" href="/" aria-label="SBUS welcome page">
          <span className="welcome-brand-mark" aria-hidden="true">S</span>
          <span>SBUS<small>Smart Bus User System</small></span>
        </Link>
        <Link className="welcome-nav-login" href="/login">Log in <span aria-hidden="true">→</span></Link>
      </header>

      <section className="welcome-hero" aria-labelledby="welcome-title">
        <div className="welcome-hero-copy">
          <p className="module-eyebrow">WELCOME TO SBUS</p>
          <h1 id="welcome-title">Plan your journey with <span>confidence.</span></h1>
          <p className="welcome-lede">
            SBUS brings bus routes, fares, schedules, seat bookings, and passenger updates together in one place. Find the travel information you need and keep your journey details close at hand.
          </p>
          <div className="welcome-actions">
            <Link className="primary-button welcome-primary" href="/login">Continue to login <span aria-hidden="true">→</span></Link>
            <Link className="welcome-secondary" href="/home">Explore trips</Link>
          </div>
          <p className="welcome-audience">For passengers and transport company administrators</p>
        </div>
        <aside className="welcome-summary" aria-label="What SBUS brings together">
          <div className="welcome-summary-mark" aria-hidden="true">SBUS</div>
          <p className="welcome-summary-label">YOUR TRAVEL HUB</p>
          <h2>From route search to passenger updates</h2>
          <ul>
            <li><span aria-hidden="true">✓</span> Routes, fares, and departure times</li>
            <li><span aria-hidden="true">✓</span> Pickup points and seat selection</li>
            <li><span aria-hidden="true">✓</span> Bookings, reports, and notifications</li>
          </ul>
        </aside>
      </section>

      <section className="welcome-section" aria-labelledby="welcome-features-title">
        <div className="welcome-section-heading">
          <p className="module-eyebrow">WHAT YOU CAN DO</p>
          <h2 id="welcome-features-title">Everything for a smoother trip</h2>
          <p>Passengers can plan and follow their trips. Company administrators can keep travel information up to date.</p>
        </div>
        <div className="welcome-feature-grid">
          {features.map(([title, description], index) => (
            <article className="welcome-feature-card" key={title}>
              <span className="welcome-feature-number">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="welcome-section welcome-how" aria-labelledby="welcome-how-title">
        <div className="welcome-section-heading">
          <p className="module-eyebrow">GETTING STARTED</p>
          <h2 id="welcome-how-title">Your journey in three steps</h2>
        </div>
        <ol className="welcome-steps">
          {highlights.map((item) => (
            <li key={item.number}>
              <span className="welcome-step-number">{item.number}</span>
              <div><h3>{item.title}</h3><p>{item.description}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <aside className="welcome-demo-note">
        <span className="welcome-demo-icon" aria-hidden="true">i</span>
        <p><strong>About this project</strong> Some features, including payment processing and passenger reports, are demonstrations. Payment choices do not charge an account, and demo report or notification updates are saved in this browser.</p>
      </aside>

      <section className="welcome-bottom-cta" aria-labelledby="welcome-cta-title">
        <div><p className="module-eyebrow">READY TO GET STARTED?</p><h2 id="welcome-cta-title">Sign in to continue to SBUS</h2></div>
        <Link className="primary-button welcome-primary" href="/login">Go to login <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
