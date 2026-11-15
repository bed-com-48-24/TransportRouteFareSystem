"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import DemoDataNotice from "@/components/DemoDataNotice";
import { useRoadRoutes } from "@/components/road-routing";
import { travelEstimate } from "@/lib/geo";
import QRCode from "qrcode";
import { adminReservedSeatNumbers, availableSeatNumbers, availableSeats, fmtDate } from "@/lib/booking-data";
import { nearestTransportTown, TRANSPORT_TOWN_COORDINATES, type Coordinates } from "@/lib/malawi-locations";
import { notifyBookingStatus } from "@/lib/notifications";
import { readSavedRoutes, savedRouteId, toggleSavedRoute } from "@/lib/saved-routes";
import { useBackendRoutes, useBackendTrips, useMyBookings } from "@/lib/use-backend-data";
import type { Booking, Trip } from "@/lib/types";
import { toBooking } from "@/services/adapters";
import * as apiBookings from "@/services/bookings.service";
import * as apiPayments from "@/services/payments.service";
import * as apiSchedules from "@/services/schedules.service";
import type { Payment, PaymentMethod } from "@/services/types";
import { useSession } from "@/lib/auth";

const TripMap = dynamic(() => import("@/components/TripMap"), {
  ssr: false,
  loading: () => <p className="module-empty">Loading map…</p>,
});

const MAX_PASSENGERS = 5;
const SEAT_COLUMNS = [1, 2, 4, 5];

function paymentMethodLabel(method?: Booking["paymentMethod"]) {
  switch (method) {
    case "tnm": return "TNM Mpamba";
    case "airtel": return "Airtel Money";
    case "bank": return "Bank transfer";
    case "card": return "Card";
    default: return "Not recorded";
  }
}

/** Read a booking search value passed from the home page on the client only. */
function readQueryParam(name: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name)?.trim() ?? "";
}

