import { getAvailableSeats, reserveBooking } from "./seat-inventory.mjs";

export type Trip = {
  id: string;
  route: string;
  pickup: string[];
  dropoff: string[];
  date: string;
  departure: string;
  arrival: string;
  capacity: number;
  fare: number;
};

export type Booking = {
  reference: string;
  tripId: string;
  route: string;
  travelDate: string;
  pickup: string;
  dropoff: string;
  passengers: number;
  name: string;
  email: string;
  status: "confirmed" | "cancelled";
  createdAt: string;
};

export const TRIPS: Trip[] = [
  { id: "BT-LB-0800", route: "Blantyre → Limbe", pickup: ["Blantyre Bus Depot", "Chichiri Shopping Centre"], dropoff: ["Limbe Bus Station", "Limbe Market"], date: "2026-10-28", departure: "08:00", arrival: "08:45", capacity: 14, fare: 2500 },
  { id: "BT-LB-1030", route: "Blantyre → Limbe", pickup: ["Blantyre Bus Depot", "Chichiri Shopping Centre"], dropoff: ["Limbe Bus Station", "Limbe Market"], date: "2026-10-28", departure: "10:30", arrival: "11:15", capacity: 18, fare: 2500 },
  { id: "BT-ZO-0900", route: "Blantyre → Zomba", pickup: ["Blantyre Bus Depot", "Limbe Bus Station"], dropoff: ["Zomba Bus Depot", "Zomba Market"], date: "2026-10-29", departure: "09:00", arrival: "10:30", capacity: 22, fare: 8000 },
];

export const STORAGE_KEY = "routewise-bookings-v1";
export const fmtDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-MW", { day: "numeric", month: "long", year: "numeric" });

export function readBookings(): Booking[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.reference === "string") as Booking[] : [];
  } catch { return []; }
}

export function availableSeats(trip: Trip, bookings = readBookings()) {
  return getAvailableSeats(trip.capacity, bookings, trip.id);
}

export async function createBooking(input: Omit<Booking, "reference" | "status" | "createdAt">, trip: Trip) {
  return reserveBooking({
    trip,
    passengers: input.passengers,
    locks: navigator.locks,
    readBookings,
    writeBookings: (updated: Booking[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)),
    createBooking: (): Booking => ({ ...input, reference: `TR-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`, status: "confirmed", createdAt: new Date().toISOString() }),
  });
}

export function saveBookings(bookings: Booking[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}
