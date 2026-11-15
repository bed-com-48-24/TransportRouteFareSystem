/**
 * Maps backend payloads onto the view models the pages already render.
 * Keeps UI components free of API-specific field names.
 */
import type {
  Booking as ApiBooking,
  Fare,
  Route,
  Schedule,
  Stop,
} from "./types";
import type { Booking, FareItem, RouteItem, StopItem, Trip } from "@/lib/types";

function splitRouteName(name: string): { origin: string; destination: string } {
  const parts = name.split(/\s*(?:→|->|\bto\b)\s*/i);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return { origin: parts[0].trim(), destination: parts[1].trim() };
  }
  return { origin: name, destination: "" };
}

/** City names for a route, preferring the joined stop records. */
export function routeEndpoints(route: Route): { origin: string; destination: string } {
  const fromStops = {
    origin: route.originStop?.name,
    destination: route.destinationStop?.name,
  };
  const parsed = splitRouteName(route.name);
  return {
    origin: fromStops.origin ?? parsed.origin,
    destination: fromStops.destination ?? parsed.destination,
  };
}

/** Ordered stop names along a route. */
export function routeStopNames(route: Route | undefined): string[] {
  if (!route) return [];
  const stops = route.stops ?? route.intermediateStops ?? [];
  const names = stops
    .map((item) => item.stop?.name ?? "")
    .filter((name): name is string => Boolean(name));
  if (names.length) return names;
  return route.pickupLocation ? [route.pickupLocation] : [];
}

type StopMeta = { city?: unknown; kind?: unknown };

/**
 * The backend stop record only has name/latitude/longitude, so the admin screen
 * keeps its town and point-type fields in `description` as JSON.
 */
function stopMeta(stop: Stop): StopMeta {
  if (!stop.description) return {};
  try {
    const parsed = JSON.parse(stop.description) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as StopMeta) : {};
  } catch {
    return {};
  }
}

export function toStopItem(stop: Stop): StopItem {
  const meta = stopMeta(stop);
  const kind =
    meta.kind === "pickup" || meta.kind === "dropoff" || meta.kind === "both"
      ? meta.kind
      : "both";
  return {
    id: String(stop.id),
    name: stop.name,
    kind,
    city:
      typeof meta.city === "string" && meta.city
        ? meta.city
        : (stop.name.split(" ")[0] ?? stop.name),
    lat: stop.latitude,
    lng: stop.longitude,
  };
}

/** Inverse of toStopItem, for POST/PATCH /stops. */
export function fromStopItem(stop: {
  name: string;
  city: string;
  kind: StopItem["kind"];
  lat: number | null;
  lng: number | null;
}): { name: string; latitude: number; longitude: number; description: string } {
  return {
    name: stop.name,
    latitude: stop.lat ?? 0,
    longitude: stop.lng ?? 0,
    description: JSON.stringify({ city: stop.city, kind: stop.kind }),
  };
}

export function toRouteItem(route: Route): RouteItem {
  const { origin, destination } = routeEndpoints(route);
  return {
    id: String(route.id),
    origin,
    destination,
    service: route.companyName ?? "Bus",
  };
}

export function toFareItem(fare: Fare): FareItem {
  return {
    id: String(fare.id),
    routeId: String(fare.routeId ?? ""),
    amount: fare.amount,
  };
}

function cheapestFare(route: Route | undefined): number | undefined {
  const amounts = (route?.fares ?? []).map((fare) => fare.amount).filter((value) => value > 0);
  return amounts.length ? Math.min(...amounts) : undefined;
}

/**
 * A schedule is a recurring weekly departure, so the calendar date comes from
 * the search that produced it.
 */
export function toTrip(schedule: Schedule, date: string): Trip {
  const route = schedule.route;
  const { origin, destination } = route
    ? routeEndpoints(route)
    : { origin: `Route ${schedule.routeId}`, destination: "" };
  const stops = routeStopNames(route);

  return {
    id: String(schedule.id),
    route: `${origin} → ${destination}`,
    pickup: stops,
    dropoff: stops,
    date,
    departure: schedule.departureTime,
    arrival: schedule.arrivalAt ?? "",
    capacity: schedule.vehicle?.capacity ?? 0,
    fare: schedule.fare ?? cheapestFare(route) ?? 0,
  };
}

const CANCELLED_STATUSES = new Set(["cancelled", "expired"]);

export function toBooking(booking: ApiBooking, trip?: Trip): Booking {
  const seats = booking.seatNumbers ?? [];
  return {
    reference: booking.reference,
    tripId: String(booking.scheduleId),
    route: trip?.route ?? "",
    travelDate: booking.travelDate,
    pickup: trip?.pickup[0] ?? "",
    dropoff: trip?.dropoff[trip.dropoff.length - 1] ?? "",
    passengers: seats.length,
    seats,
    name: booking.passengerName ?? "",
    email: booking.passengerEmail ?? "",
    status: CANCELLED_STATUSES.has(booking.status) ? "cancelled" : "confirmed",
    createdAt: booking.createdAt ?? new Date().toISOString(),
    paymentStatus:
      booking.status === "paid" || booking.status === "confirmed" ? "paid" : "pending",
    amountPaid: booking.amount,
  };
}

/** YYYY-MM-DD for a day offset from today. */
export function isoDateInDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

/**
 * A schedule repeats weekly, so an admin row needs a representative date: the
 * next day it actually runs, starting today.
 */
export function nextDateForWeekdays(days?: readonly string[] | null): string {
  const wanted = new Set((days ?? []).map((day) => day.toUpperCase()));
  if (wanted.size === 0) return isoDateInDays(0);

  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    if (wanted.has(WEEKDAYS[date.getDay()])) return isoDateInDays(offset);
  }
  return isoDateInDays(0);
}

/** The backend day codes for one calendar date: ["MON"] etc. */
export function weekdaysForDate(date: string): string[] {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return [];
  return [WEEKDAYS[parsed.getDay()]];
}
