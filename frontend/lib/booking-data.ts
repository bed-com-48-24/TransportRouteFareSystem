import { reserveBooking } from "./seat-inventory.mjs";
import { KEYS } from "./seed";
import { loadList, saveList } from "./storage";
import type { Booking, Trip } from "./types";

export type { Booking, Trip } from "./types";

// Reference/demo data only. Passenger-facing pages must use admin-scheduled trips
// from KEYS.trips; they intentionally do not fall back to these seed departures.
export const TRIPS: Trip[] = [
  {
    id: "BT-LB-0800",
    route: "Blantyre → Limbe",
    pickup: ["Blantyre Bus Depot", "Chichiri Shopping Centre"],
    dropoff: ["Limbe Bus Station", "Limbe Market"],
    date: "2026-11-03",
    departure: "08:00",
    arrival: "08:45",
    capacity: 14,
    fare: 2500,
  },
  {
    id: "BT-LB-1030",
    route: "Blantyre → Limbe",
    pickup: ["Blantyre Bus Depot", "Chichiri Shopping Centre"],
    dropoff: ["Limbe Bus Station", "Limbe Market"],
    date: "2026-11-03",
    departure: "10:30",
    arrival: "11:15",
    capacity: 18,
    fare: 2500,
  },
  {
    id: "BT-ZO-0900",
    route: "Blantyre → Zomba",
    pickup: ["Blantyre Bus Depot", "Limbe Bus Station"],
    dropoff: ["Zomba Bus Depot", "Zomba Market"],
    date: "2026-11-04",
    departure: "09:00",
    arrival: "10:30",
    capacity: 22,
    fare: 8000,
  },
  {
    id: "LL-MZ-0600",
    route: "Lilongwe → Mzuzu",
    pickup: ["Lilongwe Bus Terminal", "Lilongwe City Centre Stage"],
    dropoff: ["Mzuzu Bus Terminal", "Mzuzu Drop-off"],
    date: "2026-11-03",
    departure: "06:00",
    arrival: "14:00",
    capacity: 40,
    fare: 22000,
  },
  {
    id: "MZ-LL-0630",
    route: "Mzuzu → Lilongwe",
    pickup: ["Mzuzu Bus Terminal", "Mzuzu Drop-off"],
    dropoff: ["Lilongwe Bus Terminal", "Lilongwe City Centre Stage"],
    date: "2026-11-04",
    departure: "06:30",
    arrival: "14:30",
    capacity: 40,
    fare: 22000,
  },
  {
    id: "LL-SA-0900",
    route: "Lilongwe → Salima",
    pickup: ["Lilongwe Bus Terminal", "Lilongwe City Centre Stage"],
    dropoff: ["Salima Bus Stage", "Salima Drop-off"],
    date: "2026-11-03",
    departure: "09:00",
    arrival: "11:00",
    capacity: 18,
    fare: 7000,
  },
  {
    id: "LL-MC-0800",
    route: "Lilongwe → Mchinji",
    pickup: ["Lilongwe Bus Terminal", "Lilongwe City Centre Stage"],
    dropoff: ["Mchinji Bus Station"],
    date: "2026-11-04",
    departure: "08:00",
    arrival: "12:00",
    capacity: 28,
    fare: 12000,
  },
  {
    id: "LL-KA-0700",
    route: "Lilongwe → Kasungu",
    pickup: ["Lilongwe Bus Terminal", "Lilongwe City Centre Stage"],
    dropoff: ["Kasungu Bus Depot", "Kasungu Market Drop-off"],
    date: "2026-11-05",
    departure: "07:00",
    arrival: "10:30",
    capacity: 24,
    fare: 10000,
  },
  {
    id: "BT-MA-0600",
    route: "Blantyre → Mangochi",
    pickup: ["Blantyre Bus Depot", "Chichiri Shopping Centre"],
    dropoff: ["Mangochi Bus Depot", "Mangochi Market Drop-off"],
    date: "2026-11-05",
    departure: "06:00",
    arrival: "12:00",
    capacity: 32,
    fare: 18000,
  },
  {
    id: "LL-DE-1030",
    route: "Lilongwe → Dedza",
    pickup: ["Lilongwe Bus Terminal", "Lilongwe City Centre Stage"],
    dropoff: ["Dedza Bus Depot"],
    date: "2026-11-03",
    departure: "10:30",
    arrival: "12:00",
    capacity: 20,
    fare: 6500,
  },
  {
    id: "BT-LL-0600",
    route: "Blantyre → Lilongwe",
    pickup: ["Blantyre Bus Depot", "Chichiri Shopping Centre"],
    dropoff: ["Lilongwe Bus Terminal", "Lilongwe City Centre Stage"],
    date: "2026-11-03",
    departure: "06:00",
    arrival: "14:30",
    capacity: 44,
    fare: 30000,
  },
  {
    id: "LL-BT-0615",
    route: "Lilongwe → Blantyre",
    pickup: ["Lilongwe Bus Terminal", "Lilongwe City Centre Stage"],
    dropoff: ["Blantyre Bus Depot", "Chichiri Shopping Centre"],
    date: "2026-11-04",
    departure: "06:15",
    arrival: "14:45",
    capacity: 44,
    fare: 30000,
  },
  {
    id: "MZ-KA-0730",
    route: "Mzuzu → Karonga",
    pickup: ["Mzuzu Bus Terminal", "Mzuzu Drop-off"],
    dropoff: ["Karonga Bus Station"],
    date: "2026-11-04",
    departure: "07:30",
    arrival: "12:00",
    capacity: 24,
    fare: 10000,
  },
  {
    id: "ZO-BT-0900",
    route: "Zomba → Blantyre",
    pickup: ["Zomba Bus Depot", "Zomba Town Stage"],
    dropoff: ["Blantyre Bus Depot", "Limbe Bus Station"],
    date: "2026-11-05",
    departure: "09:00",
    arrival: "10:30",
    capacity: 22,
    fare: 8000,
  },
  {
    id: "SA-LL-0800",
    route: "Salima → Lilongwe",
    pickup: ["Salima Bus Stage", "Salima Drop-off"],
    dropoff: ["Lilongwe Bus Terminal", "Lilongwe City Centre Stage"],
    date: "2026-11-05",
    departure: "08:00",
    arrival: "10:00",
    capacity: 18,
    fare: 7000,
  },
];

