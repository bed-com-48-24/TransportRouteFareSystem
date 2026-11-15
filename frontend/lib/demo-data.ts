"use client";

import { useEffect } from "react";
import { KEYS } from "./seed";
import { loadList, saveList } from "./storage";
import type { Booking, Trip } from "./types";

/** Demo departures are dated relative to today so the prototype never runs dry. */
function dateInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Built when the seed runs (client only), never at import or prerender time. */
export function buildDemoTrips(): Trip[] {
  return [
    {
      id: "demo-bt-ll-0730",
      route: "Blantyre → Lilongwe",
      pickup: ["Blantyre Bus Depot", "Chichiri Shopping Centre"],
      dropoff: ["Lilongwe Bus Terminal", "Lilongwe City Centre Stage"],
      date: dateInDays(1),
      departure: "07:30",
      arrival: "15:30",
      capacity: 44,
      fare: 30000,
    },
    {
      id: "demo-ll-mz-0600",
      route: "Lilongwe → Mzuzu",
      pickup: ["Lilongwe Bus Terminal", "Lilongwe City Centre Stage"],
      dropoff: ["Mzuzu Bus Terminal", "Mzuzu Drop-off"],
      date: dateInDays(2),
      departure: "06:00",
      arrival: "14:00",
      capacity: 40,
      fare: 22000,
    },
    {
      id: "demo-bt-zo-0900",
      route: "Blantyre → Zomba",
      pickup: ["Blantyre Bus Depot", "Limbe Bus Station"],
      dropoff: ["Zomba Bus Depot", "Zomba Market"],
      date: dateInDays(3),
      departure: "09:00",
      arrival: "10:30",
      capacity: 22,
      fare: 8000,
    },
    {
      id: "demo-zo-bt-0930",
      route: "Zomba → Blantyre",
      pickup: ["Zomba Bus Depot", "Zomba Town Stage"],
      dropoff: ["Blantyre Bus Depot", "Limbe Bus Station"],
      date: dateInDays(3),
      departure: "09:30",
      arrival: "11:00",
      capacity: 22,
      fare: 8000,
    },
    {
      id: "demo-ll-bl-0615",
      route: "Lilongwe → Blantyre",
      pickup: ["Lilongwe Bus Terminal", "Lilongwe City Centre Stage"],
      dropoff: ["Blantyre Bus Depot", "Chichiri Shopping Centre"],
      date: dateInDays(4),
      departure: "06:15",
      arrival: "14:45",
      capacity: 44,
      fare: 30000,
    },
    {
      id: "demo-ll-sa-0900",
      route: "Lilongwe → Salima",
      pickup: ["Lilongwe Bus Terminal", "Lilongwe City Centre Stage"],
      dropoff: ["Salima Bus Stage", "Salima Drop-off"],
      date: dateInDays(5),
      departure: "09:00",
      arrival: "11:00",
      capacity: 18,
      fare: 7000,
    },
  ];
}

/** A few confirmed reservations so the seat map already shows taken seats. */
export function buildDemoBookings(trips: Trip[]): Booking[] {
  const travelDateFor = (tripId: string) => trips.find((trip) => trip.id === tripId)?.date ?? dateInDays(1);
  const createdAt = new Date().toISOString();

  return [
    {
      reference: "TR-DEMO1001",
      tripId: "demo-bt-ll-0730",
      route: "Blantyre → Lilongwe",
      travelDate: travelDateFor("demo-bt-ll-0730"),
      pickup: "Blantyre Bus Depot",
      dropoff: "Lilongwe Bus Terminal",
      passengers: 2,
      seats: [3, 4],
      name: "Demo Passenger",
      email: "demo.passenger@example.com",
      status: "confirmed",
      createdAt,
    },
    {
      reference: "TR-DEMO1002",
      tripId: "demo-bt-ll-0730",
      route: "Blantyre → Lilongwe",
      travelDate: travelDateFor("demo-bt-ll-0730"),
      pickup: "Chichiri Shopping Centre",
      dropoff: "Lilongwe City Centre Stage",
      passengers: 1,
      seats: [9],
      name: "Thoko Phiri",
      email: "thoko.demo@example.com",
      status: "confirmed",
      createdAt,
    },
    {
      reference: "TR-DEMO1003",
      tripId: "demo-bt-zo-0900",
      route: "Blantyre → Zomba",
      travelDate: travelDateFor("demo-bt-zo-0900"),
      pickup: "Limbe Bus Station",
      dropoff: "Zomba Bus Depot",
      passengers: 1,
      seats: [6],
      name: "Chisomo Banda",
      email: "chisomo.demo@example.com",
      status: "confirmed",
      createdAt,
    },
  ];
}

/**
 * Keep the mock departures usable without a backend: the demo trips are dated
 * relative to today, so refresh them whenever their stored dates are stale
 * (or missing). Admin-created trips are preserved.
 */
export function seedDemoData() {
  try {
    const demoTrips = buildDemoTrips();
    const storedTrips = loadList<Trip>(KEYS.trips, []);
    const demoIds = new Set(demoTrips.map((trip) => trip.id));
    const demoUpToDate = demoTrips.every((fresh) =>
      storedTrips.some((trip) => trip.id === fresh.id && trip.date === fresh.date),
    );

    if (!demoUpToDate) {
      saveList(KEYS.trips, [
        ...storedTrips.filter((trip) => !demoIds.has(trip.id)),
        ...demoTrips,
      ]);
    }

    if (localStorage.getItem(KEYS.bookings) === null) {
      saveList(KEYS.bookings, buildDemoBookings(demoTrips));
    }
  } catch {
    // Storage can be blocked; the pages still work with empty lists.
  }
}

export function useDemoSeed() {
  useEffect(() => {
    seedDemoData();
  }, []);
}
