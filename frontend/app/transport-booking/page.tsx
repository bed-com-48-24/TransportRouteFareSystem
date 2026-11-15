"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
<<<<<<< HEAD
import QRCode from "qrcode";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "@/components/ClientLeaflet";
import { availableSeats, createBooking, fmtDate, TRIPS, unavailableSeatNumbers } from "@/lib/booking-data";
=======
import { MapContainer, Polyline, RouteLocationMarker, TileLayer, ZoomControl } from "@/components/ClientLeaflet";
import QRCode from "qrcode";
import { usePassengerAuth } from "@/components/PassengerAuthProvider";
import { availableSeats, createBooking, fmtDate, getBookedSeatNumbers, TRIPS } from "@/lib/booking-data";
>>>>>>> origin/feature/integration
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

<<<<<<< HEAD
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
=======
type RoutePoint = [number, number];
type RoadRoute = {
  positions: RoutePoint[];
  distance: number;
  duration: number;
};
type RoutingRoute = {
  distance: number;
  duration: number;
  geometry: { coordinates: [number, number][] };
};
type RoutingResponse = {
  code: string;
  routes: RoutingRoute[];
};
type BookingDraft = {
  tripId: string;
  travelDate: string;
  pickup: string;
  dropoff: string;
  passengers: number;
  seatNumbers: number[];
};

function isBookingDraft(value: unknown): value is BookingDraft {
  if (typeof value !== "object" || value === null) return false;
  if (
    !("tripId" in value) ||
    typeof value.tripId !== "string" ||
    !("travelDate" in value) ||
    typeof value.travelDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.travelDate) ||
    !("pickup" in value) ||
    typeof value.pickup !== "string" ||
    !("dropoff" in value) ||
    typeof value.dropoff !== "string" ||
    !("passengers" in value) ||
    typeof value.passengers !== "number" ||
    !Number.isInteger(value.passengers) ||
    value.passengers < 1 ||
    value.passengers > MAX_PASSENGERS ||
    !("seatNumbers" in value) ||
    !Array.isArray(value.seatNumbers) ||
    !value.seatNumbers.every((seat): seat is number => typeof seat === "number" && Number.isInteger(seat))
  ) {
    return false;
  }

  const trip = TRIPS.find((item) => item.id === value.tripId);
  return Boolean(
    trip &&
    trip.pickup.includes(value.pickup) &&
    trip.dropoff.includes(value.dropoff) &&
    value.seatNumbers.length <= value.passengers &&
    new Set(value.seatNumbers).size === value.seatNumbers.length &&
    value.seatNumbers.every((seat) => seat >= 1 && seat <= trip.capacity),
  );
}

function isRoutingRoute(value: unknown): value is RoutingRoute {
  if (typeof value !== "object" || value === null || !("distance" in value) || !("duration" in value) || !("geometry" in value)) {
    return false;
  }
  if (
    typeof value.distance !== "number" ||
    !Number.isFinite(value.distance) ||
    typeof value.duration !== "number" ||
    !Number.isFinite(value.duration) ||
    typeof value.geometry !== "object" ||
    value.geometry === null ||
    !("coordinates" in value.geometry) ||
    !Array.isArray(value.geometry.coordinates) ||
    value.geometry.coordinates.length < 2
  ) {
    return false;
  }
  return value.geometry.coordinates.every((point: unknown) =>
    Array.isArray(point) &&
    point.length >= 2 &&
    typeof point[0] === "number" &&
    Number.isFinite(point[0]) &&
    point[0] >= -180 &&
    point[0] <= 180 &&
    typeof point[1] === "number" &&
    Number.isFinite(point[1]) &&
    point[1] >= -90 &&
    point[1] <= 90,
  );
}

function isRoutingResponse(value: unknown): value is RoutingResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    value.code === "Ok" &&
    "routes" in value &&
    Array.isArray(value.routes) &&
    value.routes.length > 0 &&
    isRoutingRoute(value.routes[0])
  );
}

function formatRouteDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
}