export function getUpcomingSeedTrips(): Trip[] {
  const today = new Date();
  const format = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const d0 = format(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const d1 = format(tomorrow);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);
  const d2 = format(dayAfter);

  return TRIPS.map((trip, idx) => {
    const date = trip.date >= d0 ? trip.date : (idx % 3 === 0 ? d0 : idx % 3 === 1 ? d1 : d2);
    return { ...trip, date };
  });
}

export const SEED_TRIPS: Trip[] = getUpcomingSeedTrips();

export const STORAGE_KEY = KEYS.bookings;

export const fmtDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-MW", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export function readBookings(): Booking[] {
  return loadList<Booking>(STORAGE_KEY, []);
}

// Seat 1 sits next to the door and is always reserved for the transport admin,
// so passengers can never pick it.
export const ADMIN_RESERVED_SEATS: number[] = [1];

export function adminReservedSeatNumbers(trip: Trip) {
  return ADMIN_RESERVED_SEATS.filter((seat) => seat <= trip.capacity);
}

export function availableSeats(trip: Trip, bookings = readBookings()) {
  return availableSeatNumbers(trip, bookings).length;
}

export function reservedSeatNumbers(trip: Trip, bookings = readBookings()) {
  const reserved = new Set<number>(adminReservedSeatNumbers(trip));
  let legacyPassengerCount = 0;

  for (const booking of bookings) {
    if (booking.tripId !== trip.id || booking.status !== "confirmed") continue;
    // A weekly schedule reuses one trip id for every travel date, so seats
    // booked on another date must not reduce this date's availability.
    if (booking.travelDate && booking.travelDate !== trip.date) continue;

    if (Array.isArray(booking.seats) && booking.seats.length > 0) {
      for (const seat of booking.seats) {
        if (Number.isSafeInteger(seat) && seat >= 1 && seat <= trip.capacity) {
          reserved.add(seat);
        }
      }
      continue;
    }

    if (Number.isSafeInteger(booking.passengers) && booking.passengers > 0) {
      legacyPassengerCount += booking.passengers;
    }
  }

  let seat = 1;
  let remaining = legacyPassengerCount;
  while (remaining > 0 && seat <= trip.capacity) {
    if (!reserved.has(seat)) {
      reserved.add(seat);
      remaining -= 1;
    }
    seat += 1;
  }

  return reserved;
}

export function availableSeatNumbers(trip: Trip, bookings = readBookings()) {
  const reserved = reservedSeatNumbers(trip, bookings);
  return Array.from({ length: trip.capacity }, (_, index) => index + 1).filter(
    (seat) => !reserved.has(seat),
  );
}

export async function createBooking(
  input: Omit<Booking, "reference" | "status" | "createdAt">,
  trip: Trip,
) {
  const adminSeats = adminReservedSeatNumbers(trip);
  if (input.seats?.some((seat) => adminSeats.includes(seat))) {
    throw new Error(`Seat ${adminSeats[0]} is reserved by the transport admin and cannot be booked.`);
  }

  return reserveBooking<Booking>({
    // The admin's seat is not sellable, so it reduces the bookable capacity.
    trip: { ...trip, capacity: Math.max(0, trip.capacity - adminSeats.length) },
    passengers: input.passengers,
    locks: typeof navigator === "undefined" ? undefined : navigator.locks,
    readBookings,
    writeBookings: saveBookings,
    createBooking: () => ({
      ...input,
      reference: `TR-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    }),
  });
}

export function saveBookings(bookings: Booking[]) {
  saveList(STORAGE_KEY, bookings);
}