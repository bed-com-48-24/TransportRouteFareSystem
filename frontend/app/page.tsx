import Link from "next/link";

export default function Home() {
  return (
    <main className="home-shell">
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
        <Link href="/routes-fares"><strong>Routes &amp; fares</strong><span>Compare journeys, pickup points, and estimated costs →</span></Link>
        <Link href="/maps-admin-integration/nearby"><strong>Nearby stops</strong><span>Find pickup and drop-off points on the map →</span></Link>
        <Link href="/transport-booking"><strong>Book a trip</strong><span>Choose an available trip and reserve seats →</span></Link>
        <Link href="/transport-booking/my-bookings"><strong>My bookings</strong><span>Find or cancel a reservation →</span></Link>
        <Link href="/accounts-reports/report"><strong>Report information</strong><span>Tell us about inaccurate or outdated details →</span></Link>
        <Link href="/accounts-reports/login"><strong>My account</strong><span>Sign in or create an account →</span></Link>
      </section>
    </main>
  );
}