function SeatButton({
  seatNumber,
  isBooked,
  isSelected,
  saving,
  onToggle,
}: {
  seatNumber: number;
  isBooked: boolean;
  isSelected: boolean;
  saving: boolean;
  onToggle: (seatNumber: number) => void;
}) {
  const state = isBooked ? "Booked" : isSelected ? "Selected" : "Available";

  return (
    <button
      className={`booking-seat${isBooked ? " is-booked" : isSelected ? " is-selected" : ""}`}
      type="button"
      aria-label={`Seat ${seatNumber}, ${state}`}
      aria-pressed={isSelected}
      disabled={isBooked || saving}
      onClick={() => onToggle(seatNumber)}
    >
      <svg className="booking-seat-icon" viewBox="0 0 28 28" aria-hidden="true">
        <path d="M7 3.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-1v6h3v2H5v-2h3v-6H7a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <span>{seatNumber}</span>
      {isBooked && <small>Booked</small>}
      {isSelected && <small>Selected</small>}
    </button>
  );
}

export default function TransportBookingPage({ initialTripId }: { initialTripId?: string }) {
  const router = useRouter();
  const passengerAuth = usePassengerAuth();
  const initialTrip = TRIPS.find((trip) => trip.id === initialTripId);
  const bookings = useStoredList<Booking>(KEYS.bookings, []);
  const [selectedTripId, setSelectedTripId] = useState(initialTrip?.id ?? "");
  const [travelDate, setTravelDate] = useState(initialTrip?.date ?? "");
  const [pickup, setPickup] = useState(initialTrip?.pickup[0] ?? "");
  const [dropoff, setDropoff] = useState(initialTrip?.dropoff[0] ?? "");
  const [passengers, setPassengers] = useState(1);
  const [selectedSeatNumbers, setSelectedSeatNumbers] = useState<number[]>([]);
  const [showSeatSelector, setShowSeatSelector] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const passengerSession = passengerAuth.passenger;
  const authChecked = passengerAuth.ready;
  const bookingName = passengerSession?.fullName ?? name;
  const bookingEmail = passengerSession?.email ?? email;
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("mobile-money");
  const [ticket, setTicket] = useState<Booking | null>(null);
  const [ticketQr, setTicketQr] = useState("");
  const [destinationFilter, setDestinationFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [routeRetryKey, setRouteRetryKey] = useState(0);
  const [routeLookup, setRouteLookup] = useState<{
    key: string;
    status: "loading" | "ready" | "error";
    route?: RoadRoute;
  }>({ key: "", status: "loading" });

  const selectedTrip = TRIPS.find((trip) => trip.id === selectedTripId);
  const [routeOrigin, routeDestination] = selectedTrip?.route.split(" → ") ?? [];
  const routeOriginCoordinates = routeOrigin ? TRIP_CITY_COORDINATES[routeOrigin] : undefined;
  const routeDestinationCoordinates = routeDestination ? TRIP_CITY_COORDINATES[routeDestination] : undefined;
  const pickupPosition = useMemo<RoutePoint | null>(
    () => routeOriginCoordinates ? [routeOriginCoordinates.lat, routeOriginCoordinates.lng] : null,
    [routeOriginCoordinates],
  );
  const dropoffPosition = useMemo<RoutePoint | null>(
    () => routeDestinationCoordinates ? [routeDestinationCoordinates.lat, routeDestinationCoordinates.lng] : null,
    [routeDestinationCoordinates],
  );
  const routeKey = `${selectedTripId}:${pickup}:${dropoff}:${routeRetryKey}`;
  const currentRouteLookup = !pickupPosition || !dropoffPosition
    ? { key: routeKey, status: "error" as const }
    : routeLookup.key === routeKey
      ? routeLookup
      : { key: routeKey, status: "loading" as const };
  const destinations = [...new Set(TRIPS.map((trip) => trip.route.split(" → ")[1]))].sort();
  const travelDates = [...new Set(TRIPS.map((trip) => trip.date))].sort();
  const visibleTrips = TRIPS.filter((trip) => {
    const destinationMatches = destinationFilter === "all" || trip.route.endsWith(`→ ${destinationFilter}`);
    const dateMatches = dateFilter === "all" || trip.date === dateFilter;
    return destinationMatches && dateMatches;
  }).sort((first, second) => first.date.localeCompare(second.date) || first.departure.localeCompare(second.departure));
  const seatsByTrip = useMemo(
    () => new Map(TRIPS.map((trip) => [trip.id, availableSeats(trip, bookings)])),
    [bookings],
  );
  const available = selectedTrip ? (seatsByTrip.get(selectedTrip.id) ?? 0) : 0;
  const bookedSeatNumbers = selectedTrip
    ? getBookedSeatNumbers(selectedTrip.capacity, bookings, selectedTrip.id)
    : [];
  const activeSelectedSeatNumbers = selectedSeatNumbers.filter((seatNumber) => !bookedSeatNumbers.includes(seatNumber));
  const seatRows = selectedTrip
    ? Array.from({ length: Math.ceil(selectedTrip.capacity / 5) }, (_, row) =>
        Array.from({ length: 5 }, (_, column) => row * 5 + column + 1).filter((seatNumber) => seatNumber <= selectedTrip.capacity),
      )
    : [];
>>>>>>> origin/feature/integration

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
<<<<<<< HEAD
=======
    setNotice("");

    if (!passengerSession) {
      router.push(loginPath);
      return;
    }

>>>>>>> origin/feature/integration
    if (!selectedTrip) {
      setError("Choose a trip first.");
      return;
    }
<<<<<<< HEAD
    if (passengerName.trim().length < 2) {
      setError("Enter the passenger's full name.");
=======

    if (
      bookingName.trim().length < 2 ||
      bookingName.trim().length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingEmail.trim()) ||
      travelDate < selectedTrip.date ||
      !selectedTrip.pickup.includes(pickup) ||
      !selectedTrip.dropoff.includes(dropoff) ||
      passengers < 1 ||
      passengers > MAX_PASSENGERS
    ) {
      setError("Check your name, email, travel date, boarding points, and passenger count.");
>>>>>>> origin/feature/integration
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
    if (!passengerSession) {
      router.push(loginPath);
      return;
    }
    if (!selectedTrip) return;
    setSaving(true);
    setError("");
    try {
<<<<<<< HEAD
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
=======
      const booking = await createBooking(
        {
          tripId: selectedTrip.id,
          route: selectedTrip.route,
          travelDate,
          pickup,
          dropoff,
          passengers,
          seatNumbers: activeSelectedSeatNumbers,
          name: bookingName.trim(),
          email: bookingEmail.trim().toLowerCase(),
        },
        selectedTrip,
      );

>>>>>>> origin/feature/integration
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

<<<<<<< HEAD
=======
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
        ["SEAT NUMBERS", ticket.seatNumbers?.join(", ") ?? "Not recorded"],
        ["REFERENCE", ticket.reference],
      ];
      let fieldY = 205;
      for (const [label, value] of ticketFields) {
        context.fillStyle = "#64788a";
        context.font = "700 16px sans-serif";
        context.fillText(label, 78, fieldY);
        context.fillStyle = "#12304a";
        context.font = "600 24px sans-serif";
        context.fillText(value, 78, fieldY + 34, 680);
        fieldY += label === "ROUTE" ? 78 : 52;
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

  const bookingReturnPath = initialTripId
    ? `/transport-booking/details/${encodeURIComponent(initialTripId)}`
    : "/transport-booking";
  const loginPath = `/login?next=${encodeURIComponent(bookingReturnPath)}`;

>>>>>>> origin/feature/integration
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
<<<<<<< HEAD
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
=======
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

        {visibleTrips.length === 0 ? (
          <p className="module-empty">No sample departures match these filters. Choose another destination or date.</p>
        ) : (
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
        )}
        <p className="module-footnote">Fares and schedules are estimates for this project demonstration. No payment is collected.</p>
      </section>
>>>>>>> origin/feature/integration
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
<<<<<<< HEAD
          <div className="ticket-qr-wrap"><Image src={ticketQr} alt={`Mock ticket QR for ${ticket.reference}`} width={180} height={180} unoptimized /></div>
        </section>
=======
        </div>
        {!selectedTrip ? (
          ticket ? null : <p className="module-empty">This sample trip could not be found. Return to the available trips and choose another departure.</p>
        ) : !authChecked ? (
          <p className="module-empty" role="status">Checking your passenger account…</p>
        ) : !passengerSession ? (
          <div className="account-required-panel" role="status">
            <p className="module-eyebrow">PASSENGER ACCOUNT REQUIRED</p>
            <h3>Sign in before booking</h3>
            <p>Sign in or create a passenger account to reserve this trip. Your selected trip will be ready when you return.</p>
            <div className="mock-payment-actions">
              <Link className="primary-button" href={loginPath}>Sign in to continue</Link>
              <Link className="secondary-button" href={`/login?mode=register&next=${encodeURIComponent(bookingReturnPath)}`}>Create account</Link>
            </div>
          </div>
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
            <div className="booking-form-map-layout">
              <section className="booking-route-preview" aria-labelledby="booking-route-heading">
                <div className="booking-route-heading">
                  <div>
                    <h3 id="booking-route-heading">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-7.2 8-13a8 8 0 1 0-16 0c0 5.8 8 13 8 13Z" /><circle cx="12" cy="9" r="2.5" /></svg>
                      Route Map
                    </h3>
                    <p>{pickup} to {dropoff}</p>
                  </div>
                </div>
                {currentRouteLookup.status === "error" && (
                  <div className="booking-route-error" role="alert">
                    <span>Driving directions could not be loaded. The map still shows the selected towns.</span>
                    <button className="secondary-button" type="button" onClick={() => setRouteRetryKey((key) => key + 1)}>
                      Retry directions
                    </button>
                  </div>
                )}
                {pickupPosition && dropoffPosition ? (
                  <div className="booking-route-map-wrap">
                    <MapContainer
                      key={`${routeKey}:${currentRouteLookup.status}`}
                      bounds={currentRouteLookup.route?.positions ?? [pickupPosition, dropoffPosition]}
                      boundsOptions={{ paddingTopLeft: [22, 24], paddingBottomRight: [184, 24] }}
                      scrollWheelZoom
                      zoomControl={false}
                      className="route-map booking-route-map"
                    >
                      <ZoomControl position="topright" />
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {currentRouteLookup.route && (
                        <Polyline
                          positions={currentRouteLookup.route.positions}
                          pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.88 }}
                        />
                      )}
                      <RouteLocationMarker position={pickupPosition} label="Pickup" town={pickup} />
                      <RouteLocationMarker position={dropoffPosition} label="Drop-off" town={dropoff} />
                    </MapContainer>
                    <div className="booking-route-estimate" role="status" aria-live="polite">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14a2 2 0 0 1 2 2v13H3V5a2 2 0 0 1 2-2Zm0 2v7h14V5H5Zm-2 9h18v2H3v-2Zm3 5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm12 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" /></svg>
                      {currentRouteLookup.status === "ready" && currentRouteLookup.route
                        ? `${formatRouteDuration(currentRouteLookup.route.duration)} (≈${Math.round(currentRouteLookup.route.distance / 1000)} km)`
                        : currentRouteLookup.status === "loading"
                          ? "Finding road route…"
                          : "Travel estimate unavailable"}
                    </div>
                  </div>
                ) : (
                  <p className="booking-route-error" role="alert">Map directions are unavailable for this trip.</p>
                )}
              </section>

              <div className="booking-form-fields">
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
                      onChange={(event) => changePassengerCount(Number(event.target.value))}
                      disabled={available === 0}
                    >
                      {Array.from({ length: Math.min(MAX_PASSENGERS, available) }, (_, index) => index + 1).map((count) => (
                        <option key={count} value={count}>{count} passenger{count === 1 ? "" : "s"}</option>
                      ))}
                    </select>
                  </label>
                  <div className="booking-seat-picker-toggle">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setShowSeatSelector((value) => !value)}
                    >
                      {showSeatSelector ? "Hide seat selection" : `Choose seat${passengers === 1 ? "" : "s"}`}
                    </button>
                    <span className="booking-seat-count" aria-live="polite">
                      {activeSelectedSeatNumbers.length} of {passengers} selected
                      {activeSelectedSeatNumbers.length > 0 && ` · ${activeSelectedSeatNumbers.join(", ")}`}
                    </span>
                  </div>
                  {showSeatSelector && (
                    <fieldset className="booking-seat-picker" disabled={saving}>
                      <legend>Choose your seat{passengers === 1 ? "" : "s"} <span>({passengers} required)</span></legend>
                      <p className="booking-seat-instructions">Select {passengers} available seat{passengers === 1 ? "" : "s"}. Booked seats are unavailable.</p>
                      <div className="booking-seat-layout" aria-label="Bus seat layout">
                        <span className="booking-seat-front">FRONT OF BUS</span>
                        <div className="booking-seat-rows">
                          {seatRows.map((row, rowIndex) => (
                            <div className="booking-seat-row" key={rowIndex} aria-label={`Seat row ${rowIndex + 1}`}>
                              {row.slice(0, 2).map((seatNumber) => {
                                return (
                                  <SeatButton
                                    key={seatNumber}
                                    seatNumber={seatNumber}
                                    isBooked={bookedSeatNumbers.includes(seatNumber)}
                                    isSelected={activeSelectedSeatNumbers.includes(seatNumber)}
                                    saving={saving}
                                    onToggle={toggleSeat}
                                  />
                                );
                              })}
                              <span className="booking-seat-aisle" aria-hidden="true" />
                              {row.slice(2, 5).map((seatNumber) => {
                                return (
                                  <SeatButton
                                    key={seatNumber}
                                    seatNumber={seatNumber}
                                    isBooked={bookedSeatNumbers.includes(seatNumber)}
                                    isSelected={activeSelectedSeatNumbers.includes(seatNumber)}
                                    saving={saving}
                                    onToggle={toggleSeat}
                                  />
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                      <ul className="booking-seat-legend" aria-label="Seat availability legend">
                        <li><span className="booking-seat-legend-mark" /> Available</li>
                        <li><span className="booking-seat-legend-mark is-selected" /> Selected</li>
                        <li><span className="booking-seat-legend-mark is-booked" /> Booked</li>
                      </ul>
                      <p className="booking-seat-count" aria-live="polite">
                        {activeSelectedSeatNumbers.length} of {passengers} selected
                        {activeSelectedSeatNumbers.length > 0 && ` · Seat${activeSelectedSeatNumbers.length === 1 ? "" : "s"} ${activeSelectedSeatNumbers.join(", ")}`}
                      </p>
                    </fieldset>
                  )}
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
                    <input autoComplete="name" maxLength={100} value={bookingName} onChange={(event) => setName(event.target.value)} disabled={Boolean(passengerSession)} placeholder="e.g. Alex Banda" required />
                  </label>
                  <label>
                    Email address
                    <input type="email" autoComplete="email" maxLength={254} value={bookingEmail} onChange={(event) => setEmail(event.target.value)} disabled={Boolean(passengerSession)} placeholder="you@example.com" required />
                  </label>
                </div>

                <div className="reservation-actions">
                  <button className="secondary-button" type="button" onClick={returnToTrips}>Back to trips</button>
                  <button className="primary-button form-submit" type="submit" disabled={saving || available === 0 || passengers > available}>
                    Continue to payment
                  </button>
                </div>
              </div>
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
              <p>Seat{ticket.seatNumbers?.length === 1 ? "" : "s"}: {ticket.seatNumbers?.join(", ") ?? "Not recorded"}</p>
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
>>>>>>> origin/feature/integration
      )}
      <p className="module-footnote">This page uses local sample data only. Booking availability is not shared across browsers or devices.</p>
    </main>
  );
}
