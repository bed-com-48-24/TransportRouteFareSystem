"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
<<<<<<< HEAD
import { useEffect, useMemo, useState, type FormEvent } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer } from "@/components/ClientLeaflet";
import QRCode from "qrcode";
import { availableSeats, createBooking, fmtDate, TRIPS, unavailableSeatNumbers } from "@/lib/booking-data";
=======
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "@/components/ClientLeaflet";
import QRCode from "qrcode";
import { availableSeats, createBooking, fmtDate, getBookedSeatNumbers, TRIPS } from "@/lib/booking-data";
>>>>>>> origin/feature/integration
import { DISTRICT_COORDINATES, type Coordinates } from "@/lib/malawi-locations";
import { KEYS } from "@/lib/seed";
import { useStoredList } from "@/lib/storage";
import type { Booking } from "@/lib/types";
// Leaflet needs the browser, so this map only loads on the client
const TripRouteMap = dynamic(() => import("@/components/TripRouteMap"), {
  ssr: false,
  loading: () => <div className="summary-map summary-map-loading">Loading map…</div>,
});

const MAX_PASSENGERS = 8;
const SEATS_PER_ROW = 2; // the design shows 2 seats per row; use 4 for a wider bus
const BOOKING_DRAFT_KEY = "routewise-pending-booking-v1";
const TRIP_CITY_COORDINATES: Record<string, Coordinates> = {
  ...DISTRICT_COORDINATES,
  Limbe: { lat: -15.8103, lng: 35.0586 },
  Mzuzu: { lat: -11.4656, lng: 34.0207 },
};

<<<<<<< HEAD
function parseRoadRoute(payload: unknown): [number, number][] {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("routes" in payload) ||
    !Array.isArray(payload.routes)
  ) {
    throw new Error("The road routing service returned an invalid response.");
  }

  const routes: unknown[] = payload.routes;
  const firstRoute = routes[0];
  if (
    typeof firstRoute !== "object" ||
    firstRoute === null ||
    !("geometry" in firstRoute) ||
    typeof firstRoute.geometry !== "object" ||
    firstRoute.geometry === null ||
    !("coordinates" in firstRoute.geometry) ||
    !Array.isArray(firstRoute.geometry.coordinates)
  ) {
    throw new Error("No road route is available for this trip.");
  }

  const routeCoordinates: unknown[] = firstRoute.geometry.coordinates;
  const positions: [number, number][] = [];
  for (const point of routeCoordinates) {
    if (
      !Array.isArray(point) ||
      typeof point[0] !== "number" ||
      !Number.isFinite(point[0]) ||
      typeof point[1] !== "number" ||
      !Number.isFinite(point[1])
    ) {
      throw new Error("The road routing service returned invalid route coordinates.");
    }
    positions.push([point[1], point[0]]);
  }

  if (positions.length < 2) {
    throw new Error("No road route is available for this trip.");
  }

  return positions;
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

function to12Hour(time: string) {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
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
      type="button"
      className={`bus-seat${isBooked ? " is-booked" : isSelected ? " is-selected" : ""}`}
      aria-label={`Seat ${seatNumber}, ${state}`}
      aria-pressed={isSelected}
      disabled={isBooked || saving}
      onClick={() => onToggle(seatNumber)}
    >
      {seatNumber}
    </button>
  );
>>>>>>> origin/feature/integration
}

