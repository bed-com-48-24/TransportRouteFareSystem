import Link from "next/link";

export default function Home() {
  return (
    <main className="home-shell">
      <nav className="home-nav">
        <Link className="brand" href="/">
          <span className="brand-mark">S</span> SBUS
        </Link>
        <div className="home-nav-links">
          <Link className="home-nav-link" href="/routes-fares">Routes & fares</Link>
          <Link className="home-nav-link" href="/transport-booking">Bookings</Link>
          <Link className="home-nav-link" href="/accounts-reports/login">Account</Link>
        </div>
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
          <strong>Find routes and fares</strong>
          <p>Search popular destinations and compare estimated fares.</p>
        </article>
        <article>
          <span>02</span>
          <strong>Choose a trip</strong>
          <p>See departure details and demo seat availability.</p>
        </article>
        <article>
          <span>03</span>
          <strong>Manage your account</strong>
          <p>Register, update your profile, and view support reports.</p>
        </article>
      </section>
    </main>
  );
}
