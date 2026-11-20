import Link from "next/link";

export default function WelcomePage() {
  return (
    <main className="welcome-page">
      <section className="welcome-simple" aria-labelledby="welcome-title">
        <div className="welcome-simple-brand" aria-label="SBUS">
          <span className="welcome-simple-mark" aria-hidden="true">S</span>
          <span className="welcome-simple-brand-name">SBUS</span>
          <span className="welcome-simple-brand-caption">TRANSPORT ROUTES &amp; FARES</span>
          <div className="welcome-route-art" aria-hidden="true"><span /><i /><b /></div>
        </div>
        <div className="welcome-simple-copy">
          <p className="welcome-simple-eyebrow">WELCOME TO SBUS</p>
          <h1 id="welcome-title">Your next journey, made simpler.</h1>
          <p>Find the information you need for a smoother trip across Malawi. Sign in to explore routes and fares, check available trips, and manage your bookings in one place.</p>
          <Link className="welcome-simple-login" href="/login">Log in <span aria-hidden="true">→</span></Link>
          <p className="welcome-access-note">Sign in to access all travel services.</p>
        </div>
        <div className="welcome-simple-footer"><span />Plan ahead. Travel with confidence.</div>
      </section>
    </main>
  );
}