export default function TransportBookingPage({ initialTripId }: { initialTripId?: string }) {
  const router = useRouter();
  const initialTrip = TRIPS.find((trip) => trip.id === initialTripId);
  const bookings = useStoredList<Booking>(KEYS.bookings, []);
  const [selectedTripId, setSelectedTripId] = useState(initialTrip?.id ?? "");
  const [travelDate, setTravelDate] = useState(initialTrip?.date ?? "");
  const [pickup, setPickup] = useState(initialTrip?.pickup[0] ?? "");
  const [dropoff, setDropoff] = useState(initialTrip?.dropoff[0] ?? "");
  const [passengers, setPassengers] = useState(1);
  const [selectedSeatNumbers, setSelectedSeatNumbers] = useState<number[]>([]);
<<<<<<< HEAD
=======
  
>>>>>>> origin/feature/integration
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
<<<<<<< HEAD
  const [roadRoute, setRoadRoute] = useState<[number, number][]>([]);
  const [roadRouteLoading, setRoadRouteLoading] = useState(false);
  const [roadRouteError, setRoadRouteError] = useState("");

  const selectedTrip = TRIPS.find((trip) => trip.id === selectedTripId);
  const routeCities = selectedTrip ? selectedTrip.route.split(" → ") : [];
  const tripOriginCity = routeCities[0] ?? "";
  const tripDestinationCity = routeCities[1] ?? "";
  const tripOriginCoordinates = tripOriginCity ? TRIP_CITY_COORDINATES[tripOriginCity] : undefined;
  const tripDestinationCoordinates = tripDestinationCity ? TRIP_CITY_COORDINATES[tripDestinationCity] : undefined;
  useEffect(() => {
    setRoadRoute([]);
    setRoadRouteError("");
    if (!selectedTrip || !tripOriginCoordinates || !tripDestinationCoordinates) {
      setRoadRouteLoading(false);
      return;
    }

    const controller = new AbortController();
    setRoadRouteLoading(true);
    const coordinates = `${tripOriginCoordinates.lng},${tripOriginCoordinates.lat};${tripDestinationCoordinates.lng},${tripDestinationCoordinates.lat}`;
    void fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`The road routing service returned ${response.status}.`);
        }
        return parseRoadRoute(await response.json());
      })
      .then(setRoadRoute)
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === "AbortError") return;
        setRoadRouteError(reason instanceof Error ? reason.message : "The road route could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setRoadRouteLoading(false);
      });

    return () => controller.abort();
  }, [
    selectedTrip?.id,
    tripDestinationCoordinates?.lat,
    tripDestinationCoordinates?.lng,
    tripOriginCoordinates?.lat,
    tripOriginCoordinates?.lng,
  ]);
  const tripMapCenter = tripOriginCoordinates && tripDestinationCoordinates
    ? {
        lat: (tripOriginCoordinates.lat + tripDestinationCoordinates.lat) / 2,
        lng: (tripOriginCoordinates.lng + tripDestinationCoordinates.lng) / 2,
      }
    : { lat: -13.4, lng: 34.2 };
  const routeStartIcon = L.divIcon({
    className: "custom-route-marker start-marker",
    html: '<span class="marker-pin marker-start"><span class="marker-inner"></span></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  });
  const routeEndIcon = L.divIcon({
    className: "custom-route-marker end-marker",
    html: '<span class="marker-pin marker-end"><span class="marker-inner"></span></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  });
=======
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
>>>>>>> origin/feature/integration
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
<<<<<<< HEAD
  const unavailableSeats = selectedTrip ? new Set(unavailableSeatNumbers(selectedTrip, bookings)) : new Set<number>();
  const seatRows = selectedTrip
    ? Array.from({ length: Math.ceil(selectedTrip.capacity / 4) }, (_, rowIndex) =>
        Array.from(
          { length: Math.min(4, selectedTrip.capacity - rowIndex * 4) },
          (_, seatIndex) => rowIndex * 4 + seatIndex + 1,
        ),
      )
    : [];

  function renderSeat(seatNumber: number) {
    const isUnavailable = unavailableSeats.has(seatNumber);
    const isSelected = selectedSeatNumbers.includes(seatNumber);
    return (
      <button
        key={seatNumber}
        type="button"
        className={`bus-seat${isSelected ? " is-selected" : ""}${isUnavailable ? " is-unavailable" : ""}`}
        aria-label={`Seat ${seatNumber}${isUnavailable ? ", unavailable" : isSelected ? ", selected" : ", available"}`}
        aria-pressed={isSelected}
        disabled={isUnavailable || (!isSelected && selectedSeatNumbers.length >= passengers)}
        onClick={() => {
          setSelectedSeatNumbers((current) =>
            isSelected
              ? current.filter((selectedSeat) => selectedSeat !== seatNumber)
              : [...current, seatNumber],
          );
        }}
      >
        {seatNumber}
      </button>
    );
  }
=======
  const bookedSeatNumbers = selectedTrip
    ? getBookedSeatNumbers(selectedTrip.capacity, bookings, selectedTrip.id)
    : [];
  const activeSelectedSeatNumbers = selectedSeatNumbers.filter((seatNumber) => !bookedSeatNumbers.includes(seatNumber));
    const seatNumbers = selectedTrip
    ? Array.from({ length: selectedTrip.capacity }, (_, index) => index + 1)
    : [];
  const selectedCount = activeSelectedSeatNumbers.length;
  const seatSummary =
    selectedCount === 0
      ? "No seat selected"
      : `${selectedCount} seat${selectedCount === 1 ? "" : "s"} (Seat${selectedCount === 1 ? "" : "s"} ${activeSelectedSeatNumbers.join(", ")})`;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const draft = sessionStorage.getItem(BOOKING_DRAFT_KEY);
        if (draft) {
          sessionStorage.removeItem(BOOKING_DRAFT_KEY);
          const parsed: unknown = JSON.parse(draft);
          if (!isBookingDraft(parsed)) {
            throw new Error("Your saved booking details could not be restored. Please choose a trip again.");
          }
          setSelectedTripId(parsed.tripId);
          setTravelDate(parsed.travelDate);
          setPickup(parsed.pickup);
          setDropoff(parsed.dropoff);
          setPassengers(parsed.passengers);
          setSelectedSeatNumbers(parsed.seatNumbers);
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Your booking details could not be restored.");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

    function toggleSeat(seatNumber: number) {
    if (bookedSeatNumbers.includes(seatNumber)) return;

    let next: number[];
    if (activeSelectedSeatNumbers.includes(seatNumber)) {
      next = activeSelectedSeatNumbers.filter((selected) => selected !== seatNumber);
    } else {
      if (activeSelectedSeatNumbers.length >= MAX_PASSENGERS) {
        setError(`You can book up to ${MAX_PASSENGERS} seats at a time.`);
        return;
      }
      next = [...activeSelectedSeatNumbers, seatNumber].sort((first, second) => first - second);
    }

    setSelectedSeatNumbers(next);
    setPassengers(Math.max(1, next.length));
    setError("");
  }

  function clearSeats() {
    setSelectedSeatNumbers([]);
    setPassengers(1);
    setError("");
  }

  useEffect(() => {
    if (!selectedTrip || !pickupPosition || !dropoffPosition) return;
    const controller = new AbortController();
    const [startLat, startLng] = pickupPosition;
    const [endLat, endLng] = dropoffPosition;
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

    async function loadRoadRoute() {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`Routing service returned ${response.status}`);
        const result: unknown = await response.json();
        if (!isRoutingResponse(result)) throw new Error("Routing service returned an invalid route");

        const route = result.routes[0];
        setRouteLookup({
          key: routeKey,
          status: "ready",
          route: {
            positions: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
            distance: route.distance,
            duration: route.duration,
          },
        });
      } catch {
        if (controller.signal.aborted) return;
        setRouteLookup({ key: routeKey, status: "error" });
      }
    }

    void loadRoadRoute();
    return () => controller.abort();
  }, [dropoffPosition, pickupPosition, routeKey, selectedTrip]);
>>>>>>> origin/feature/integration

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
      (email.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) ||
      travelDate < selectedTrip.date ||
      !selectedTrip.pickup.includes(pickup) ||
      !selectedTrip.dropoff.includes(dropoff) ||
      passengers < 1 ||
      passengers > MAX_PASSENGERS
    ) {
      setError("Check your name, email, travel date, boarding points, and passenger count.");
      return;
    }

<<<<<<< HEAD
    if (
      selectedSeatNumbers.length !== passengers ||
      selectedSeatNumbers.some((seatNumber) => unavailableSeats.has(seatNumber))
    ) {
      setError(`Select ${passengers} available seat${passengers === 1 ? "" : "s"} in the bus layout.`);
=======
    if (activeSelectedSeatNumbers.length !== passengers) {
      setError(`Select ${passengers} available seat${passengers === 1 ? "" : "s"} on the bus before continuing.`);
>>>>>>> origin/feature/integration
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
<<<<<<< HEAD
          seatNumbers: selectedSeatNumbers,
=======
          seatNumbers: activeSelectedSeatNumbers,
>>>>>>> origin/feature/integration
          name: name.trim(),
          email: email.trim().toLowerCase(),
        },
        selectedTrip,
      );

      if (!booking) {
<<<<<<< HEAD
        setError("A selected seat may have just been booked, or the trip no longer has enough capacity. Go back and choose available seats or another departure.");
=======
        setError("One or more selected seats have just been booked. Choose different available seat numbers and try again.");
>>>>>>> origin/feature/integration
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
        seatNumbers: booking.seatNumbers,
      }), { errorCorrectionLevel: "H", margin: 1, width: 280 });

      setTicket(booking);
      setTicketQr(qr);
      setPaymentPending(false);
      setNotice("Mock payment complete. Your bus ticket is ready.");
      setSelectedTripId("");
      setSelectedSeatNumbers([]);
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
<<<<<<< HEAD
        ["SEATS", ticket.seatNumbers?.join(", ") ?? "Not assigned"],
