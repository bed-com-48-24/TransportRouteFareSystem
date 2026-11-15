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

export function toStopItem(stop: Stop): StopItem {
  return {
    id: String(stop.id),
    name: stop.name,
    kind: "both",
    city: stop.name.split(" ")[0] ?? stop.name,
    lat: stop.latitude,
    lng: stop.longitude,
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
