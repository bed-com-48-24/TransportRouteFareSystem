"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "@/components/ClientLeaflet";
import QRCode from "qrcode";
import { availableSeats, createBooking, fmtDate, TRIPS } from "@/lib/booking-data";
import { DISTRICT_COORDINATES, type Coordinates } from "@/lib/malawi-locations";
import { KEYS } from "@/lib/seed";
import { useStoredList } from "@/lib/storage";
import type { Booking } from "@/lib/types";

const MAX_PASSENGERS = 8;
const TRIP_CITY_COORDINATES: Record<string, Coordinates> = {
  ...DISTRICT_COORDINATES,
  Limbe: { lat: -15.8103, lng: 35.0586 },
  Mzuzu: { lat: -11.4656, lng: 34.0207 },
};

export default function TransportBookingPage({ initialTripId }: { initialTripId?: string }) {
  const router = useRouter();
  const initialTrip = TRIPS.find((trip) => trip.id === initialTripId);
  const bookings = useStoredList<Booking>(KEYS.bookings, []);
  const [selectedTripId, setSelectedTripId] = useState(initialTrip?.id ?? "");
  const [travelDate, setTravelDate] = useState(initialTrip?.date ?? "");
  const [pickup, setPickup] = useState(initialTrip?.pickup[0] ?? "");
  const [dropoff, setDropoff] = useState(initialTrip?.dropoff[0] ?? "");
  const [passengers, setPassengers] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("mobile-money");
  const [ticket, setTicket] = useState<Booking | null>(null);
  const [ticketQr, setTicketQr] = useState("");
  const [tripView, setTripView] = useState<"cards" | "map">("cards");
  const [destinationFilter, setDestinationFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const selectedTrip = TRIPS.find((trip) => trip.id === selectedTripId);
  const destinations = [...new Set(TRIPS.map((trip) => trip.route.split(" → ")[1]))].sort();
  const travelDates = [...new Set(TRIPS.map((trip) => trip.date))].sort();
  const visibleTrips = TRIPS.filter((trip) => {
    const destinationMatches = destinationFilter === "all" || trip.route.endsWith(`→ ${destinationFilter}`);
    const dateMatches = dateFilter === "all" || trip.date === dateFilter;
    return destinationMatches && dateMatches;
  }).sort((first, second) => first.date.localeCompare(second.date) || first.departure.localeCompare(second.departure));
  const visibleTowns = [...new Set(visibleTrips.flatMap((trip) => trip.route.split(" → ")))];
  const seatsByTrip = useMemo(
    () => new Map(TRIPS.map((trip) => [trip.id, availableSeats(trip, bookings)])),
    [bookings],
  );
  const available = selectedTrip ? (seatsByTrip.get(selectedTrip.id) ?? 0) : 0;

  function returnToTrips() {
    if (initialTripId) {
      router.push("/transport-booking");
      return;
    }
    document.getElementById("trips-heading")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!selectedTrip) {
      setError("Choose a trip before continuing.");
      return;
    }

    if (
      name.trim().length < 2 ||
      name.trim().length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      travelDate < selectedTrip.date ||
      !selectedTrip.pickup.includes(pickup) ||
      !selectedTrip.dropoff.includes(dropoff) ||
      passengers < 1 ||
      passengers > MAX_PASSENGERS
    ) {
      setError("Check your name, email, travel date, boarding points, and passenger count.");
      return;
    }

    setPaymentPending(true);
  }

  async function completeMockPayment() {
    if (!selectedTrip) return;

    setSaving(true);
    setError("");
    try {
      const booking = await createBooking(
        {
          tripId: selectedTrip.id,
          route: selectedTrip.route,
          travelDate,
          pickup,
          dropoff,
          passengers,
          name: name.trim(),
          email: email.trim().toLowerCase(),
        },
        selectedTrip,
      );

      if (!booking) {
        setError("Not enough seats remain for this trip. Choose fewer passengers or another departure.");
        return;
      }

      const qr = await QRCode.toDataURL(JSON.stringify({
        reference: booking.reference,
        tripId: booking.tripId,
        route: booking.route,
        travelDate: booking.travelDate,
        pickup: booking.pickup,
        dropoff: booking.dropoff,
        passengers: booking.passengers,
      }), { errorCorrectionLevel: "H", margin: 1, width: 280 });

      setTicket(booking);
      setTicketQr(qr);
      setPaymentPending(false);
      setNotice("Mock payment complete. Your bus ticket is ready.");
      setSelectedTripId("");
      setName("");
      setEmail("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The reservation could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function downloadTicketImage() {
    if (!ticket || !ticketQr) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 720;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is not available in this browser.");

      context.fillStyle = "#eef2f5";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#ffffff";
      context.fillRect(32, 32, 1136, 656);
      context.fillStyle = "#12304a";
      context.fillRect(32, 32, 1136, 130);
      context.fillStyle = "#ffffff";
      context.font = "700 42px sans-serif";
      context.fillText("SBUS BUS TICKET", 76, 92);
      context.font = "20px sans-serif";
      context.fillText("MOCK PAYMENT COMPLETE", 78, 130);

      const ticketFields = [
        ["ROUTE", ticket.route],
        ["PASSENGER", ticket.name],
        ["DATE", fmtDate(ticket.travelDate)],
        ["BOARDING", ticket.pickup],
        ["DESTINATION", ticket.dropoff],
        ["PASSENGERS", String(ticket.passengers)],
        ["REFERENCE", ticket.reference],
      ];
      let fieldY = 230;
      for (const [label, value] of ticketFields) {
        context.fillStyle = "#64788a";
        context.font = "700 16px sans-serif";
        context.fillText(label, 78, fieldY);
        context.fillStyle = "#12304a";
        context.font = "600 24px sans-serif";
        context.fillText(value, 78, fieldY + 34, 680);
        fieldY += label === "ROUTE" ? 90 : 68;
      }

      const qrImage = document.createElement("img");
      qrImage.src = ticketQr;
      await qrImage.decode();
      context.fillStyle = "#ffffff";
      context.fillRect(850, 300, 260, 260);
      context.drawImage(qrImage, 860, 310, 240, 240);
      context.fillStyle = "#64788a";
      context.font = "16px sans-serif";
      context.fillText("Scan to verify ticket", 880, 590);

      const download = document.createElement("a");
      download.href = canvas.toDataURL("image/png");
      download.download = `sbus-ticket-${ticket.reference}.png`;
      download.click();
    } catch {
      setError("Ticket image could not be created. Please try again.");
    }
  }

  return (
    <main className="module-shell">
      <header className="module-intro">
        <p className="module-eyebrow">TRAVEL · RESERVATIONS</p>
        <h1>{initialTripId ? initialTrip ? `${initialTrip.route} trip details` : "Trip not found" : "Choose a trip and reserve your seats"}</h1>
        <p>
          {initialTripId
            ? "Review your departure, enter passenger details, then continue to mock payment and your QR ticket."
            : "Compare departures, choose boarding points, then complete a mock payment to receive a downloadable QR ticket. No real payment is processed."}
        </p>
        <div className="module-shortcuts">
          {initialTripId ? (
            <Link href="/transport-booking">← Back to trips</Link>
          ) : (
            <>
              <Link href="/routes-fares">Search routes and fares</Link>
              <Link href="/help">How booking works</Link>
            </>
          )}
        </div>
      </header>

      {notice && <p className="module-notice" role="status">{notice}</p>}
      {error && <p className="module-error" role="alert">{error}</p>}

      {!initialTripId && (
      <section className="module-section" aria-labelledby="trips-heading">
        <div className="module-section-heading">
          <div>
            <p className="module-eyebrow">AVAILABLE DEPARTURES</p>
            <h2 id="trips-heading">Choose the trip that suits you</h2>
          </div>
          <div className="trip-browser-controls">
            <label className="map-route-filter">Destination
              <select value={destinationFilter} onChange={(event) => setDestinationFilter(event.target.value)}>
                <option value="all">All destinations</option>
                {destinations.map((destination) => <option key={destination} value={destination}>{destination}</option>)}
              </select>
            </label>
            <label className="map-route-filter">Travel date
              <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                <option value="all">All dates</option>
                {travelDates.map((date) => <option key={date} value={date}>{fmtDate(date)}</option>)}
              </select>
            </label>
            <span className="module-count">{visibleTrips.length} of {TRIPS.length} sample trips</span>
          </div>
        </div>

        <nav className="module-tabs" aria-label="Available trips view">
          <button type="button" className={tripView === "cards" ? "is-active" : ""} aria-pressed={tripView === "cards"} onClick={() => setTripView("cards")}>Cards</button>
          <button type="button" className={tripView === "map" ? "is-active" : ""} aria-pressed={tripView === "map"} onClick={() => setTripView("map")}>Map</button>
        </nav>

        {visibleTrips.length === 0 ? (
          <p className="module-empty">No sample departures match these filters. Choose another destination or date.</p>
        ) : tripView === "cards" ? (
          <div className="module-card-grid">
            {visibleTrips.map((trip) => {
              const seats = seatsByTrip.get(trip.id) ?? 0;
              const isSelected = trip.id === selectedTripId;
              return (
                <article className={`trip-choice${isSelected ? " is-selected" : ""}`} key={trip.id}>
                  <div className="trip-choice-top">
                    <span className="trip-service">SCHEDULED TRIP</span>
                    <span className={`seat-status${seats === 0 ? " is-full" : ""}`}>
                      {seats === 0 ? "Full" : `${seats} seats left`}
                    </span>
                  </div>
                  <h3>{trip.route}</h3>
                  <dl className="trip-facts">
                    <div><dt>Date</dt><dd>{fmtDate(trip.date)}</dd></div>
                    <div><dt>Departure</dt><dd>{trip.departure}</dd></div>
                    <div><dt>Arrival estimate</dt><dd>{trip.arrival}</dd></div>
                    <div><dt>Estimated fare</dt><dd>MWK {trip.fare.toLocaleString("en-MW")} <small>per passenger</small></dd></div>
                  </dl>
                  <div className="trip-stops">
                    <p><strong>Board:</strong> {trip.pickup.join(" or ")}</p>
                    <p><strong>Get off:</strong> {trip.dropoff.join(" or ")}</p>
                  </div>
                  <Link className={`primary-button${seats === 0 ? " is-disabled" : ""}`} aria-disabled={seats === 0} tabIndex={seats === 0 ? -1 : undefined} href={`/transport-booking/details/${trip.id}`} onClick={(event) => { if (seats === 0) event.preventDefault(); }}>
                    {seats === 0 ? "Full" : "Choose this trip"}
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="network-map">
            <MapContainer center={[-13.4, 34.2]} zoom={6} scrollWheelZoom className="route-map">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {visibleTrips.map((trip) => {
                const [origin, destination] = trip.route.split(" → ");
                const originCoordinates = TRIP_CITY_COORDINATES[origin];
                const destinationCoordinates = TRIP_CITY_COORDINATES[destination];
                if (!originCoordinates || !destinationCoordinates) return null;
                return (
                  <Polyline key={trip.id} positions={[[originCoordinates.lat, originCoordinates.lng], [destinationCoordinates.lat, destinationCoordinates.lng]]} pathOptions={{ color: "#12304A", weight: 4, opacity: 0.8 }}>
                    <Popup>
                      <strong>{trip.route}</strong><br />
                      {fmtDate(trip.date)} · {trip.departure}<br />
                      Estimated fare: MWK {trip.fare.toLocaleString("en-MW")}
                      <br />
                      <Link className="map-trip-select" href={`/transport-booking/details/${trip.id}`}>Choose this trip</Link>
                    </Popup>
                  </Polyline>
                );
              })}
              {visibleTowns.map((town) => {
                const coordinates = TRIP_CITY_COORDINATES[town];
                if (!coordinates) return null;
                return (
                <CircleMarker key={town} center={[coordinates.lat, coordinates.lng]} radius={7} pathOptions={{ color: "#12304A", fillColor: "#fff", fillOpacity: 1 }}>
                  <Popup>{town}</Popup>
                </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        )}
        <p className="module-footnote">Fares and schedules are estimates for this project demonstration. No payment is collected.</p>
      </section>
      )}

      {(selectedTrip || initialTripId) && (
      <section className="module-section" aria-labelledby="reservation-heading">
        <div className="module-section-heading">
          <div>
            <p className="module-eyebrow">RESERVE YOUR SEAT</p>
            <h2 id="reservation-heading" tabIndex={-1}>Trip and passenger details</h2>
          </div>
        </div>
        {!selectedTrip ? (
          ticket ? null : <p className="module-empty">This sample trip could not be found. Return to the available trips and choose another departure.</p>
        ) : paymentPending ? (
          <div className="mock-payment-panel">
            <div>
              <p className="module-eyebrow">DEMO CHECKOUT</p>
              <h3>{selectedTrip.route}</h3>
              <p>{fmtDate(travelDate)} · {selectedTrip.departure} · {passengers} passenger{passengers === 1 ? "" : "s"}</p>
              <strong>Amount due: MWK {(selectedTrip.fare * passengers).toLocaleString("en-MW")}</strong>
            </div>
            <label className="map-route-filter">Payment method
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                <option value="mobile-money">Mobile money (mock)</option>
                <option value="card">Bank card (mock)</option>
              </select>
            </label>
            <p className="module-footnote">Demo only: this simulates {paymentMethod === "mobile-money" ? "a mobile money" : "a card"} payment. No payment details are requested and no money is charged.</p>
            <div className="mock-payment-actions">
              <button className="primary-button" type="button" onClick={completeMockPayment} disabled={saving}>
                {saving ? "Processing demo payment…" : `Pay MWK ${(selectedTrip.fare * passengers).toLocaleString("en-MW")}`}
              </button>
              <button className="secondary-button" type="button" onClick={() => setPaymentPending(false)} disabled={saving}>Back to reservation details</button>
            </div>
          </div>
        ) : (
          <form className="module-form" onSubmit={submitBooking} noValidate>
            <div className="reservation-summary">
              <div>
                <span>Your trip</span>
                <strong>{selectedTrip.route}</strong>
                <small>{fmtDate(selectedTrip.date)} · departs {selectedTrip.departure}</small>
              </div>
              <div>
                <span>Seats available</span>
                <strong>{available} of {selectedTrip.capacity}</strong>
                <small>Seat availability is checked again when you confirm.</small>
              </div>
              <div>
                <span>Estimated total</span>
                <strong>MWK {(selectedTrip.fare * passengers).toLocaleString("en-MW")}</strong>
                <small>{passengers} passenger{passengers === 1 ? "" : "s"} · payment not taken</small>
              </div>
            </div>

            <div className="module-form-grid">
              <label>
                Travel date
                <input type="date" min={selectedTrip.date} value={travelDate} onChange={(event) => setTravelDate(event.target.value)} required />
              </label>
              <label>
                Number of passengers
                <select
                  value={passengers}
                  onChange={(event) => setPassengers(Number(event.target.value))}
                  disabled={available === 0}
                >
                  {Array.from({ length: Math.min(MAX_PASSENGERS, available) }, (_, index) => index + 1).map((count) => (
                    <option key={count} value={count}>{count} passenger{count === 1 ? "" : "s"}</option>
                  ))}
                </select>
              </label>
              <label>
                Pickup point
                <select value={pickup} onChange={(event) => setPickup(event.target.value)} required>
                  {selectedTrip.pickup.map((point) => <option key={point} value={point}>{point}</option>)}
                </select>
              </label>
              <label>
                Drop-off point
                <select value={dropoff} onChange={(event) => setDropoff(event.target.value)} required>
                  {selectedTrip.dropoff.map((point) => <option key={point} value={point}>{point}</option>)}
                </select>
              </label>
              <label>
                Passenger full name
                <input autoComplete="name" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Alex Banda" required />
              </label>
              <label>
                Email address
                <input type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
              </label>
            </div>
            <div className="reservation-actions">
              <button className="secondary-button" type="button" onClick={returnToTrips}>Back to trips</button>
              <button className="primary-button form-submit" type="submit" disabled={saving || available === 0 || passengers > available}>
                Continue to payment
              </button>
            </div>
          </form>
        )}
        {ticket && ticketQr && (
          <article className="ticket-card" aria-labelledby="ticket-heading">
            <div className="ticket-details">
              <p className="module-eyebrow">MOCK PAYMENT COMPLETE</p>
              <h3 id="ticket-heading">Your bus ticket</h3>
              <p className="ticket-route">{ticket.route}</p>
              <p>{fmtDate(ticket.travelDate)} · {ticket.pickup} to {ticket.dropoff}</p>
              <p>{ticket.passengers} passenger{ticket.passengers === 1 ? "" : "s"} · {ticket.name}</p>
              <p className="ticket-reference">Reference: <strong>{ticket.reference}</strong></p>
              <div className="ticket-actions">
                <button className="primary-button" type="button" onClick={downloadTicketImage}>Download ticket PNG</button>
                <button className="secondary-button" type="button" onClick={returnToTrips}>Back to trips</button>
              </div>
            </div>
            <div className="ticket-qr-wrap">
              <Image src={ticketQr} alt={`QR code for bus ticket ${ticket.reference}`} width={200} height={200} unoptimized />
              <small>Show this code when boarding</small>
            </div>
          </article>
        )}
      </section>
      )}
    </main>
  );
}