=======
        ["SEAT NUMBERS", ticket.seatNumbers?.join(", ") ?? "Not recorded"],
>>>>>>> origin/feature/integration
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

  return (
      <main className={`module-shell${initialTripId ? " module-shell-wide" : ""}`}>
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
        <section className="module-section booking-section" aria-label="Reserve your seat">
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
<<<<<<< HEAD
          <div className="reservation-layout">
            <div className="reservation-map-panel">
              <div className="module-section-heading compact-heading">
                <div>
                  <p className="module-eyebrow">ROUTE OVERVIEW</p>
                  <h3>{selectedTrip.route}</h3>
                </div>
              </div>
              <div className="network-map compact-map">
                <MapContainer center={[tripMapCenter.lat, tripMapCenter.lng]} zoom={6} scrollWheelZoom className="route-map">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {tripOriginCoordinates && tripDestinationCoordinates && (
                    <>
                      {roadRoute.length > 1 && (
                        <Polyline
                          positions={roadRoute}
                          pathOptions={{ color: "#d72f2f", weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round" }}
                        />
                      )}
                      <Marker position={[tripOriginCoordinates.lat, tripOriginCoordinates.lng]} icon={routeStartIcon}>
                        <Popup>Starting point: {tripOriginCity}</Popup>
                      </Marker>
                      <Marker position={[tripDestinationCoordinates.lat, tripDestinationCoordinates.lng]} icon={routeEndIcon}>
                        <Popup>Destination: {tripDestinationCity}</Popup>
                      </Marker>
                    </>
                  )}
                </MapContainer>
              </div>
              {roadRouteLoading && <p className="route-map-status" role="status">Loading road route…</p>}
              {roadRouteError && <p className="route-map-error" role="alert">{roadRouteError}</p>}
              <div className="route-legend">
                <span><i className="legend-dot start-dot" /> Start</span>
                <span><i className="legend-dot end-dot" /> Destination</span>
              </div>
            </div>

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
                    onChange={(event) => {
                      const count = Number(event.target.value);
                      setPassengers(count);
                      setSelectedSeatNumbers((current) => current.slice(0, count));
                    }}
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
              <section className="bus-seats-section" aria-labelledby="seat-selection-heading">
                <div className="bus-seat-heading">
                  <div>
                    <p className="module-eyebrow">CHOOSE YOUR SEAT</p>
                    <h3 id="seat-selection-heading">Select seats inside the bus</h3>
                  </div>
                  <p aria-live="polite">{selectedSeatNumbers.length} of {passengers} selected</p>
                </div>
                <div className="bus-cabin">
                  <div className="bus-cabin-front">
                    <span>FRONT OF BUS</span>
                    <span className="bus-driver">Driver</span>
                  </div>
                  <div className="bus-seat-grid" role="group" aria-label="Available bus seats">
                    {seatRows.map((row, rowIndex) => (
                      <div className="bus-seat-row" key={rowIndex}>
                        {row.slice(0, 2).map(renderSeat)}
                        <span className="bus-aisle" aria-hidden="true" />
                        {row.slice(2).map(renderSeat)}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bus-seat-legend" aria-label="Seat key">
                  <span><i className="seat-key available-seat-key" /> Available</span>
                  <span><i className="seat-key selected-seat-key" /> Selected</span>
                  <span><i className="seat-key unavailable-seat-key" /> Unavailable</span>
                </div>
                <p className="module-footnote">Choose {passengers} seat{passengers === 1 ? "" : "s"} for your passenger{passengers === 1 ? "" : "s"}. Gray seats are already booked.</p>
              </section>
              <div className="reservation-actions">
                <button className="secondary-button" type="button" onClick={returnToTrips}>Back to trips</button>
                <button className="primary-button form-submit" type="submit" disabled={saving || available === 0 || passengers > available}>
                  Continue to payment
                </button>
              </div>
            </form>
          </div>
=======
          <form className="booking-layout" onSubmit={submitBooking} noValidate>
            {/* LEFT CARD: seats + passenger details */}
            <section className="booking-card" aria-labelledby="reservation-heading">
              <p className="module-eyebrow">RESERVE YOUR SEAT</p>
              <h2 id="reservation-heading" tabIndex={-1}>Select your seats</h2>
              <p className="booking-help">Click on the seats you want. Selected seats will be highlighted in dark blue.</p>

              <div className="booking-card-body">
                {/* Bus diagram */}
                <div className="bus-diagram" aria-label="Bus seat layout">
                  <div className="bus-body">
                    <span className="bus-chip bus-chip-top">Driver</span>
                    <fieldset className="bus-seats" disabled={saving} style={{ "--cols": SEATS_PER_ROW } as CSSProperties}>
                      <legend className="sr-only">Choose your seats</legend>
                      {seatNumbers.map((seatNumber) => (
                        <SeatButton
                          key={seatNumber}
                          seatNumber={seatNumber}
                          isBooked={bookedSeatNumbers.includes(seatNumber)}
                          isSelected={activeSelectedSeatNumbers.includes(seatNumber)}
                          saving={saving}
                          onToggle={toggleSeat}
                        />
                      ))}
                    </fieldset>
                    <span className="bus-chip bus-chip-bottom">Back</span>
                  </div>
                </div>

                {/* Legend + form fields */}
                <div className="booking-fields">
                  <ul className="seat-legend" aria-label="Seat legend">
                    <li><i className="dot dot-available" /> Available</li>
                    <li><i className="dot dot-selected" /> Selected</li>
                    <li><i className="dot dot-booked" /> Booked</li>
                  </ul>

                  <div className="selected-seats-box" aria-live="polite">
                    <span className="info-dot" aria-hidden="true">i</span>
                    <span>Selected Seats: {selectedCount > 0 ? activeSelectedSeatNumbers.join(", ") : "none yet"}</span>
                    {selectedCount > 0 && (
                      <button type="button" className="link-button" onClick={clearSeats}>Clear</button>
                    )}
                  </div>

                  <h3 className="booking-subheading">Passenger Details</h3>
                  <label>
                    Passenger 1{activeSelectedSeatNumbers[0] ? ` (Seat ${activeSelectedSeatNumbers[0]})` : ""}
                    <input
                      autoComplete="name"
                      maxLength={100}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Full Name (e.g. Alex Banda)"
                      required
                    />
                  </label>

                  <h3 className="booking-subheading">Boarding Points</h3>
                  <div className="booking-two-col">
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
                  </div>

                  <h3 className="booking-subheading">Contact Information</h3>
                  <label>
                    Email address (optional)
                    <input
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Email Address (optional)"
                    />
                  </label>

                  <button className="primary-button booking-continue" type="submit" disabled={saving || available === 0}>
                    Continue to Payment →
                  </button>
                </div>
              </div>
            </section>

            {/* RIGHT CARD: trip summary + route map */}
            <aside className="booking-summary" aria-label="Trip summary">
              <h2 className="summary-title">
                <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
                  <path fill="currentColor" d="M4 16c0 .9.4 1.7 1 2.2V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.8c.6-.5 1-1.3 1-2.2V6c0-3.5-3.6-4-8-4S4 2.5 4 6v10Zm3.5 1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM6 11V6h12v5H6Z" />
                </svg>
                Trip Summary
              </h2>

              <dl className="summary-rows">
                <div><dt>Route</dt><dd>{selectedTrip.route}</dd></div>
                <div><dt>Date</dt><dd>{fmtDate(travelDate || selectedTrip.date)}</dd></div>
                <div><dt>Time</dt><dd>{to12Hour(selectedTrip.departure)}</dd></div>
                <div><dt>Seats</dt><dd>{seatSummary}</dd></div>
                <div><dt>Fare</dt><dd className="summary-fare">MWK {(selectedTrip.fare * passengers).toLocaleString("en-MW")}</dd></div>
              </dl>

              <h3 className="summary-map-title">
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
                </svg>
                Route Map
              </h3>

              {currentRouteLookup.status === "error" && (
                <div className="booking-route-error" role="alert">
                  <span>Driving directions could not be loaded.</span>
                  <button className="secondary-button" type="button" onClick={() => setRouteRetryKey((key) => key + 1)}>
                    Retry directions
                  </button>
                </div>
              )}

              {pickupPosition && dropoffPosition ? (
                <TripRouteMap
                  from={routeOrigin ?? ""}
                  to={routeDestination ?? ""}
                  start={pickupPosition}
                  end={dropoffPosition}
                  route={currentRouteLookup.route}
                  loading={currentRouteLookup.status === "loading"}
                />
              ) : (
                <p className="booking-route-error" role="alert">Map directions are unavailable for this trip.</p>
              )}
              <p className="booking-route-attribution">Road route via OSRM using OpenStreetMap data.</p>
            </aside>
          </form>
>>>>>>> origin/feature/integration
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
              {ticket.seatNumbers?.length ? <p>Seat{ticket.seatNumbers.length === 1 ? "" : "s"}: {ticket.seatNumbers.join(", ")}</p> : null}
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
