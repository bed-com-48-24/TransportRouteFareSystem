import Link from "next/link";
import { TRIPS, fmtDate } from "./booking-data";

export default function TransportBookingPage() {
  return (
    <main className="booking-shell">
      <section className="booking-content" aria-labelledby="page-title">
        <Link className="back-link" href="/">← Back to journeys</Link>
        <div className="eyebrow">STEP 1 OF 3 · SELECT A TRIP</div>
        <h1 id="page-title">Choose your journey</h1>
        <p className="intro">Compare departure times and estimated fares. Seat availability is checked again when you confirm.</p>
        <div className="trip-options">
          {TRIPS.map((trip) => (
            <article className="trip-card trip-option" key={trip.id}>
              <div className="trip-card-top"><span className="route-label">AVAILABLE TRIP</span><span className="trip-badge">{fmtDate(trip.date)}</span></div>
              <h2>{trip.route}</h2>
              <div className="trip-option-meta"><span>◷ &nbsp;{trip.departure} – {trip.arrival}</span><span>⌖ &nbsp;{trip.pickup[0]}</span><span>MWK {trip.fare.toLocaleString()} <small>/ passenger · estimated</small></span></div>
              <Link className="confirm-button trip-choose" href={`/transport-booking/details/${trip.id}`}>Choose this trip <span aria-hidden="true">→</span></Link>
            </article>
          ))}
        </div>
        <p className="booking-footnote"><span>ⓘ</span> This is a seat reservation only. No ticket sales or payment processing.</p>
      </section>
    </main>
  );
}
