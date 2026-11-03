"use client";

import Link from "next/link";

export default function Home() {

  return (
    <main className="home-shell">
<<<<<<< HEAD
      <section className="home-hero">
        <div className="home-hero-content">
          <p className="module-eyebrow">TRANSPORT ROUTES · FARES · BOOKINGS</p>
          <h1>Plan your journey with confidence.</h1>
          <p>Find a route, compare estimated fares, choose where to board, and reserve a seat in a few simple steps.</p>
          <div className="home-hero-actions">
            <Link className="primary-button" href="/routes-fares">Find a route <span aria-hidden="true">→</span></Link>
            <Link className="home-secondary-link" href="/transport-booking">Browse available trips</Link>
          </div>
          <p className="home-guest-note">No account needed to search or browse as a guest.</p>
        </div>
        <div className="home-journey-card" aria-label="Example journey">
          <span className="module-eyebrow">YOUR NEXT JOURNEY</span>
          <div className="home-route-line">
            <span className="home-route-marker" />
            <div><small>STARTING POINT</small><strong>Blantyre</strong></div>
          </div>
          <div className="home-route-line">
            <span className="home-route-marker end" />
            <div><small>DESTINATION</small><strong>Explore Malawi</strong></div>
          </div>
          <p>Direct and connected route information, all in one place.</p>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-heading">
          <p className="module-eyebrow">ONE SIMPLE PLACE TO START</p>
          <h2>What would you like to do?</h2>
          <p>Choose a service. Clear steps and helpful details guide you through.</p>
        </div>
        <div className="home-services" aria-label="SBUS services">
          <Link href="/routes-fares"><strong>Routes &amp; fares</strong><span>Compare routes, estimated fares, pickup points, and transfers →</span></Link>
          <Link href="/maps-admin-integration"><strong>Map &amp; nearby stops</strong><span>Explore the expanded route network and recorded pickup or drop-off locations →</span></Link>
          <Link href="/transport-booking"><strong>Trips, bookings &amp; map</strong><span>Browse departures as cards or on a map, then reserve seats →</span></Link>
          <Link href="/accounts-reports"><strong>Account &amp; support</strong><span>Sign in, create an account, update your profile, or report an issue →</span></Link>
        </div>
      </section>

      <section className="home-steps" aria-label="How it works">
        <h2>Three easy steps</h2>
        <ol>
          <li><span>1</span><div><strong>Find your route</strong><p>Enter your starting point and destination.</p></div></li>
          <li><span>2</span><div><strong>Choose a trip</strong><p>Review stops, departure times, and estimated fares.</p></div></li>
          <li><span>3</span><div><strong>Reserve your seat</strong><p>Enter your details and keep your booking reference.</p></div></li>
        </ol>
=======
      <section
        className="home-hero"
        style={{
          backgroundImage:
            "linear-gradient(rgba(18, 48, 74, 0.76), rgba(18, 48, 74, 0.76)), url('https://images.unsplash.com/photo-1557223562-6c77ef16210f?auto=format&fit=crop&w=2000&q=90')",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <h1>
          Find the right route.
          <br />
          <span>Travel with confidence.</span>
        </h1>

        <Link className="confirm-button home-cta" href="/routes-fares">
          Search routes and fares <span aria-hidden="true">→</span>
        </Link>
      </section>

      <section className="home-feature-row">
        <article>
          <span>01</span>
          <strong>Choose a trip</strong>
          <p>Compare routes and estimated fares before choosing where to board.</p>
        </article>

        <article>
          <span>02</span>
          <strong>Enter your details</strong>
          <p>Select your travel date, pickup and drop-off points.</p>
        </article>

        <article>
          <span>03</span>
          <strong>Get confirmed</strong>
          <p>Receive a unique booking reference instantly.</p>
        </article>
      </section>

      <section className="home-services" aria-label="More SBUS services">
        <Link href="/routes-fares">
          <strong>Routes &amp; fares</strong>
          <span>Compare journeys, pickup points, and estimated costs →</span>
        </Link>

        <Link href="/maps-admin-integration/nearby">
          <strong>Nearby stops</strong>
          <span>Find pickup and drop-off points on the map →</span>
        </Link>

        <Link href="/transport-booking">
          <strong>Book a trip</strong>
          <span>Choose an available trip and reserve seats →</span>
        </Link>

        <Link href="/transport-booking/my-bookings">
          <strong>My bookings</strong>
          <span>Find or cancel a reservation →</span>
        </Link>
>>>>>>> origin/feature/accounts-reports
      </section>
    </main>
  );
}