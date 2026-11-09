"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "@/components/ClientLeaflet";
import { availableSeats, createBooking, fmtDate, TRIPS, unavailableSeatNumbers } from "@/lib/booking-data";
import { DISTRICT_COORDINATES, type Coordinates } from "@/lib/malawi-locations";
import { addMockNotification } from "@/lib/mock-notifications";
import { KEYS } from "@/lib/seed";
import { useStoredList } from "@/lib/storage";
import type { Booking, Trip } from "@/lib/types";

const MAX_PASSENGERS = 5;
const CITY_COORDINATES: Record<string, Coordinates> = {
  ...DISTRICT_COORDINATES,
  Limbe: { lat: -15.8103, lng: 35.0586 },
  Mzuzu: { lat: -11.4656, lng: 34.0207 },
};

export default function TransportBookingPage({ initialTripId }: { initialTripId?: string }) {
  const trips = useStoredList<Trip>(KEYS.schedules, TRIPS);
  const initialTrip = trips.find((trip) => trip.id === initialTripId);
  const bookings = useStoredList<Booking>(KEYS.bookings, []);
  const [selectedTripId, setSelectedTripId] = useState(initialTrip?.id ?? "");
  const [destinationFilter, setDestinationFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [pickup, setPickup] = useState(initialTrip?.pickup[0] ?? "");
  const [dropoff, setDropoff] = useState(initialTrip?.dropoff[0] ?? "");
  const [passengerName, setPassengerName] = useState("");
  const [passengerEmail, setPassengerEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [identificationNumber, setIdentificationNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("mobile_money");
  const [paymentPending, setPaymentPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState<Booking | null>(null);
  const [ticketQr, setTicketQr] = useState("");
  const [view, setView] = useState<"cards" | "map">("cards");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEYS.profile);
      if (!saved) return;
      const profile: unknown = JSON.parse(saved);
      if (typeof profile !== "object" || profile === null) return;
      if ("name" in profile && typeof profile.name === "string") setPassengerName(profile.name);
      if ("email" in profile && typeof profile.email === "string") setPassengerEmail(profile.email);
      if ("phone" in profile && typeof profile.phone === "string") setPhoneNumber(profile.phone);
      if ("identificationNumber" in profile && typeof profile.identificationNumber === "string") setIdentificationNumber(profile.identificationNumber);
    } catch {
      setError("Saved profile details could not be loaded. You can enter them manually.");
    }
  }, []);

  const selectedTrip = trips.find((trip) => trip.id === selectedTripId);
  const destinations = [...new Set(trips.map((trip) => trip.route.split(" → ")[1]))].sort();
  const dates = [...new Set(trips.map((trip) => trip.date))].sort();
  const filteredTrips = trips.filter((trip) =>
    (destinationFilter === "all" || trip.route.endsWith(`→ ${destinationFilter}`)) &&
    (dateFilter === "all" || trip.date === dateFilter),
  ).sort((a, b) => a.date.localeCompare(b.date) || a.departure.localeCompare(b.departure));
  const remainingSeats = selectedTrip ? availableSeats(selectedTrip, bookings) : 0;
  const unavailable = useMemo(
    () => new Set(selectedTrip ? unavailableSeatNumbers(selectedTrip, bookings) : []),
    [selectedTrip, bookings],
  );

  function chooseTrip(tripId: string) {
    const trip = TRIPS.find((item) => item.id === tripId);
    setSelectedTripId(tripId);
    setSelectedSeats([]);
    setPickup(trip?.pickup[0] ?? "");
    setDropoff(trip?.dropoff[0] ?? "");
    setPassengerName("");
    setPassengerEmail("");
    setPhoneNumber("");
    setIdentificationNumber("");
    if (trip) {
      setError("");
      setNotice("");
      setPaymentPending(false);
      setTicket(null);
    }
  }

  function toggleSeat(number: number) {
    if (unavailable.has(number)) return;
    setSelectedSeats((current) =>
      current.includes(number)
        ? current.filter((seat) => seat !== number)
        : current.length < MAX_PASSENGERS
          ? [...current, number].sort((a, b) => a - b)
          : current,
    );
    setError("");
  }

  function continueToPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!selectedTrip) {
      setError("Choose a trip first.");
      return;
    }
    if (passengerName.trim().length < 2) {
      setError("Enter the passenger's full name.");
      return;
    }
    if (passengerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(passengerEmail.trim())) {
      setError("Enter a valid email address or leave it blank.");
      return;
    }
    if (phoneNumber && phoneNumber.replace(/\D/g, "").length < 7) {
      setError("Phone number must contain at least seven digits.");
      return;
    }
    if (selectedSeats.length < 1 || selectedSeats.length > MAX_PASSENGERS) {
      setError(`Choose between 1 and ${MAX_PASSENGERS} seats.`);
      return;
    }
    setPaymentPending(true);
  }

  async function completeMockPayment() {
    if (!selectedTrip) return;
    setSaving(true);
    setError("");
    try {
      const booking = await createBooking({
        tripId: selectedTrip.id,
        route: selectedTrip.route,
        travelDate: selectedTrip.date,
        pickup,
        dropoff,
        passengers: selectedSeats.length,
        seatNumbers: selectedSeats,
        name: passengerName.trim(),
        email: passengerEmail.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim(),
        identificationNumber: identificationNumber.trim(),
        paymentMethod,
        paymentReference: `MOCK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      }, selectedTrip);
      if (!booking) {
        setError("One or more selected seats are no longer available. Choose different seats.");
        return;
      }

      const qr = await QRCode.toDataURL(JSON.stringify({
        reference: booking.reference,
        route: booking.route,
        travelDate: booking.travelDate,
        passenger: booking.name,
        seats: booking.seatNumbers,
        total: booking.total,
        paymentStatus: "simulated",
      }), { errorCorrectionLevel: "H", margin: 1, width: 240 });

      addMockNotification({
        title: "Booking confirmed",
        message: `Your mock booking ${booking.reference} for ${booking.route} is confirmed.`,
        category: "booking",
        bookingReference: booking.reference,
      });
      addMockNotification({
        title: "Mock payment complete",
        message: `A simulated ${paymentMethod.replace("_", " ")} payment of MWK ${(booking.total ?? 0).toLocaleString("en-MW")} was recorded for ${booking.reference}.`,
        category: "payment",
        bookingReference: booking.reference,
      });
      setTicket(booking);
      setTicketQr(qr);
      setPaymentPending(false);
      setNotice("Simulated payment complete. This is a mock ticket; no money was charged.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The mock reservation could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="module-shell module-shell-wide">
      <header className="module-intro">
        <p className="module-eyebrow">MOVA · TRIPS &amp; BOOKINGS</p>
        <h1>{initialTrip ? initialTrip.route : "Choose a trip and reserve your seats"}</h1>
        <p>Browse sample schedules, select seats, enter passenger details, and preview the simulated checkout. No backend or real payment is connected.</p>
        <div className="module-shortcuts">
          <Link href="/routes-fares">Search routes and fares</Link>
          <Link href="/transport-booking/my-bookings">My bookings</Link>
        </div>
      </header>

      {notice && <p className="module-notice" role="status">{notice}</p>}
      {error && <p className="module-error" role="alert">{error}</p>}

      {!initialTripId && (
        <section className="module-section" aria-labelledby="trips-heading">
          <div className="module-section-heading">
            <div><p className="module-eyebrow">SAMPLE SCHEDULES</p><h2 id="trips-heading">Choose a departure</h2></div>
            <div className="trip-browser-controls">
              <label className="map-route-filter">Destination
                <select value={destinationFilter} onChange={(event) => setDestinationFilter(event.target.value)}>
                  <option value="all">All destinations</option>
                  {destinations.map((town) => <option key={town} value={town}>{town}</option>)}
                </select>
              </label>
              <label className="map-route-filter">Date
                <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
                  <option value="all">All dates</option>
                  {dates.map((date) => <option key={date} value={date}>{fmtDate(date)}</option>)}
                </select>
              </label>
            </div>
          </div>
          <nav className="module-tabs" aria-label="Schedule presentation">
            <button type="button" className={view === "cards" ? "is-active" : ""} aria-pressed={view === "cards"} onClick={() => setView("cards")}>Trip cards</button>
            <button type="button" className={view === "map" ? "is-active" : ""} aria-pressed={view === "map"} onClick={() => setView("map")}>Map view</button>
          </nav>
          {filteredTrips.length === 0 ? <p className="module-empty">No sample trips match these filters.</p> : (
            <div className="module-card-grid">
              {filteredTrips.map((trip) => {
                const seats = availableSeats(trip, bookings);
                return (
                  <article className={`trip-choice${selectedTripId === trip.id ? " is-selected" : ""}`} key={trip.id}>
                    <div className="trip-choice-top"><span className="trip-service">{trip.transportMode ?? "SCHEDULED TRIP"}</span><span className={`seat-status${seats === 0 ? " is-full" : ""}`}>{seats} seats left</span></div>
                    <h3>{trip.route}</h3>
                    <dl className="trip-facts">
                      <div><dt>Date</dt><dd>{fmtDate(trip.date)}</dd></div>
                      <div><dt>Departure</dt><dd>{trip.departure}</dd></div>
                      <div><dt>Arrival</dt><dd>{trip.arrival}</dd></div>
                      <div><dt>Operator</dt><dd>{trip.operatorName ?? "MOVA"}</dd></div>
                      <div><dt>Fare</dt><dd>MWK {trip.fare.toLocaleString("en-MW")} per passenger</dd></div>
                    </dl>
                    <button className="primary-button" type="button" disabled={seats === 0} onClick={() => chooseTrip(trip.id)}>Select trip</button>
                  </article>
                );
              })}
            </div>
          )}
          {view === "map" && (
            <div className="network-map">
              <MapContainer center={[-13.5, 34.2]} zoom={6} scrollWheelZoom className="route-map">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {filteredTrips.map((trip) => {
                  const [from, to] = trip.route.split(" → ");
                  const fromPoint = CITY_COORDINATES[from];
                  const toPoint = CITY_COORDINATES[to];
                  if (!fromPoint || !toPoint) return null;
                  return (
                    <Polyline key={trip.id} positions={[[fromPoint.lat, fromPoint.lng], [toPoint.lat, toPoint.lng]]} pathOptions={{ color: "#12304A", weight: 4 }}>
                      <Popup><strong>{trip.route}</strong><br />{fmtDate(trip.date)} · {trip.departure}<br /><button type="button" onClick={() => chooseTrip(trip.id)}>Select trip</button></Popup>
                    </Polyline>
                  );
                })}
                {[...new Set(filteredTrips.flatMap((trip) => trip.route.split(" → ")))].map((town) => {
                  const point = CITY_COORDINATES[town];
                  return point ? <CircleMarker key={town} center={[point.lat, point.lng]} radius={7} pathOptions={{ color: "#12304A" }}><Popup>{town}</Popup></CircleMarker> : null;
                })}
              </MapContainer>
            </div>
          )}
        </section>
      )}

      {selectedTrip && !ticket && (
        <section className="module-section booking-section" aria-labelledby="reservation-title">
          {paymentPending ? (
            <div className="mock-payment-panel">
              <p className="module-eyebrow">SIMULATED CHECKOUT</p>
              <h2>{selectedTrip.route}</h2>
              <p>{fmtDate(selectedTrip.date)} · {selectedTrip.departure} · {selectedSeats.length} passenger(s)</p>
              <strong>Mock total: MWK {(selectedTrip.fare * selectedSeats.length).toLocaleString("en-MW")}</strong>
              <label className="map-route-filter">Payment method
                <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                  <option value="mobile_money">Mobile money (mock)</option>
                  <option value="bank_card">Bank card (mock)</option>
                </select>
              </label>
              <p className="module-footnote">Demonstration only. Do not enter a PIN or card details; no real payment is taken.</p>
              <button className="primary-button" type="button" disabled={saving} onClick={completeMockPayment}>{saving ? "Simulating payment…" : "Confirm mock payment"}</button>{" "}
              <button className="secondary-button" type="button" disabled={saving} onClick={() => setPaymentPending(false)}>Back</button>
            </div>
          ) : (
            <form className="module-form" onSubmit={continueToPayment}>
              <h2 id="reservation-title">Passenger and seat details</h2>
              <div className="reservation-summary">
                <div><span>Selected trip</span><strong>{selectedTrip.route}</strong><small>{fmtDate(selectedTrip.date)} · {selectedTrip.departure}</small></div>
                <div><span>Seats available</span><strong>{remainingSeats} / {selectedTrip.capacity}</strong></div>
                <div><span>Estimated total</span><strong>MWK {(selectedTrip.fare * selectedSeats.length).toLocaleString("en-MW")}</strong></div>
              </div>
              <div className="module-form-grid">
                <label>Passenger full name<input autoComplete="name" maxLength={100} value={passengerName} onChange={(event) => setPassengerName(event.target.value)} required /></label>
                <label>Email <span className="optional-label">Optional</span><input type="email" autoComplete="email" maxLength={254} value={passengerEmail} onChange={(event) => setPassengerEmail(event.target.value)} /></label>
                <label>Phone number <span className="optional-label">Optional</span><input type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} /></label>
                <label>Identification number <span className="optional-label">Optional</span><input value={identificationNumber} onChange={(event) => setIdentificationNumber(event.target.value)} /></label>
                <label>Pickup point<select value={pickup} onChange={(event) => setPickup(event.target.value)}>{selectedTrip.pickup.map((point) => <option key={point}>{point}</option>)}</select></label>
                <label>Drop-off point<select value={dropoff} onChange={(event) => setDropoff(event.target.value)}>{selectedTrip.dropoff.map((point) => <option key={point}>{point}</option>)}</select></label>
              </div>
              <h3>Choose seats (up to {MAX_PASSENGERS})</h3>
              <div className="bus-seat-grid" role="group" aria-label="Bus seat selection">
                {Array.from({ length: selectedTrip.capacity }, (_, index) => index + 1).map((seat) => (
                  <button key={seat} type="button" className={`bus-seat${selectedSeats.includes(seat) ? " is-selected" : ""}${unavailable.has(seat) ? " is-unavailable" : ""}`} aria-pressed={selectedSeats.includes(seat)} aria-label={`Seat ${seat}${unavailable.has(seat) ? ", unavailable" : ""}`} disabled={unavailable.has(seat)} onClick={() => toggleSeat(seat)}>{seat}</button>
                ))}
              </div>
              <p aria-live="polite">Selected seats: {selectedSeats.length ? selectedSeats.join(", ") : "none"}</p>
              <div className="reservation-actions">
                <button className="secondary-button" type="button" onClick={() => setSelectedTripId("")}>Back to trips</button>
                <button className="primary-button" type="submit" disabled={!selectedSeats.length || selectedSeats.length > remainingSeats}>Continue to mock payment</button>
              </div>
            </form>
          )}
        </section>
      )}

      {ticket && ticketQr && (
        <section className="module-section ticket-card" aria-labelledby="ticket-heading">
          <div>
            <p className="module-eyebrow">MOCK TICKET · PAYMENT SIMULATED</p>
            <h2 id="ticket-heading">Booking {ticket.reference}</h2>
            <p>{ticket.name} · {ticket.route} · {fmtDate(ticket.travelDate)}</p>
            <p>{ticket.pickup} → {ticket.dropoff} · Seat(s): {ticket.seatNumbers?.join(", ")}</p>
            <p>MWK {ticket.total?.toLocaleString("en-MW")} · {ticket.paymentMethod?.replace("_", " ")} · no real payment</p>
            <Link className="primary-button" href="/transport-booking/my-bookings">View my bookings</Link>
          </div>
          <div className="ticket-qr-wrap"><Image src={ticketQr} alt={`Mock ticket QR for ${ticket.reference}`} width={180} height={180} unoptimized /></div>
        </section>
      )}
      <p className="module-footnote">This page uses local sample data only. Booking availability is not shared across browsers or devices.</p>
    </main>
  );
}
