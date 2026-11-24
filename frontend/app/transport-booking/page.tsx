"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import ListPagination from "@/components/ListPagination";
import { useRoadRoutes } from "@/components/road-routing";
import { usePagedItems } from "@/components/usePagedItems";
import { adminReservedSeatNumbers, availableSeatNumbers, availableSeats, fmtDate } from "@/lib/booking-data";
import { nearestTransportTown, TRANSPORT_TOWN_COORDINATES, type Coordinates } from "@/lib/malawi-locations";
import { notifyBookingStatus } from "@/lib/notifications";
import { useBackendRoutes, useBackendTrips, useMyBookings } from "@/lib/use-backend-data";
import type { Booking, Trip } from "@/lib/types";
import { toBooking, toTrip } from "@/services/adapters";
import * as apiBookings from "@/services/bookings.service";
import * as apiPayments from "@/services/payments.service";
import * as apiSchedules from "@/services/schedules.service";
import type { Booking as ApiBooking, PaymentMethod } from "@/services/types";
import { readPaymentDraft, savePaymentDraft } from "@/lib/payment-draft";
import { holdSeats, readHeldSeats, releaseSeatHold } from "@/lib/seat-holds";
import { savePaymentReceipt } from "@/lib/payment-receipts";
import { savePaymentSuccess } from "@/lib/payment-success";
import { savePassengerBookingDetails } from "@/lib/passenger-booking-details";
import { useSession } from "@/lib/auth";
import { readPassengerSession } from "@/lib/passenger-auth";
import * as apiMe from "@/services/me.service";

const TripMap = dynamic(() => import("@/components/TripMap"), {
  ssr: false,
  loading: () => <p className="module-empty">Loading map…</p>,
});

const MAX_PASSENGERS = 5;
const SEAT_COLUMNS = [1, 2, 4, 5];
const MALAWI_BANKS = ["CDH Investment Bank", "Centenary Bank", "Ecobank", "FDH Bank", "First Capital Bank", "National Bank of Malawi", "NBS Bank", "Standard Bank Malawi"];

/** A weekly schedule appears once per travel date, so its id alone is not unique. */
function tripKey(trip: Pick<Trip, "id" | "date">) {
  return `${trip.id}:${trip.date}`;
}

function sameSeats(first: number[] = [], second: number[] = []) {
  return first.length === second.length && first.every((seat, index) => seat === second[index]);
}

/** Read a booking search value passed from the home page on the client only. */
function readQueryParam(name: string): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name)?.trim() ?? "";
}

