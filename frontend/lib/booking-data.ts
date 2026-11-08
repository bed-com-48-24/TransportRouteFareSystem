import { getAvailableSeats, getBookedSeatNumbers, reserveBooking } from "./seat-inventory.mjs";
import { KEYS } from "./seed";
import { loadList, saveList } from "./storage";
import type { Booking, Trip } from "./types";

export type { Booking, Trip } from "./types";
export { getBookedSeatNumbers };

const STANDARD_BUS_CAPACITY = 60;

export const TRIPS: Trip[] = [
  {
    id: "BT-LB-0800",
    route: "Blantyre → Limbe",
    pickup: ["Blantyre Bus Depot", "Chichiri Shopping Centre"],
    dropoff: ["Limbe Bus Station", "Limbe Market"],
    date: "2026-11-03",
    departure: "08:00",
    arrival: "08:45",
    capacity: STANDARD_BUS_CAPACITY,
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
    capacity: STANDARD_BUS_CAPACITY,
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
    capacity: STANDARD_BUS_CAPACITY,
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
    capacity: STANDARD_BUS_CAPACITY,
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
    capacity: STANDARD_BUS_CAPACITY,
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
    capacity: STANDARD_BUS_CAPACITY,
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
    capacity: STANDARD_BUS_CAPACITY,
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
    capacity: STANDARD_BUS_CAPACITY,
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
    capacity: STANDARD_BUS_CAPACITY,
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
    capacity: STANDARD_BUS_CAPACITY,
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
    capacity: STANDARD_BUS_CAPACITY,
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
    capacity: STANDARD_BUS_CAPACITY,
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
    capacity: STANDARD_BUS_CAPACITY,
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
    capacity: STANDARD_BUS_CAPACITY,
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
    capacity: STANDARD_BUS_CAPACITY,
    fare: 7000,
  },
];

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

export function availableSeats(trip: Trip, bookings = readBookings()) {
  return getAvailableSeats(trip.capacity, bookings, trip.id);
}

export async function createBooking(
  input: Omit<Booking, "reference" | "status" | "createdAt" | "seatNumbers"> & { seatNumbers: number[] },
  trip: Trip,
) {
  return reserveBooking<Booking>({
    trip,
    passengers: input.passengers,
    seatNumbers: input.seatNumbers,
    locks: typeof navigator === "undefined" ? undefined : navigator.locks,
    readBookings,
    writeBookings: saveBookings,
    createBooking: (seatNumbers) => ({
      ...input,
      seatNumbers,
      reference: `TR-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    }),
  });
}

export function saveBookings(bookings: Booking[]) {
  saveList(STORAGE_KEY, bookings);
}