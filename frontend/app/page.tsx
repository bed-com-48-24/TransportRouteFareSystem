import Link from "next/link";

export default function WelcomePage() {
  return (
    <main className="welcome-page">
      <header className="welcome-nav">
        <Link className="welcome-brand" href="/" aria-label="SBUS welcome page">
          <span className="welcome-brand-mark" aria-hidden="true">S</span>
          <span>SBUS</span>
        </Link>
      </header>

      <section className="welcome-hero" aria-labelledby="welcome-title">
        <h1 id="welcome-title">Plan your <span>journey.</span></h1>
        <div className="welcome-actions">
          <Link className="primary-button welcome-primary" href="/login">Log in <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="welcome-info" aria-labelledby="welcome-info-title">
        <h2 id="welcome-info-title">What you can do with SBUS</h2>
        <ul>
          <li><span aria-hidden="true">✓</span> Find routes, fares, and departure times</li>
          <li><span aria-hidden="true">✓</span> See stops and available seats</li>
          <li><span aria-hidden="true">✓</span> Book a trip and keep your bookings together</li>
          <li><span aria-hidden="true">✓</span> Check updates, reports, and payment records</li>
        </ul>
      </section>
    </main>
  );
}