export default function TransportBookingPage({ initialTripId, initialDate }: { initialTripId?: string; initialDate?: string }) {
  const router = useRouter();
  const session = useSession();
  const { data: trips, reload: reloadTrips } = useBackendTrips();
  const { data: routes } = useBackendRoutes();
  const { data: bookings, reload: reloadBookings } = useMyBookings();
  const initialTrip =
    trips.find((trip) => trip.id === initialTripId && (!initialDate || trip.date === initialDate)) ??
    trips.find((trip) => trip.id === initialTripId);
  const [selectedTripId, setSelectedTripId] = useState(initialTrip?.id ?? "");
  const [recoveryTrip, setRecoveryTrip] = useState<Trip | null>(null);
  const [initialTripApplied, setInitialTripApplied] = useState(false);
  const [origin, setOrigin] = useState(initialTrip?.route.split(" → ")[0] ?? "");
  const [destination, setDestination] = useState(initialTrip?.route.split(" → ")[1] ?? "");
  const [travelDate, setTravelDate] = useState(initialTrip?.date ?? "");
  const [pickup, setPickup] = useState(initialTrip?.pickup[0] ?? "");
  const [dropoff, setDropoff] = useState(initialTrip?.dropoff[0] ?? "");
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [seatError, setSeatError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);
  const [paymentMethodsError, setPaymentMethodsError] = useState("");
  const [paymentMethodLoadAttempt, setPaymentMethodLoadAttempt] = useState(0);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [pendingBookingReference, setPendingBookingReference] = useState("");
  const [bankName, setBankName] = useState("");
  const [paymentAccountName, setPaymentAccountName] = useState("");
  const [paymentAccountNumber, setPaymentAccountNumber] = useState("");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [liveSeats, setLiveSeats] = useState<{ tripId: string; date: string; seats: number[] | null } | null>(null);
  const [searchError, setSearchError] = useState("");
  const [openingTrip, setOpeningTrip] = useState(false);
  const [locationStatus, setLocationStatus] = useState("Finding your current location…");
  const [userPosition, setUserPosition] = useState<Coordinates | null>(null);
  useEffect(() => {
    let cancelled = false;
    apiPayments.listMethods().then((methods) => {
      if (cancelled) return;
      const supported = methods.filter((method) => method.id === "mobile_money" || method.id === "bank_card");
      const demoMethods: PaymentMethod[] = [
        { id: "airtel_demo", name: "Airtel Money (demo)", provider: "demo", description: "Mobile money demo" },
        { id: "tnm_demo", name: "TNM Mpamba (demo)", provider: "demo", description: "Mobile money demo" },
        { id: "paychangu_demo", name: "PayChangu (demo)", provider: "demo", description: "Payment gateway demo" },
        { id: "bank_demo", name: "Malawi bank transfer (demo)", provider: "demo", description: "Bank transfer demo" },
      ];
      setPaymentMethods([...supported, ...demoMethods]);
      setPaymentMethodId((current) => current || supported[0]?.id || "");
      setPaymentMethodsLoading(false);
    }).catch((reason: unknown) => {
      if (!cancelled) {
        setPaymentMethodsError(reason instanceof Error ? reason.message : "Payment methods could not be loaded.");
        setPaymentMethodsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [paymentMethodLoadAttempt]);

  const sessionEmail = session?.email;
  useEffect(() => {
    const reference = readQueryParam("bookingReference");
    if (!reference || !sessionEmail) return;
    let cancelled = false;
    void (async () => {
      try {
        const booking = await apiBookings.get(reference);
        if (booking.status === "cancelled" || booking.status === "expired" || booking.status === "paid") {
          throw new Error("This booking is already cancelled or paid. Check your profile for its latest status.");
        }
        const schedule = await apiSchedules.get(booking.scheduleId, booking.travelDate);
        if (cancelled) return;
        const trip = toTrip(schedule, booking.travelDate);
        setRecoveryTrip(trip);
        setSelectedTripId(trip.id);
        setTravelDate(booking.travelDate);
        setPickup(trip.pickup[0] ?? "");
        setDropoff(trip.dropoff[0] ?? "");
        setSelectedSeats(booking.seatNumbers);
        const passenger = readPassengerSession();
        setName(booking.passengerName ?? passenger?.fullName ?? "");
        setEmail(booking.passengerEmail ?? passenger?.email ?? sessionEmail);
        setPassengerPhone(booking.phoneNumber ?? "");
        setPendingBookingReference(booking.reference);
        setPaymentPending(true);
        setNotice(`Continue payment for booking ${booking.reference}. This will reuse the seats already reserved.`);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "This booking could not be reopened for payment.");
      }
    })();
    return () => { cancelled = true; };
  }, [sessionEmail]);

  useEffect(() => {
    if (!sessionEmail) return;
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      const passenger = readPassengerSession();
      setName((current) => current || passenger?.fullName || "");
      setEmail((current) => current || passenger?.email || sessionEmail);
      void apiMe.getPassengerProfile().then((profile) => {
        if (cancelled || !profile) return;
        setName((current) => current || profile.name || "");
        setEmail((current) => current || profile.email || sessionEmail);
        setPassengerPhone((current) => current || profile.phone || "");
      }).catch(() => undefined);
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [sessionEmail]);
  const selectedTrip = trips.find(
    (trip) => trip.id === selectedTripId && (!travelDate || trip.date === travelDate),
  ) ?? (recoveryTrip?.id === selectedTripId && recoveryTrip.date === travelDate ? recoveryTrip : undefined);
  // Only trust live seat numbers that belong to the currently selected trip.
  const liveAvailableSeatNumbers =
    selectedTrip && liveSeats?.tripId === selectedTrip.id && liveSeats.date === selectedTrip.date
      ? liveSeats.seats
      : null;
  useEffect(() => {
    if (!selectedTrip) return;
    const { id, date } = selectedTrip;
    let cancelled = false;
    const loadSeats = () => apiSchedules.getSeats(Number(id), date).then((result) => {
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
      } else if (typeof result.availableSeats === "number") {
        // The backend reports how many seats are free, not which ones. Show the
        // same number the cards show so no passenger can pick more seats than
        // the trip actually has left.
        const capacity = Math.max(0, Number(result.capacity ?? selectedTrip.capacity) || 0);
        const adminSeatsOnTrip = adminReservedSeatNumbers(selectedTrip);
        const sellable = Math.max(0, Math.min(result.availableSeats, capacity - adminSeatsOnTrip.length));
        available = Array.from({ length: capacity }, (_, index) => index + 1)
          .filter((seat) => !adminSeatsOnTrip.includes(seat))
          .slice(0, sellable);
      }
      setLiveSeats({ tripId: id, date, seats: available });
    }).catch(() => {
      if (!cancelled) setLiveSeats(null);
    });
    void loadSeats();
    // Refresh while the passenger is choosing so seats picked by other
    // passengers become locked here too, with an "already selected" message.
    const timer = window.setInterval(() => void loadSeats(), 15000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [selectedTrip]);
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

  const tripPages = usePagedItems(
    displayedTrips,
    (trip) => `${trip.route} ${trip.date} ${trip.departure}`,
    { resetKey: `${hasRouteSelection}|${origin}|${destination}|${travelDate}` },
  );

  const detailTrip = selectedTrip;
  const mapTrips = detailTrip ? [detailTrip] : [];
  const tripRoadRoutes = useRoadRoutes(mapTrips.flatMap((trip) => {
    const [origin, destination] = trip.route.split(" → ");
    const originCoordinates = TRANSPORT_TOWN_COORDINATES[origin];
    const destinationCoordinates = TRANSPORT_TOWN_COORDINATES[destination];
    return originCoordinates && destinationCoordinates
      ? [{ id: trip.id, origin: originCoordinates, destination: destinationCoordinates }]
      : [];
  }));
  const seatsByTrip = useMemo(
    () =>
      new Map(
        trips.map((trip) => {
          const adminSeatsOnTrip = adminReservedSeatNumbers(trip).length;
          // The schedule search returns live availability for every passenger;
          // local bookings only cover this browser account. Prefer the backend
          // count, minus the seat the admin keeps for themselves.
          if (typeof trip.availableSeats === "number") {
            return [tripKey(trip), Math.min(trip.availableSeats, Math.max(0, trip.capacity - adminSeatsOnTrip))];
          }
          return [tripKey(trip), availableSeats(trip, bookings)];
        }),
      ),
    [trips, bookings],
  );
  const adminSeats = useMemo(
    () => (selectedTrip ? adminReservedSeatNumbers(selectedTrip) : []),
    [selectedTrip],
  );
  const selectedTripIdForSeats = selectedTrip?.id ?? "";
  const localHeldSeats = useMemo(
    () => (selectedTripIdForSeats ? readHeldSeats(selectedTripIdForSeats, travelDate) : []),
    [selectedTripIdForSeats, travelDate],
  );
  const availableSeatList = useMemo(
    () => {
      const seats = liveAvailableSeatNumbers ?? (selectedTrip ? availableSeatNumbers(selectedTrip, bookings) : []);
      return seats.filter((seat) => !adminSeats.includes(seat) && !localHeldSeats.includes(seat));
    },
    [selectedTrip, bookings, liveAvailableSeatNumbers, adminSeats, localHeldSeats],
  );
  const available = availableSeatList.length;
  const passengers = selectedSeats.length;
  const seatLimitReached = passengers >= MAX_PASSENGERS;

  // If another passenger takes a seat that is in your selection, release it
  // and explain that it has already been selected.
  useEffect(() => {
    if (!selectedTrip || !liveAvailableSeatNumbers) return;
    const taken = selectedSeats.filter(
      (seat) => !liveAvailableSeatNumbers.includes(seat) || localHeldSeats.includes(seat),
    );
    if (taken.length === 0) return;
    const timer = window.setTimeout(() => {
      setSelectedSeats((current) => current.filter((seat) => !taken.includes(seat)));
      setSeatError(`Seat ${taken.join(", ")} has already been selected by another passenger. Choose another seat.`);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedTrip, liveAvailableSeatNumbers, localHeldSeats, selectedSeats]);

  const onboardSeats = selectedTrip ? selectedTrip.capacity - availableSeatList.length : 0;

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
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialTripId]);

  useEffect(() => {
    if (!initialTrip || initialTripApplied || (selectedTripId && selectedTripId !== initialTrip.id)) return;
    const timer = window.setTimeout(() => {
      const [tripOrigin, tripDestination] = initialTrip.route.split(" → ");
      setSelectedTripId(initialTrip.id);
      setTravelDate((curr) => curr || initialDate || initialTrip.date);
      setOrigin((curr) => curr || tripOrigin?.trim() || "");
      setDestination((curr) => curr || tripDestination?.trim() || "");
      setPickup((curr) => curr || initialTrip.pickup[0] || "");
      setDropoff((curr) => curr || initialTrip.dropoff[0] || "");
      setOpeningTrip(false);
      // Apply the deep-linked trip once; "Back to trips" must stay cleared.
      setInitialTripApplied(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialTrip, initialDate, selectedTripId, initialTripApplied]);

  function resetTripSelection() {
    setSelectedTripId("");
    setSelectedSeats([]);
    setPendingBookingReference("");
    setSeatError("");
    setPaymentPending(false);
    setSearchError("");
    setOpeningTrip(false);
    setError("");
    setNotice("");
  }

  function searchTrips(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetTripSelection();
    setOpeningTrip(true);

    function stopWithError(message: string) {
      setOpeningTrip(false);
      setSearchError(message);
    }

    if (!origin.trim() || !destination.trim()) {
      stopWithError("Enter a departure location and destination.");
      return;
    }
    if (origin.trim().toLocaleLowerCase() === destination.trim().toLocaleLowerCase()) {
      stopWithError("Choose a destination different from your departure location.");
      return;
    }
    if (!hasDefinedRoute) {
      stopWithError(`A direct route from ${origin.trim()} to ${destination.trim()} has not been defined by the admin.`);
      return;
    }
    if (travelDate && travelDate < minTravelDate) {
      stopWithError("Choose a future travel date.");
      return;
    }
    if (travelDate && !scheduledDates.includes(travelDate)) {
      stopWithError("Choose a travel date that has an admin-scheduled trip for this route.");
      return;
    }

    // The button says "Book a trip", so open the first matching departure
    // instead of only scrolling to results that are already on screen.
    const firstTrip = displayedTrips[0];
    if (!firstTrip) {
      stopWithError("No admin-scheduled departures match this search yet.");
      window.setTimeout(() => {
        document.getElementById("trip-results")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start",
        });
      }, 50);
      return;
    }

    router.push(
      `/transport-booking/details/${encodeURIComponent(firstTrip.id)}?date=${encodeURIComponent(firstTrip.date)}`,
    );
  }

  function toggleSeat(seat: number) {
    if (adminSeats.includes(seat)) {
      setSeatError("Seat 1 is reserved by the transport admin and sits next to the door.");
      return;
    }
    if (!availableSeatList.includes(seat)) {
      setSeatError(`Seat ${seat} has already been selected. Choose an available seat.`);
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

  function returnToTrips() {
    // Clear the current choice so the departure list is visible again.
    resetTripSelection();
    setTimeout(() => {
      document.getElementById("trips-heading")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    }, 50);
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

    const phoneDigits = passengerPhone.replace(/\D/g, "");
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      setError("Enter a valid phone number with at least 7 digits before continuing to payment.");
      return;
    }

    const seats = [...selectedSeats].sort((first, second) => first - second);
    if (selectedSeats.some((seat) => !availableSeatList.includes(seat))) {
      setError("One of your seats has already been selected by another passenger. Choose another seat.");
      return;
    }

    setSaving(true);
    try {
      // Hold the seats on the backend as soon as the passenger commits to
      // booking. Other passengers will no longer see them as selectable.
      const existingDraft = readPaymentDraft();
      let holdReference = existingDraft?.pendingBookingReference ?? "";

      if (holdReference) {
        const existing = await apiBookings.get(holdReference);
        if (existing.status === "paid" || existing.status === "confirmed") {
          setError("These seats have already been booked. Choose different seats.");
          return;
        }
        const reusable =
          (existing.status === "draft" || existing.status === "reviewed") &&
          existing.scheduleId === Number(selectedTrip.id) &&
          existing.travelDate === travelDate &&
          sameSeats(existing.seatNumbers, seats);
        if (!reusable) {
          await apiBookings.cancel(holdReference).catch(() => undefined);
          releaseSeatHold(holdReference);
          holdReference = "";
        }
      }

      if (!holdReference) {
        const created = await apiBookings.create({
          scheduleId: Number(selectedTrip.id),
          travelDate,
          seatNumbers: seats,
        });
        holdReference = created.reference;
      }

      await apiBookings.updatePassenger(holdReference, {
        passengerName: name.trim(),
        passengerEmail: email.trim().toLowerCase(),
        phoneNumber: passengerPhone.replace(/[\s-]/g, ""),
      });
      holdSeats({ reference: holdReference, tripId: selectedTrip.id, date: travelDate, seats });
      savePaymentDraft({
        tripId: selectedTrip.id,
        travelDate,
        seats,
        pickup,
        dropoff,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: passengerPhone.replace(/[\s-]/g, ""),
        pendingBookingReference: holdReference,
      });
      reloadTrips();
      reloadBookings();
      router.push("/transport-booking/payment");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The seats could not be held. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function completePayment() {
    if (!selectedTrip) return;

    const cleanPhone = passengerPhone.replace(/[\s-]/g, "");
    const phoneDigits = cleanPhone.replace(/\D/g, "");
    if (name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || phoneDigits.length < 7 || phoneDigits.length > 15) {
      setError("Check the passenger name, email, and phone number. The phone number must contain at least 7 digits.");
      return;
    }

    const selectedMethod = paymentMethods.find((method) => method.id === paymentMethodId);
    if (!selectedMethod) {
      setError("Choose an available payment method.");
      return;
    }
    if (["airtel_demo", "tnm_demo", "paychangu_demo", "bank_demo"].includes(paymentMethodId)) {
      if ((paymentMethodId === "airtel_demo" || paymentMethodId === "tnm_demo") && !paymentPhone.trim()) {
        setError("Enter the mobile money phone number for this demonstration.");
        return;
      }
      if (paymentMethodId === "bank_demo" && (!bankName || !paymentAccountName.trim() || !paymentAccountNumber.trim())) {
        setError("Select a bank and enter the account name and number for this demonstration.");
        return;
      }
      if (paymentMethodId === "paychangu_demo" && (!paymentAccountName.trim() || !paymentPhone.trim())) {
        setError("Enter the payer name and phone number for this PayChangu demonstration.");
        return;
      }
      setError("These provider choices are demonstration only. Choose Mobile Money or Bank Card for the backend simulator.");
      return;
    }

    setSaving(true);
    setError("");
    let createdReference: string | undefined = pendingBookingReference || undefined;
    let shouldCancelCreatedBooking = false;
    let paymentRequestStarted = false;
    try {
      const activeTrip = trips.find(
        (trip) => trip.id === selectedTrip.id && trip.date === selectedTrip.date,
      ) ?? (recoveryTrip?.id === selectedTrip.id && recoveryTrip.date === selectedTrip.date ? recoveryTrip : undefined);
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
      // Hold seats, save the passenger details, then initiate payment through the API.
      const previousHold = pendingBookingReference ? undefined : bookings.find((booking) =>
        booking.tripId === selectedTrip.id &&
        booking.travelDate === travelDate &&
        booking.status === "confirmed" &&
        booking.paymentStatus !== "paid" &&
        booking.seats?.length === seats.length &&
        booking.seats.every((seat, index) => seat === seats[index]),
      );
      let created: ApiBooking;
      if (pendingBookingReference) {
        created = await apiBookings.get(pendingBookingReference);
      } else if (previousHold) {
        created = await apiBookings.get(previousHold.reference);
      } else {
        created = await apiBookings.create({
          scheduleId: Number(selectedTrip.id),
          travelDate,
          seatNumbers: seats,
        });
        shouldCancelCreatedBooking = true;
      }
      createdReference = created.reference;
      setPendingBookingReference(created.reference);

        await apiBookings.updatePassenger(created.reference, {
          passengerName: name.trim(),
          passengerEmail: email.trim().toLowerCase(),
          phoneNumber: cleanPhone,
        });
        try {
          savePassengerBookingDetails({
            bookingReference: created.reference,
            passengerName: name.trim(),
            passengerEmail: email.trim().toLowerCase(),
            passengerPhone: cleanPhone,
          });
        } catch {
          // The backend passenger update succeeded; browser storage is only a profile fallback.
        }

        paymentRequestStarted = true;
        const payment = await apiPayments.create(
          created.reference,
          paymentMethodId as "mobile_money" | "bank_card",
        );
        const backendPaymentStatus = payment.status?.toLowerCase() ?? "pending";
        const demoSuccess = backendPaymentStatus === "pending" && selectedMethod.provider === "simulated";
        const paymentStatus = demoSuccess ? "successful" : backendPaymentStatus;
        const paymentConfirmed = demoSuccess || ["succeeded", "paid", "completed", "success", "successful"].includes(paymentStatus);
        const paidAmount = Number(payment.amount ?? activeTrip.fare * passengers);
        try {
          savePaymentReceipt({
            bookingReference: created.reference,
            paymentId: payment.id,
            amount: paidAmount,
            currency: payment.currency ?? "MWK",
            method: selectedMethod.name,
            provider: payment.provider ?? selectedMethod.provider,
            status: paymentStatus,
            passengerName: name.trim(),
            passengerEmail: email.trim().toLowerCase(),
            passengerPhone: cleanPhone,
            ...(payment.transactionReference ? { transactionReference: payment.transactionReference } : {}),
            createdAt: payment.createdAt ?? new Date().toISOString(),
          });
        } catch {
          // The backend payment response remains authoritative if local storage is unavailable.
        }
        if (!paymentConfirmed) {
          setPaymentPending(true);
          setNotice(`Payment pending. Booking reference: ${created.reference}. You can retry below.`);
          reloadBookings();
          reloadTrips();
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
          amountPaid: paidAmount,
          paymentReference: payment.transactionReference ?? payment.id,
          paymentCode: payment.transactionReference,
          payerPhone: cleanPhone,
          paidAt: payment.createdAt ?? new Date().toISOString(),
        };

      savePaymentSuccess(booking);
      setPaymentPending(false);
      setPendingBookingReference("");
      setNotice("");
      setSelectedTripId("");
      setSelectedSeats([]);
      setName("");
      setEmail("");
      setPassengerPhone("");
      try {
        notifyBookingStatus(
          booking,
          "payment-complete",
          `Payment received for ${booking.route}. Booking reference: ${booking.reference}.`,
        );
      } catch {
        // The confirmation page remains authoritative if notifications are unavailable.
      }
      // The booking just changed live seat counts, so refresh the trip list.
      reloadTrips();
      reloadBookings();
      router.push("/transport-booking/payment/success");
      return;
    } catch (reason) {
      if (createdReference && shouldCancelCreatedBooking && !paymentRequestStarted) {
        try {
          await apiBookings.cancel(createdReference);
          setPendingBookingReference("");
          setPaymentPending(false);
          reloadTrips();
          reloadBookings();
        } catch {
          // Keep the original passenger or booking error visible if cleanup is unavailable.
        }
      }
      setError(reason instanceof Error ? reason.message : "The reservation could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="module-shell transport-page-shell">
      <div className="transport-background" aria-hidden="true" />
      {notice && <p className="module-notice" role="status">{notice}</p>}
      {error && !paymentPending && <p className="module-error" role="alert">{error}{!session && <> <Link href="/login/user">Sign in</Link></>}</p>}
      {((initialTripId && !initialTrip) || (selectedTripId && !selectedTrip)) && (
        <p className="module-error" role="alert">
          This scheduled trip is no longer available. Search again for an admin-scheduled departure.
        </p>
      )}

      <div className={`booking-page-columns${detailTrip ? " has-trip" : ""}`}>
      <section id="trips-heading" className="module-section" aria-label="Available departures">
        <div className={detailTrip ? "booking-search-layout" : "booking-search-layout is-split"}>
        <form className="module-form" onSubmit={searchTrips}>
          <div className="module-form-grid" style={{ gridTemplateColumns: "1fr" }}>
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
              ) : null}
            </label>
          </div>
          <datalist id="booking-towns">{towns.map((town) => <option key={town} value={town} />)}</datalist>
          {locationStatus && <p className="home-location-status" role="status">{locationStatus}</p>}
          <button className="primary-button book-trip-search-button" type="submit" disabled={openingTrip}>
            {openingTrip ? "Opening trip…" : "Book a trip"}
          </button>
        </form>
        {searchError && <p className="module-error" role="alert">{searchError}</p>}

        {!selectedTrip && (
        <div id="trip-results" className="trip-results">
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
            <div className="trip-chat-list">
              {tripPages.visibleItems.map((trip) => {
                const key = tripKey(trip);
                const seats = seatsByTrip.get(key) ?? availableSeats(trip, bookings);
                const [fromTown, toTown] = trip.route.split(" → ");
                return (
                  <Link
                    key={key}
                    className="trip-chat-item trip-chat-row"
                    href={`/transport-booking/details/${encodeURIComponent(trip.id)}?date=${encodeURIComponent(trip.date)}`}
                    aria-label={`View departure on ${fmtDate(trip.date)} at ${trip.departure}`}
                  >
                    <span className="trip-chat-avatar" aria-hidden="true">{fromTown?.slice(0, 1)}{toTown?.slice(0, 1)}</span>
                    <span className="trip-chat-copy">
                      <strong>{fmtDate(trip.date)} · {trip.departure}–{trip.arrival}</strong>
                      <span>MWK {trip.fare.toLocaleString("en-MW")} · {seats === 0 ? "Full" : `${seats} seats left`}</span>
                    </span>
                    <span className={`trip-chat-status${seats === 0 ? " is-full" : ""}`}>{seats === 0 ? "Full" : `${seats} left`}</span>
                  </Link>
                );
              })}
            </div>
          )}
          <ListPagination
            page={tripPages.page}
            pageCount={tripPages.pageCount}
            onPageChange={tripPages.setPage}
            label="departure"
          />
        </div>
        )}
        </div>
      </section>

      {selectedTrip && (
      <section id="reservation-heading" className="module-section" aria-label={paymentPending ? "Payment" : "Book your trip"}>
        {selectedTrip && (
          <div className="module-section-heading">
            <div>
              <h2>{selectedTrip.route}</h2>
            </div>
          </div>
        )}
        <div className={detailTrip ? `detail-booking-layout${paymentPending ? " is-payment" : ""}` : undefined}>
          <div className={detailTrip ? "detail-booking-main" : undefined}>
        {!selectedTrip ? null : paymentPending ? (
          <div className="payment-panel">
            <article className="trip-choice payment-trip-card" aria-label="Trip selected for booking">
              <div className="trip-choice-top">
                <span className="trip-service">{selectedTrip.vehicleType || "Scheduled trip"}</span>
              </div>
              <h3>Selected departure</h3>
              <dl className="trip-facts">
                <div><dt>Date</dt><dd>{fmtDate(travelDate)}</dd></div>
                <div><dt>Departure</dt><dd>{selectedTrip.departure}</dd></div>
                <div><dt>Arrival estimate</dt><dd>{selectedTrip.arrival}</dd></div>
                <div><dt>Seats</dt><dd>{selectedSeats.length > 0 ? selectedSeats.join(", ") : "None"}</dd></div>
                <div><dt>Passengers</dt><dd>{passengers}</dd></div>
                <div><dt>Fare</dt><dd>MWK {selectedTrip.fare.toLocaleString("en-MW")} <small>per passenger</small></dd></div>
              </dl>
              <div className="trip-stops">
                <p><strong>Board:</strong> {pickup || selectedTrip.pickup.join(" or ")}</p>
                <p><strong>Get off:</strong> {dropoff || selectedTrip.dropoff.join(" or ")}</p>
              </div>
            </article>
            <div>
              <h3>Payment summary</h3>
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
            {paymentMethodId.endsWith("_demo") && <div className="payment-provider-fields">
              <p className="module-footnote">Demonstration form only. Details are not sent to a provider or stored.</p>
              {(paymentMethodId === "airtel_demo" || paymentMethodId === "tnm_demo" || paymentMethodId === "paychangu_demo") && <label className="map-route-filter">{paymentMethodId === "paychangu_demo" ? "Payer phone number" : "Mobile money phone number"}<input value={paymentPhone} onChange={(event) => setPaymentPhone(event.target.value)} inputMode="tel" placeholder="e.g. 0991 234 567" /></label>}
              {(paymentMethodId === "bank_demo" || paymentMethodId === "paychangu_demo") && <label className="map-route-filter">Account or payer name<input value={paymentAccountName} onChange={(event) => setPaymentAccountName(event.target.value)} placeholder="Name on account" /></label>}
              {paymentMethodId === "bank_demo" && <>
                <label className="map-route-filter">Bank<select value={bankName} onChange={(event) => setBankName(event.target.value)}><option value="">Choose a Malawi bank</option>{MALAWI_BANKS.map((bank) => <option key={bank}>{bank}</option>)}</select></label>
                <label className="map-route-filter">Account number<input value={paymentAccountNumber} onChange={(event) => setPaymentAccountNumber(event.target.value)} inputMode="numeric" /></label>
              </>}
            </div>}
            {paymentMethodsLoading && <p className="module-copy" role="status">Loading payment methods…</p>}
            {paymentMethodsError && <p className="module-error" role="alert">{paymentMethodsError} <button type="button" className="text-action" onClick={() => {
              setPaymentMethodsLoading(true);
              setPaymentMethodsError("");
              setPaymentMethodLoadAttempt((attempt) => attempt + 1);
            }}>Retry</button></p>}
            {!paymentMethodsLoading && !paymentMethodsError && paymentMethods.length === 0 && <p className="module-error" role="alert">No supported payment methods are available.</p>}
            {error && <p className="module-error" role="alert">{error}</p>}
            {saving && <p className="module-copy" role="status">Sending payment request…</p>}
            <div className="payment-actions">
              <button className="primary-button" type="button" onClick={completePayment} disabled={saving || paymentMethodsLoading || paymentMethods.length === 0} aria-busy={saving}>
                Pay
              </button>
              <button className="secondary-button" type="button" onClick={() => setPaymentPending(false)} disabled={saving}>Back to reservation details</button>
            </div>
          </div>
        ) : (
          <form id="passenger-details-form" className="module-form" onSubmit={submitBooking} noValidate>
            {!session && <p className="module-notice" role="status">Sign in as a passenger to reserve seats and pay. <Link href="/login/user">Sign in</Link></p>}
            <div className="reservation-summary">
              <div>
                <strong>Selected departure</strong>
              </div>
              <div>
                <strong>{onboardSeats} of {selectedTrip.capacity}</strong>
                <small>MWK {selectedTrip.fare.toLocaleString("en-MW")} × {passengers} = MWK {(selectedTrip.fare * passengers).toLocaleString("en-MW")}</small>
              </div>
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

            {saving && <p className="module-copy" role="status">Holding your seats…</p>}
            <div className="reservation-actions">
              <button className="primary-button" type="button" onClick={returnToTrips}>Back to trips</button>
              <button className="primary-button form-submit" type="submit" disabled={saving || !session || available === 0 || passengers === 0 || passengers > available} aria-busy={saving}>
                {!session ? "Sign in to continue" : "Continue with payment"}
              </button>
            </div>
          </form>
        )}
          </div>
          {detailTrip && !paymentPending && (
            <aside className="detail-trip-side" aria-label="Seat selection">
              <div className="seat-step">
                  <div className="seat-step-intro">
                    <h3>Pick your seats</h3>
                  </div>
                  <div className="bus-seat-map">
                        <div className="bus-front">
                          <span className="bus-door">Door</span>
                          <span className="bus-aisle-label">Aisle</span>
                          <span className="driver-seat">Driver<small>Not bookable</small></span>
                        </div>
                        <div className="seat-grid bus-seat-grid" role="group" aria-label="Available seats">
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
                                    : "already selected";
                            return (
                              <button
                                key={seat}
                                type="button"
                                style={{ gridColumn: SEAT_COLUMNS[order % SEAT_COLUMNS.length], gridRow: Math.floor(order / SEAT_COLUMNS.length) + 1 }}
                                className={`seat-number${isSelected ? " is-selected" : ""}${isAvailable ? "" : " is-taken"}${isAdminSeat ? " is-admin" : ""}${isLockedByLimit ? " is-locked" : ""}`}
                                aria-pressed={isSelected}
                                aria-disabled={!isAvailable || isLockedByLimit}
                                aria-label={`Seat ${seat}, ${seatState}`}
                                title={isAdminSeat ? "Seat 1 is reserved by the admin next to the door" : isSelected ? `Seat ${seat} selected` : isLockedByLimit ? `Deselect a seat to choose seat ${seat}` : isAvailable ? `Choose seat ${seat}` : `Seat ${seat} has already been selected`}
                                onClick={() => toggleSeat(seat)}
                              >
                                <span>{seat}</span>
                                {isAdminSeat ? <small>Admin</small> : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                  {seatError && <p className="module-error" role="alert">{seatError}</p>}
                </div>
            </aside>
          )}
        </div>
      </section>
      )}
      {detailTrip && (
        <div className="detail-trip-map" aria-label="Trip route map">
          <h3>Route map</h3>
          <TripMap
            trips={[detailTrip]}
            userPosition={userPosition}
            cityCoordinates={TRANSPORT_TOWN_COORDINATES}
            tripRoadRoutes={tripRoadRoutes}
          />
        </div>
      )}
      </div>
    </main>
  );
}