export default function TransportBookingPage({ initialTripId }: { initialTripId?: string }) {
  const session = useSession();
  const { data: trips, usingDemo: tripsAreDemo } = useBackendTrips();
  const { data: routes } = useBackendRoutes();
  const { data: bookings } = useMyBookings();
  const initialTrip = trips.find((trip) => trip.id === initialTripId);
  const [selectedTripId, setSelectedTripId] = useState(initialTrip?.id ?? "");
  const [showDepartures, setShowDepartures] = useState(Boolean(initialTripId));
  const [origin, setOrigin] = useState(initialTrip?.route.split(" → ")[0] ?? "");
  const [destination, setDestination] = useState(initialTrip?.route.split(" → ")[1] ?? "");
  const [travelDate, setTravelDate] = useState(initialTrip?.date ?? "");
  const [pickup, setPickup] = useState(initialTrip?.pickup[0] ?? "");
  const [dropoff, setDropoff] = useState(initialTrip?.dropoff[0] ?? "");
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [bookingStage, setBookingStage] = useState<"seats" | "details">("seats");
  const [seatError, setSeatError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [notificationError, setNotificationError] = useState("");
  const [saving, setSaving] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paymentResult, setPaymentResult] = useState<Payment | null>(null);
  const [liveAvailableSeatNumbers, setLiveAvailableSeatNumbers] = useState<number[] | null>(null);
  const [ticket, setTicket] = useState<Booking | null>(null);
  const [ticketQr, setTicketQr] = useState("");
  const [showTicket, setShowTicket] = useState(false);
  const [tripView, setTripView] = useState<"cards" | "map">("cards");
  const [searchError, setSearchError] = useState("");
  const [savedRouteIds, setSavedRouteIds] = useState<string[]>([]);
  const [saveRouteError, setSaveRouteError] = useState("");
  const [locationStatus, setLocationStatus] = useState("Finding your current location…");
  const [userPosition, setUserPosition] = useState<Coordinates | null>(null);
  useEffect(() => {
    let cancelled = false;
    apiPayments.listMethods().then((methods) => {
      if (cancelled) return;
      const supported = methods.filter((method) => method.id === "mobile_money" || method.id === "bank_card");
      setPaymentMethods(supported);
      setPaymentMethodId((current) => current || supported[0]?.id || "");
    }).catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : "Payment methods could not be loaded.");
    });
    return () => { cancelled = true; };
  }, []);
  const selectedTrip = trips.find((trip) => trip.id === selectedTripId);
  useEffect(() => {
    if (!selectedTrip) {
      setLiveAvailableSeatNumbers(null);
      return;
    }
    let cancelled = false;
    setLiveAvailableSeatNumbers(null);
    apiSchedules.getSeats(Number(selectedTrip.id), selectedTrip.date).then((result) => {
      if (cancelled) return;
      let available: number[] | null = null;
      if (Array.isArray(result.seats)) {
        available = result.seats
          .filter((seat) => seat.available)
          .map((seat) => seat.seatNumber);
      } else if (Array.isArray(result.availableSeats)) {
        available = result.availableSeats.map(Number);
      } else if (Array.isArray(result.bookedSeats)) {
        const booked = new Set(result.bookedSeats.map(Number));
        available = Array.from({ length: result.capacity ?? selectedTrip.capacity }, (_, index) => index + 1)
          .filter((seat) => !booked.has(seat));
      }
      setLiveAvailableSeatNumbers(available);
    }).catch(() => {
      if (!cancelled) setLiveAvailableSeatNumbers(null);
    });
    return () => { cancelled = true; };
  }, [selectedTrip?.id, selectedTrip?.date, selectedTrip?.capacity]);
  const towns = [...new Set([
    ...routes.flatMap((route) => [route.origin, route.destination]),
    ...trips.flatMap((trip) => trip.route.split(" → ")),
  ])].sort();

  const [minTravelDate, setMinTravelDate] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const today = new Date();
      setMinTravelDate(
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const hasRouteSelection = Boolean(origin.trim() && destination.trim());
  const hasDefinedRoute = useMemo(
    () =>
      hasRouteSelection &&
      routes.some(
        (route) =>
          route.origin.trim().toLocaleLowerCase() === origin.trim().toLocaleLowerCase() &&
          route.destination.trim().toLocaleLowerCase() === destination.trim().toLocaleLowerCase(),
      ),
    [routes, origin, destination, hasRouteSelection],
  );

  const routeTrips = useMemo(() => {
    if (!hasRouteSelection) return [];
    return trips
      .filter((trip) => {
        if (trip.date < minTravelDate) return false;
        const [tripOrigin, tripDestination] = trip.route.split(" → ");
        return (
          tripOrigin?.trim().toLocaleLowerCase() === origin.trim().toLocaleLowerCase() &&
          tripDestination?.trim().toLocaleLowerCase() === destination.trim().toLocaleLowerCase()
        );
      })
      .sort((first, second) => first.date.localeCompare(second.date) || first.departure.localeCompare(second.departure));
  }, [trips, origin, destination, hasRouteSelection, minTravelDate]);

  const upcomingTrips = useMemo(
    () =>
      trips
        .filter((trip) => trip.date >= minTravelDate)
        .sort((first, second) => first.date.localeCompare(second.date) || first.departure.localeCompare(second.departure)),
    [trips, minTravelDate],
  );

  const scheduledDates = useMemo(() => {
    const source = hasRouteSelection ? routeTrips : upcomingTrips;
    return [...new Set(source.map((trip) => trip.date))].sort();
  }, [hasRouteSelection, routeTrips, upcomingTrips]);

  const displayedTrips = useMemo(() => {
    if (!hasRouteSelection) return upcomingTrips;
    if (!travelDate) return routeTrips;
    return routeTrips.filter((trip) => trip.date === travelDate);
  }, [hasRouteSelection, routeTrips, travelDate, upcomingTrips]);

  const detailTrip = selectedTrip;
  const allMapTrips = useMemo(() => {
    const list = tripView === "map" ? [...displayedTrips] : [];
    if (detailTrip && !list.some((t) => t.id === detailTrip.id)) {
      list.push(detailTrip);
    }
    return list;
  }, [tripView, displayedTrips, detailTrip]);
  const tripRoadRoutes = useRoadRoutes(allMapTrips.flatMap((trip) => {
    const [origin, destination] = trip.route.split(" → ");
    const originCoordinates = TRANSPORT_TOWN_COORDINATES[origin];
    const destinationCoordinates = TRANSPORT_TOWN_COORDINATES[destination];
    return originCoordinates && destinationCoordinates
      ? [{ id: trip.id, origin: originCoordinates, destination: destinationCoordinates }]
      : [];
  }));
  const visibleTripGeometry = (tripView === "map" ? displayedTrips : detailTrip ? [detailTrip] : [])
    .filter((trip) => {
      const [origin, destination] = trip.route.split(" → ");
      return TRANSPORT_TOWN_COORDINATES[origin] && TRANSPORT_TOWN_COORDINATES[destination];
    })
    .map((trip) => tripRoadRoutes[trip.id]);
  const isTripRouting = visibleTripGeometry.some((geometry) => !geometry || geometry.status === "loading");
  const tripFallbackCount = visibleTripGeometry.filter((geometry) => geometry?.status === "fallback").length;
  const seatsByTrip = useMemo(
    () => new Map(trips.map((trip) => [trip.id, availableSeats(trip, bookings)])),
    [trips, bookings],
  );
  const adminSeats = useMemo(
    () => (selectedTrip ? adminReservedSeatNumbers(selectedTrip) : []),
    [selectedTrip],
  );
  const availableSeatList = useMemo(
    () => {
      const seats = liveAvailableSeatNumbers ?? (selectedTrip ? availableSeatNumbers(selectedTrip, bookings) : []);
      return seats.filter((seat) => !adminSeats.includes(seat));
    },
    [selectedTrip, bookings, liveAvailableSeatNumbers, adminSeats],
  );
  const available = availableSeatList.length;
  const passengers = selectedSeats.length;
  const seatLimitReached = passengers >= MAX_PASSENGERS;

  function toggleTripSaved(route: string, fare: number) {
    setSaveRouteError("");
    try {
      setSavedRouteIds(toggleSavedRoute(route, fare).map((item) => item.id));
    } catch {
      setSaveRouteError("That route could not be saved in this browser. Please try again.");
    }
  }
  const onboardSeats = selectedTrip ? selectedTrip.capacity - availableSeatList.length : 0;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setSavedRouteIds(readSavedRoutes().map((route) => route.id));
      } catch {
        // Saved routes are optional; leave the bookmarks empty.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      const timer = window.setTimeout(
        () => setLocationStatus("Location is unavailable. Enter your starting town."),
        0,
      );
      return () => window.clearTimeout(timer);
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserPosition(coordinates);
        setLocationStatus("");
        if (initialTripId) return;

        const nearest = nearestTransportTown(coordinates);
        if (nearest) {
          setOrigin((current) => current || nearest.town);
        } else {
          setLocationStatus("Your location is outside supported towns. Enter your starting town.");
        }
      },
      (reason) => {
        setLocationStatus(
          reason.code === reason.PERMISSION_DENIED
            ? "Location permission was denied. Enter your starting town."
            : "Your location could not be found. Enter your starting town.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, [initialTripId]);

  useEffect(() => {
    if (initialTripId) return;
    const queryOrigin = readQueryParam("origin");
    const queryDestination = readQueryParam("destination");
    if (!queryOrigin && !queryDestination) return;

    // Apply the search passed from the home page after hydration so the
    // server-rendered form and the client form start from the same values.
    const frame = window.requestAnimationFrame(() => {
      if (queryOrigin) setOrigin(queryOrigin);
      if (queryDestination) setDestination(queryDestination);
      setShowDepartures(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialTripId]);

  useEffect(() => {
    if (!initialTrip || (selectedTripId && selectedTripId !== initialTrip.id)) return;
    const timer = window.setTimeout(() => {
      setSelectedTripId(initialTrip.id);
      setTravelDate((curr) => curr || initialTrip.date);
      setPickup((curr) => curr || initialTrip.pickup[0] || "");
      setDropoff((curr) => curr || initialTrip.dropoff[0] || "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialTrip, selectedTripId]);

  function resetTripSelection() {
    setSelectedTripId("");
    setSelectedSeats([]);
    setBookingStage("seats");
    setSeatError("");
    setPaymentPending(false);
    setSearchError("");
    setError("");
    setNotice("");
    setPaymentResult(null);
  }

  function startBooking() {
    setSearchError("");
    setShowDepartures(true);
    setTimeout(() => {
      document.getElementById("trip-results")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    }, 50);
  }

  function searchTrips(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetTripSelection();
    setShowDepartures(true);

    if (!origin.trim() || !destination.trim()) {
      setSearchError("Enter a departure location and destination.");
      return;
    }
    if (origin.trim().toLocaleLowerCase() === destination.trim().toLocaleLowerCase()) {
      setSearchError("Choose a destination different from your departure location.");
      return;
    }
    if (!hasDefinedRoute) {
      setSearchError(`A direct route from ${origin.trim()} to ${destination.trim()} has not been defined by the admin.`);
      return;
    }
    if (travelDate && travelDate < minTravelDate) {
      setSearchError("Choose a future travel date.");
      return;
    }
    if (travelDate && !scheduledDates.includes(travelDate)) {
      setSearchError("Choose a travel date that has an admin-scheduled trip for this route.");
      return;
    }

    setTimeout(() => {
      document.getElementById("trip-results")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    }, 50);
  }

  function toggleSeat(seat: number) {
    if (adminSeats.includes(seat)) {
      setSeatError("Seat 1 is reserved by the transport admin and sits next to the door.");
      return;
    }
    if (!availableSeatList.includes(seat)) {
      setSeatError(`Seat ${seat} is already taken. Choose an available seat.`);
      return;
    }

    setSeatError("");
    setSelectedSeats((current) => {
      if (current.includes(seat)) {
        return current.filter((selected) => selected !== seat);
      }
      if (current.length >= MAX_PASSENGERS) {
        return current;
      }
      return [...current, seat].sort((first, second) => first - second);
    });

    if (!selectedSeats.includes(seat) && selectedSeats.length >= MAX_PASSENGERS) {
      setSeatError(`You can book up to ${MAX_PASSENGERS} seats in one reservation.`);
    }
  }

  function confirmSeats() {
    if (!selectedTrip) return;
    if (selectedSeats.length === 0) {
      setSeatError("Choose at least one available seat to continue.");
      return;
    }
    if (selectedSeats.some((seat) => !availableSeatList.includes(seat))) {
      setSeatError("One of your seats has just been taken. Choose another seat.");
      return;
    }
    setSeatError("");
    setBookingStage("details");
    setTimeout(() => {
      document.getElementById("reservation-heading")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    }, 50);
  }

  function selectTripForBooking(trip: Trip) {
    const seatsLeft = seatsByTrip.get(trip.id) ?? availableSeats(trip, bookings);
    if (seatsLeft === 0) return;

    setSelectedTripId(trip.id);
    setTravelDate(trip.date);
    setPickup(trip.pickup[0] ?? "");
    setDropoff(trip.dropoff[0] ?? "");
    setSelectedSeats([]);
    setBookingStage("seats");
    setSeatError("");
    setPaymentPending(false);
    setError("");
    setNotice("");

    setTimeout(() => {
      document.getElementById("reservation-heading")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    }, 50);
  }

  function returnToTrips() {
    document.getElementById("trips-heading")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!session) {
      setError("Sign in as a passenger before booking. The backend requires an authenticated account.");
      return;
    }

    if (!selectedTrip) {
      setError("Choose a trip before continuing.");
      return;
    }

    if (
      name.trim().length < 2 ||
      name.trim().length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      travelDate !== selectedTrip.date ||
      travelDate < minTravelDate ||
      !selectedTrip.pickup.includes(pickup) ||
      !selectedTrip.dropoff.includes(dropoff) ||
      selectedSeats.length < 1 ||
      selectedSeats.length > MAX_PASSENGERS
    ) {
      setError("Check your name, email, travel date, boarding points, and seat selection.");
      return;
    }

    if (selectedSeats.some((seat) => !availableSeatList.includes(seat))) {
      setError("One of your seats is no longer available. Go back and choose another seat.");
      return;
    }

    setPaymentPending(true);
  }

  async function completePayment() {
    if (!selectedTrip) return;

    const selectedMethod = paymentMethods.find((method) => method.id === paymentMethodId);
    if (!selectedMethod) {
      setError("Choose an available payment method.");
      return;
    }

    setSaving(true);
    setError("");
    setNotificationError("");
    try {
      const activeTrip = trips.find((trip) => trip.id === selectedTrip.id);
      if (
        !activeTrip ||
        activeTrip.date !== travelDate ||
        !activeTrip.pickup.includes(pickup) ||
        !activeTrip.dropoff.includes(dropoff)
      ) {
        setError("This scheduled trip is no longer available. Search again and choose an active departure.");
        setPaymentPending(false);
        return;
      }

      const seats = [...selectedSeats].sort((first, second) => first - second);
      const cleanPhone = passengerPhone.replace(/[\s-]/g, "");
      // Hold seats, save the passenger details, then initiate payment through the API.
      const created = await apiBookings.create({
          scheduleId: Number(selectedTrip.id),
          travelDate,
          seatNumbers: seats,
        });

        await apiBookings.updatePassenger(created.reference, {
          passengerName: name.trim(),
          passengerEmail: email.trim().toLowerCase(),
          phoneNumber: cleanPhone,
        });

        const payment = await apiPayments.create(
          created.reference,
          paymentMethodId as "mobile_money" | "bank_card",
        );
        setPaymentResult(payment);
        const paymentStatus = payment.status?.toLowerCase() ?? "pending";
        const paymentConfirmed = ["succeeded", "paid", "completed", "success"].includes(paymentStatus);
        if (!paymentConfirmed) {
          setPaymentPending(false);
          setNotice(`Payment ${payment.status ?? "initiated"}. Booking reference: ${created.reference}.`);
          return;
        }

        const booking: Booking = {
          ...toBooking(
            {
              ...created,
              status: created.status,
              seatNumbers: seats,
              travelDate,
              passengerName: name.trim(),
              passengerEmail: email.trim().toLowerCase(),
            },
            activeTrip,
          ),
          paymentStatus: "paid",
          paymentMethod: paymentMethodId === "bank_card" ? "bank" : undefined,
          paymentProvider: selectedMethod.name,
          amountPaid: activeTrip.fare * passengers,
        };

      const qr = await QRCode.toDataURL(JSON.stringify({
        reference: booking.reference,
        tripId: booking.tripId,
        route: booking.route,
        travelDate: booking.travelDate,
        pickup: booking.pickup,
        dropoff: booking.dropoff,
        passengers: booking.passengers,
        seats: booking.seats,
      }), { errorCorrectionLevel: "H", margin: 1, width: 280 });

      setTicket(booking);
      setTicketQr(qr);
      setShowTicket(false);
      setPaymentPending(false);
      setNotice(paymentConfirmed
        ? "Payment confirmed. Your bus ticket is ready."
        : `Payment ${payment.status ?? "initiated"}. Your booking reference is ${booking.reference}.`);
      try {
        notifyBookingStatus(
          booking,
          "payment-complete",
          `Payment for ${booking.route} is ${payment.status ?? "in progress"}. Booking reference ${booking.reference}.`,
        );
      } catch {
        setNotificationError("Your booking and ticket are ready, but the in-app notification could not be saved.");
      }
      setSelectedTripId("");
      setSelectedSeats([]);
      setBookingStage("seats");
      setName("");
      setEmail("");
      setPassengerPhone("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The reservation could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function viewTicket() {
    setShowTicket(true);
    setTimeout(() => {
      document.getElementById("ticket-heading")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    }, 50);
  }

  async function downloadTicketImage() {
    if (!ticket || !ticketQr) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 720;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is not available in this browser.");

      context.fillStyle = "#f2f7fb";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#ffffff";
      context.fillRect(32, 32, 1136, 656);
      context.fillStyle = "#12304a";
      context.fillRect(32, 32, 1136, 130);
      context.fillStyle = "#ffffff";
      context.font = "700 42px sans-serif";
      context.fillText("SBUS BUS TICKET", 76, 92);
      context.font = "20px sans-serif";
      context.fillText("PAYMENT CONFIRMED", 78, 130);
      const receiptLine = [
        ticket.paymentProvider ?? paymentMethodLabel(ticket.paymentMethod),
        `MWK ${(ticket.amountPaid ?? 0).toLocaleString("en-MW")}`,
        `Booking ${ticket.reference}`,
      ].filter(Boolean).join(" · ");
      context.fillStyle = "#526d87";
      context.font = "600 17px sans-serif";
      context.fillText(`Paid: ${receiptLine}`, 78, 190, 900);

      const ticketFields = [
        ["ROUTE", ticket.route],
        ["PASSENGER", ticket.name],
        ["DATE", fmtDate(ticket.travelDate)],
        ["BOARDING", ticket.pickup],
        ["DESTINATION", ticket.dropoff],
        ["PASSENGERS", String(ticket.passengers)],
        ["SEATS", ticket.seats?.length ? ticket.seats.join(", ") : "Not assigned"],
        ["REFERENCE", ticket.reference],
      ];
      let fieldY = 230;
      for (const [label, value] of ticketFields) {
        context.fillStyle = "#526d87";
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
      context.fillStyle = "#526d87";
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
      <DemoDataNotice show={tripsAreDemo} what="departures" />
      {paymentResult && (
        <section className="module-section" aria-label="Backend payment result" aria-live="polite">
          <div className="module-section-heading">
            <div><p className="module-eyebrow">BACKEND PAYMENT RESULT</p><h2>{paymentResult.status ?? "Response received"}</h2></div>
          </div>
          <dl className="payment-success-list">
            <div><dt>Payment ID</dt><dd>{paymentResult.id}</dd></div>
            {paymentResult.bookingReference && <div><dt>Booking reference</dt><dd>{paymentResult.bookingReference}</dd></div>}
            {paymentResult.amount !== undefined && <div><dt>Amount</dt><dd>{paymentResult.currency ?? "MWK"} {paymentResult.amount.toLocaleString("en-MW")}</dd></div>}
            {paymentResult.method && <div><dt>Method</dt><dd>{paymentResult.method}</dd></div>}
            {paymentResult.createdAt && <div><dt>Created</dt><dd>{new Date(paymentResult.createdAt).toLocaleString()}</dd></div>}
          </dl>
        </section>
      )}
      <header className="module-intro">
        <h1>{selectedTrip ? `${selectedTrip.route} booking` : "Book a scheduled trip"}</h1>
        <p>
          Enter your departure location and destination, then choose one of the trips scheduled by the transport admin. After selecting a trip, pick your seats, add passenger details, and send a payment request to the backend.
        </p>
        <div className="module-shortcuts">
          <a href="#trips-heading">Scheduled departures</a>
          {selectedTrip && <a href="#reservation-heading">Pick your seats</a>}
          <Link href="/transport-booking/my-bookings">My bookings</Link>
          <Link href="/help">How booking works</Link>
        </div>
      </header>

      {notice && <p className="module-notice" role="status">{notice}</p>}
      {error && <p className="module-error" role="alert">{error}{!session && <> <Link href="/login/user">Sign in</Link></>}</p>}
      {notificationError && <p className="module-error" role="alert">{notificationError}</p>}
      {((initialTripId && !initialTrip) || (selectedTripId && !selectedTrip)) && (
        <p className="module-error" role="alert">
          This scheduled trip is no longer available. Search again for an admin-scheduled departure.
        </p>
      )}

      <section id="trips-heading" className="module-section" aria-label="Scheduled departures">
        {!showDepartures ? (
          <div className="module-empty booking-start">
            <p className="module-eyebrow">READY TO TRAVEL?</p>
            <p>Choose one of the departures scheduled by the transport admin, then pick your seats.</p>
            <button className="primary-button" type="button" onClick={startBooking}>Book a trip</button>
          </div>
        ) : (
          <>
        <div className="module-section-heading">
          <div>
            <p className="module-eyebrow">SEARCH ADMIN SCHEDULES</p>
            {hasRouteSelection && (
              <h2>{origin.trim()} → {destination.trim()} scheduled trips</h2>
            )}
          </div>
          <span className="module-count">{displayedTrips.length} departure{displayedTrips.length === 1 ? "" : "s"}</span>
        </div>

        <form className="module-form" onSubmit={searchTrips}>
          <div className="module-form-grid">
            <label>
              Departure location
              <input list="booking-towns" value={origin} onChange={(event) => { setOrigin(event.target.value); setTravelDate(""); resetTripSelection(); }} placeholder="e.g. Zomba" autoComplete="off" required />
            </label>
            <label>
              Destination
              <input list="booking-towns" value={destination} onChange={(event) => { setDestination(event.target.value); setTravelDate(""); resetTripSelection(); }} placeholder="e.g. Blantyre" autoComplete="off" required />
            </label>
            <label>
              Travel date
              <input
                type="date"
                min={scheduledDates[0] ?? minTravelDate}
                max={scheduledDates[scheduledDates.length - 1]}
                value={travelDate}
                onChange={(event) => {
                  const value = event.target.value;
                  setTravelDate(value);
                  resetTripSelection();
                }}
              />
              {travelDate && !scheduledDates.includes(travelDate) ? (
                <span className="module-field-hint">No admin-scheduled trip on this date. Choose a date the admin has scheduled.</span>
              ) : !travelDate && scheduledDates.length > 0 ? (
                <span className="module-field-hint">Pick an admin-scheduled date to filter the departures, or leave it blank to see every scheduled date.</span>
              ) : null}
            </label>
          </div>
          <datalist id="booking-towns">{towns.map((town) => <option key={town} value={town} />)}</datalist>
          {locationStatus && <p className="home-location-status" role="status">{locationStatus}</p>}
          <button className="primary-button" type="submit">Book a trip</button>
        </form>
        {searchError && <p className="module-error" role="alert">{searchError}</p>}

        <div id="trip-results" className="trip-results">
          {displayedTrips.length > 0 && (
            <p className="trip-results-hint">
              {hasRouteSelection
                ? `Select one of the ${displayedTrips.length} admin-scheduled departure${displayedTrips.length === 1 ? "" : "s"} below to continue.`
                : "Select an upcoming departure below to continue."}
            </p>
          )}
          <p className="module-footnote">Check your selected journey and fare before booking.</p>
          {saveRouteError && <p className="module-error" role="alert">{saveRouteError}</p>}
          {displayedTrips.length === 0 ? (
            !hasRouteSelection ? (
              <div className="module-empty" role="status">
                <p>There are no upcoming trips scheduled by the admin yet. Booking opens when an admin adds a future departure.</p>
              </div>
            ) : !hasDefinedRoute ? (
              <div className="module-empty" role="status">
                <p>
                  <strong>This journey is not defined by the admin yet.</strong> A direct route from {origin.trim()} to {destination.trim()} has
                  not been created. Booking opens once the admin adds this route.
                </p>
              </div>
            ) : routeTrips.length > 0 ? (
              <div className="module-empty" role="status">
                <p>
                  <strong>No departures on {fmtDate(travelDate)}.</strong> Choose another admin-scheduled date, or clear the date
                  to see every scheduled departure for this journey.
                </p>
              </div>
            ) : null
          ) : null}
          {displayedTrips.length > 0 && (
            <nav className="module-tabs" aria-label="Available trips view">
              <button type="button" className={tripView === "cards" ? "is-active" : ""} aria-pressed={tripView === "cards"} onClick={() => setTripView("cards")}>Cards</button>
              <button type="button" className={tripView === "map" ? "is-active" : ""} aria-pressed={tripView === "map"} onClick={() => setTripView("map")}>Map</button>
            </nav>
          )}

          {displayedTrips.length > 0 && tripView === "cards" ? (
            <div className="module-card-grid">
              {displayedTrips.map((trip) => {
                const seats = seatsByTrip.get(trip.id) ?? availableSeats(trip, bookings);
                const isSelected = selectedTripId === trip.id;
                const departureTown = trip.route.split(" → ")[0] ?? "";
                const departureCoordinates = TRANSPORT_TOWN_COORDINATES[departureTown];
                const travelInfo = userPosition && departureCoordinates
                  ? travelEstimate(userPosition.lat, userPosition.lng, departureCoordinates.lat, departureCoordinates.lng)
                  : null;
                return (
                  <article className={`trip-choice${isSelected ? " is-selected" : ""}`} key={trip.id}>
                    <div className="trip-choice-top">
                      <span className="trip-service">ADMIN SCHEDULED</span>
                      <div className="trip-choice-tools">
                        <span className={`seat-status${seats === 0 ? " is-full" : ""}`}>
                          {seats === 0 ? "Full" : `${seats} seats left`}
                        </span>
                        {(() => {
                          const isSaved = savedRouteIds.includes(savedRouteId(trip.route));
                          return (
                            <button
                              type="button"
                              className={`save-route-button${isSaved ? " is-saved" : ""}`}
                              aria-pressed={isSaved}
                              onClick={() => toggleTripSaved(trip.route, trip.fare)}
                            >
                              <svg viewBox="0 0 24 24" width="13" height="13" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M6 4h12v17l-6-4-6 4V4Z" />
                              </svg>
                              {isSaved ? "Saved" : "Save route"}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                    <h3>{trip.route}</h3>
                    <dl className="trip-facts">
                      <div><dt>Date</dt><dd>{fmtDate(trip.date)}</dd></div>
                      {travelInfo && <div><dt>From your position</dt><dd>{travelInfo.label}</dd></div>}
                      <div><dt>Departure</dt><dd>{trip.departure}</dd></div>
                      <div><dt>Arrival estimate</dt><dd>{trip.arrival}</dd></div>
                      <div><dt>Fare</dt><dd>MWK {trip.fare.toLocaleString("en-MW")} <small>per passenger</small></dd></div>
                    </dl>
                    <div className="trip-stops">
                      <p><strong>Board:</strong> {trip.pickup.join(" or ")}</p>
                      <p><strong>Get off:</strong> {trip.dropoff.join(" or ")}</p>
                    </div>
                    <button
                      type="button"
                      className={`primary-button${seats === 0 ? " is-disabled" : ""}`}
                      aria-disabled={seats === 0}
                      disabled={seats === 0}
                      onClick={() => selectTripForBooking(trip)}
                    >
                      {seats === 0 ? "Full" : isSelected ? "Selected for booking ✓" : "Choose this trip"}
                    </button>
                  </article>
                );
              })}
            </div>
          ) : displayedTrips.length > 0 && tripView === "map" ? (
            <TripMap
              trips={displayedTrips}
              userPosition={userPosition}
              cityCoordinates={TRANSPORT_TOWN_COORDINATES}
              tripRoadRoutes={tripRoadRoutes}
              isTripRouting={isTripRouting}
              tripFallbackCount={tripFallbackCount}
            />
          ) : null}
        </div>
          </>
        )}
      </section>

      {(selectedTrip || ticket) && (
      <section id="reservation-heading" className="module-section" aria-label={bookingStage === "seats" ? "Pick your seats" : "Passenger details"}>
        {selectedTrip && (
          <div className="module-section-heading">
            <div>
              <p className="module-eyebrow">{bookingStage === "seats" ? "STEP 1 · PICK YOUR SEATS" : "STEP 2 · PASSENGER DETAILS"}</p>
              <h2>{selectedTrip.route}</h2>
            </div>
            <span className="module-count">{available} seats left</span>
          </div>
        )}
        <div className={detailTrip ? "detail-booking-layout" : undefined}>
          <div className={detailTrip ? "detail-booking-main" : undefined}>
        {!selectedTrip ? null : paymentPending ? (
          <div className="payment-panel">
            <div>
              <p className="module-eyebrow">CHECKOUT</p>
              <h3>{selectedTrip.route}</h3>
              <p>{fmtDate(travelDate)} · {selectedTrip.departure} · {passengers} passenger{passengers === 1 ? "" : "s"}</p>
              <strong>Amount due: MWK {(selectedTrip.fare * passengers).toLocaleString("en-MW")}</strong>
            </div>
            <label className="map-route-filter">Payment method
              <select
                value={paymentMethodId}
                onChange={(event) => { setPaymentMethodId(event.target.value); setError(""); }}
              >
                {paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}
              </select>
            </label>
            {paymentMethods.length === 0 && <p className="module-error" role="alert">No supported payment methods are available from the backend.</p>}
            <p className="module-footnote">Confirm the application fare and schedule with the transport operator before travelling.</p>
            <div className="payment-actions">
              <button className="primary-button" type="button" onClick={completePayment} disabled={saving || paymentMethods.length === 0}>
                {saving ? "Sending payment request…" : `Pay · MWK ${(selectedTrip.fare * passengers).toLocaleString("en-MW")}`}
              </button>
              <button className="secondary-button" type="button" onClick={() => setPaymentPending(false)} disabled={saving}>Back to reservation details</button>
            </div>
          </div>
        ) : bookingStage === "seats" ? (
          <div className="seat-step">
            <div className="seat-step-intro">
              <h3>Pick your seats</h3>
              <p>
                {fmtDate(selectedTrip.date)} · departs {selectedTrip.departure} · {selectedTrip.pickup.join(" or ")} to {selectedTrip.dropoff.join(" or ")}.
                Seat 1 is reserved by the admin next to the door, and the driver seat cannot be booked.
              </p>
            </div>
            <div className="seat-step-layout">
              <div>
                <div className="bus-seat-map">
                  <div className="bus-front">
                    <span className="bus-door">Door</span>
                    <span className="bus-aisle-label">Aisle</span>
                    <span className="driver-seat">Driver<small>Not bookable</small></span>
                  </div>
                  <div className="seat-grid bus-seat-grid" role="group" aria-label={`Seats for ${selectedTrip.route}`}>
                    {Array.from({ length: selectedTrip.capacity }, (_, index) => index + 1).map((seat, order) => {
                      const isAdminSeat = adminSeats.includes(seat);
                      const isAvailable = availableSeatList.includes(seat);
                      const isSelected = selectedSeats.includes(seat);
                      const isLockedByLimit = seatLimitReached && !isSelected;
                      const seatState = isAdminSeat
                        ? "reserved by the admin"
                        : isSelected
                          ? "selected"
                          : isLockedByLimit
                            ? `locked, you already picked the ${MAX_PASSENGERS}-seat limit`
                            : isAvailable
                              ? "available"
                              : "taken";
                      return (
                        <button
                          key={seat}
                          type="button"
                          style={{ gridColumn: SEAT_COLUMNS[order % SEAT_COLUMNS.length], gridRow: Math.floor(order / SEAT_COLUMNS.length) + 1 }}
                          className={`seat-number${isSelected ? " is-selected" : ""}${isAvailable ? "" : " is-taken"}${isAdminSeat ? " is-admin" : ""}${isLockedByLimit ? " is-locked" : ""}`}
                          aria-pressed={isSelected}
                          aria-label={`Seat ${seat}, ${seatState}`}
                          title={isAdminSeat ? "Seat 1 is reserved by the admin next to the door" : isSelected ? `Seat ${seat} selected` : isLockedByLimit ? `Deselect a seat to choose seat ${seat}` : isAvailable ? `Choose seat ${seat}` : `Seat ${seat} is taken`}
                          disabled={!isAvailable || isLockedByLimit}
                          onClick={() => toggleSeat(seat)}
                        >
                          <span>{seat}</span>
                          {isAdminSeat ? <small>Admin</small> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <ul className="seat-legend" aria-label="Seat map key">
                  <li><i className="legend-free" aria-hidden="true" />Available</li>
                  <li><i className="legend-picked" aria-hidden="true" />Selected</li>
                  <li><i className="legend-taken" aria-hidden="true" />Taken</li>
                  <li><i className="legend-admin" aria-hidden="true" />Admin reserved (door side)</li>
                  <li><i className="legend-driver" aria-hidden="true" />Driver</li>
                </ul>
                <p className="seat-picker-help">
                  Select up to {MAX_PASSENGERS} seats. {availableSeatList.length} of {selectedTrip.capacity} seats are available on this trip.
                  {selectedSeats.length >= MAX_PASSENGERS ? ` You have reached the ${MAX_PASSENGERS}-seat limit.` : ""}
                </p>
                {seatError && <p className="module-error" role="alert">{seatError}</p>}
              </div>
              <aside className="seat-summary" aria-label="Fare and seat calculation">
                <p className="module-eyebrow">FARE CALCULATION</p>
                <dl className="seat-summary-list">
                  <div><dt>Fare per passenger</dt><dd>MWK {selectedTrip.fare.toLocaleString("en-MW")}</dd></div>
                  <div><dt>Seats you picked</dt><dd>{selectedSeats.length > 0 ? selectedSeats.join(", ") : "None yet"}</dd></div>
                  <div><dt>Passengers</dt><dd>{passengers} of {MAX_PASSENGERS}</dd></div>
                  <div><dt>People on the bus</dt><dd>{onboardSeats} of {selectedTrip.capacity}</dd></div>
                  <div><dt>After this booking</dt><dd>{Math.min(selectedTrip.capacity, onboardSeats + passengers)} of {selectedTrip.capacity}</dd></div>
                  <div><dt>Seats still free</dt><dd>{Math.max(0, availableSeatList.length - passengers)} of {selectedTrip.capacity}</dd></div>
                </dl>
                <p className="seat-summary-total"><span>Total</span><strong>MWK {(selectedTrip.fare * passengers).toLocaleString("en-MW")}</strong></p>
                <p className="module-footnote">Seat {adminSeats[0] ?? 1} stays reserved for the admin. Payment is simulated after you enter passenger details.</p>
                <button className="primary-button" type="button" onClick={confirmSeats} disabled={selectedSeats.length === 0}>
                  Confirm {passengers === 0 ? "seats" : `${passengers} seat${passengers === 1 ? "" : "s"}`}
                </button>
                <button className="secondary-button" type="button" onClick={returnToTrips}>Back to trips</button>
              </aside>
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
                <span>People on the bus</span>
                <strong>{onboardSeats} of {selectedTrip.capacity}</strong>
                <small>{available} seats available · availability is checked when you confirm.</small>
              </div>
              <div>
                <span>Estimated total</span>
                <strong>MWK {(selectedTrip.fare * passengers).toLocaleString("en-MW")}</strong>
                <small>{passengers} passenger{passengers === 1 ? "" : "s"} · payment not taken</small>
              </div>
            </div>

            <div className="seat-selection-bar">
              <div>
                <span>Your seats</span>
                <strong>{selectedSeats.join(", ")}</strong>
                <small>
                  {passengers} passenger{passengers === 1 ? "" : "s"} · MWK {(selectedTrip.fare * passengers).toLocaleString("en-MW")} total
                </small>
              </div>
              <button className="secondary-button" type="button" onClick={() => setBookingStage("seats")}>
                Change seats
              </button>
            </div>

            <div className="module-form-grid">
              <label>
                Travel date
                <input type="date" min={selectedTrip.date} max={selectedTrip.date} value={travelDate} onChange={(event) => setTravelDate(event.target.value)} required />
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
              <label>
                Phone number
                <input type="tel" autoComplete="tel" maxLength={20} value={passengerPhone} onChange={(event) => setPassengerPhone(event.target.value)} placeholder="e.g. 0991234567" required />
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
          </div>
          {detailTrip && (
            <aside className="detail-trip-map" aria-label="Trip route map">
              <p className="module-eyebrow">TRIP MAP</p>
              <h3>{detailTrip.route}</h3>
              <TripMap
                trips={[detailTrip]}
                userPosition={userPosition}
                cityCoordinates={TRANSPORT_TOWN_COORDINATES}
                tripRoadRoutes={tripRoadRoutes}
                isTripRouting={isTripRouting}
                tripFallbackCount={tripFallbackCount}
              />
              <p className="module-footnote">
                {fmtDate(detailTrip.date)} · departs {detailTrip.departure} · arrives about {detailTrip.arrival}
              </p>
            </aside>
          )}
        </div>
        {ticket && ticketQr && !showTicket && (
          <div className="payment-success-panel" role="status">
            <p className="module-eyebrow">PAYMENT CONFIRMED</p>
            <h3>Your payment has been received</h3>
            <dl className="payment-success-list">
              <div><dt>Booking reference</dt><dd>{ticket.reference}</dd></div>
              <div><dt>Amount paid</dt><dd>MWK {(ticket.amountPaid ?? 0).toLocaleString("en-MW")}</dd></div>
              <div><dt>Payment method</dt><dd>{ticket.paymentProvider ?? paymentMethodLabel(ticket.paymentMethod)}</dd></div>
              {ticket.payerAccountLast4 && <div><dt>Account number</dt><dd>•••• {ticket.payerAccountLast4}</dd></div>}
            </dl>
            <button className="primary-button" type="button" onClick={viewTicket}>View e-ticket</button>
          </div>
        )}
        {ticket && ticketQr && showTicket && (
          <article className="ticket-card" aria-labelledby="ticket-heading">
            <div className="ticket-details">
              <p className="module-eyebrow">PAYMENT CONFIRMED</p>
              <h3 id="ticket-heading">Your bus ticket</h3>
              <p className="ticket-route">{ticket.route}</p>
              <p>{fmtDate(ticket.travelDate)} · {ticket.pickup} to {ticket.dropoff}</p>
              <p>{ticket.passengers} passenger{ticket.passengers === 1 ? "" : "s"} · {ticket.name}</p>
              {ticket.seats?.length ? (
                <p>Seat{ticket.seats.length === 1 ? "" : "s"}: {ticket.seats.join(", ")}</p>
              ) : null}
              <p className="ticket-reference">Reference: <strong>{ticket.reference}</strong></p>
              <div className="ticket-receipt">
                <p className="module-eyebrow">PAYMENT RECEIPT</p>
                <dl>
                  <div><dt>Payment method</dt><dd>{ticket.paymentProvider ?? paymentMethodLabel(ticket.paymentMethod)}</dd></div>
                  {ticket.payerAccountLast4 && <div><dt>Account number</dt><dd>•••• {ticket.payerAccountLast4}</dd></div>}
                  <div><dt>Amount paid</dt><dd>MWK {(ticket.amountPaid ?? 0).toLocaleString("en-MW")}</dd></div>
                  {ticket.paidAt && <div><dt>Paid on</dt><dd>{new Date(ticket.paidAt).toLocaleString("en-MW", { dateStyle: "medium", timeStyle: "short" })}</dd></div>}
                </dl>
              </div>
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
