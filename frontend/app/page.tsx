import Link from "next/link";

export default function Home() {
  return (
    <main className="home-shell">
      <nav className="home-nav">
        <Link className="brand" href="/">
          <span className="brand-mark">R</span> RouteWise
        </Link>
        <Link className="home-nav-link" href="/transport-booking">
          Bookings
        </Link>
      </nav>

      <section className="home-hero">
        <span className="eyebrow">PUBLIC TRANSPORT, MADE CLEAR</span>
        <h1>
          Know your route.
          <br />
          <span>Plan your journey.</span>
        </h1>
        <p>
          Find transport trips, compare estimated fares and reserve a seat
          before you travel.
        </p>
        <Link className="confirm-button home-cta" href="/transport-booking">
          Explore trips and book <span aria-hidden="true">→</span>
        </Link>
        <small>Seat reservations only. No online payment.</small>
      </section>

      <section className="home-feature-row">
        <article>
          <span>01</span>
          <strong>Choose a trip</strong>
          <p>See departure details and live demo seat availability.</p>
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
    </main>
  );
}
