"use client";

/**
 * Page-level data hooks. The backend is the only source for displayed records.
 */
import { useApiList, type ApiList } from "./api-fallback";
import type { Booking, FareItem, RouteItem, StopItem, Trip } from "./types";
import {
  isoDateInDays,
  nextDateForWeekdays,
  toBooking,
  toFareItem,
  toRouteItem,
  toStopItem,
  toTrip,
} from "@/services/adapters";
import * as apiBookings from "@/services/bookings.service";
import * as apiRoutes from "@/services/routes.service";
import * as apiSchedules from "@/services/schedules.service";
import * as apiStops from "@/services/stops.service";
import * as apiUsers from "@/services/users.service";
import * as apiVehicles from "@/services/vehicles.service";
import type { BackendUser } from "@/services/types";

/** How many days ahead the schedule screens look. */
export const SCHEDULE_DAYS = 7;

export function useBackendRoutes(): ApiList<RouteItem> {
  return useApiList(
    async () => (await apiRoutes.list()).map(toRouteItem),
    () => [],
    "routes",
  );
}

/** Admin route list includes inactive routes that are hidden from passengers. */
export function useAdminBackendRoutes(): ApiList<RouteItem> {
  return useApiList(
    async () => (await apiRoutes.listForAdmin()).map(toRouteItem),
    () => [],
    "admin-routes",
  );
}

export function useBackendStops(): ApiList<StopItem> {
  return useApiList(
    async () => (await apiStops.listAll()).map(toStopItem),
    () => [],
    "stops",
  );
}

export function useBackendFares(): ApiList<FareItem> {
  return useApiList(
    async () => {
      const routes = await apiRoutes.list();

      // Fares usually travel with the route record; fetch per route otherwise.
      const nested = routes.flatMap((route) =>
        (route.fares ?? []).map((fare) => toFareItem({ ...fare, routeId: route.id })),
      );
      if (nested.length) return nested;

      const perRoute = await Promise.all(
        routes.map(async (route) => {
          try {
            const fares = await apiRoutes.listFares(route.id);
            return fares.map((fare) => toFareItem({ ...fare, routeId: route.id }));
          } catch {
            return [];
          }
        }),
      );
      return perRoute.flat();
    },
    () => [],
    "fares",
  );
}

/**
 * Schedules repeat weekly, so the backend needs one query per calendar date.
 */
export function useBackendTrips(days: number = SCHEDULE_DAYS): ApiList<Trip> {
  return useApiList(
    async () => {
      const dates = Array.from({ length: days }, (_, index) => isoDateInDays(index));
      const results = await Promise.allSettled(
        dates.map((date) => apiSchedules.search({ date })),
      );

      const fulfilled = results.flatMap((result, index) =>
        result.status === "fulfilled"
          ? [{ date: dates[index], schedules: result.value }]
          : [],
      );

      if (!fulfilled.length) {
        // Nothing answered: surface the API error and show an empty result.
        const firstRejected = results.find(
          (result): result is PromiseRejectedResult => result.status === "rejected",
        );
        throw firstRejected?.reason ?? new Error("Could not load schedules.");
      }

      return fulfilled.flatMap(({ date, schedules }) =>
        schedules.map((schedule) => toTrip(schedule, date)),
      );
    },
    () => [],
    `trips-${days}`,
  );
}

/** The signed-in passenger's bookings (/me/bookings). */
export function useMyBookings(): ApiList<Booking> {
  return useApiList<Booking>(
    async () => {
      const mine = await apiBookings.listMine({ pageSize: 50 });
      return mine.map((booking) => toBooking(booking));
    },
    () => [],
    "my-bookings",
  );
}

/**
 * Admin schedule list, enriched with route and vehicle records so the rows can
 * show names and seat capacity even if the list endpoint omits the joins.
 */
async function fetchAdminTrips(): Promise<Trip[]> {
  const [schedules, routes, vehicles] = await Promise.all([
    apiSchedules.listForAdmin(),
    apiRoutes.list().catch(() => []),
    apiVehicles.list().catch(() => []),
  ]);
  const routeById = new Map(routes.map((route) => [route.id, route]));
  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));

  return schedules.map((schedule) =>
    toTrip(
      {
        ...schedule,
        route: schedule.route ?? routeById.get(schedule.routeId),
        vehicle: schedule.vehicle ?? (schedule.vehicleId != null ? vehicleById.get(schedule.vehicleId) : undefined),
      },
      nextDateForWeekdays(schedule.daysOfWeek),
    ),
  );
}

/** Admin schedule list. Each weekly schedule is dated to its next occurrence. */
export function useAdminTrips(): ApiList<Trip> {
  return useApiList<Trip>(
    fetchAdminTrips,
    () => [],
    "admin-trips",
  );
}

/** Every passenger booking, for the admin bookings panel. */
export function useAdminBookings(): ApiList<Booking> {
  return useApiList<Booking>(
    async () => {
      const [rows, trips] = await Promise.all([
        apiBookings.listForAdmin({ pageSize: 100 }),
        fetchAdminTrips().catch(() => [] as Trip[]),
      ]);
      const tripById = new Map(trips.map((trip) => [trip.id, trip]));
      return rows.map((booking) => toBooking(booking, tripById.get(String(booking.scheduleId))));
    },
    () => [],
    "admin-bookings",
  );
}

/** Registered passenger accounts, used by the admin passengers panel. */
export function useAdminUsers(): ApiList<BackendUser> {
  return useApiList<BackendUser>(
    async () => apiUsers.list("passenger"),
    () => [],
    "admin-users",
  );
}
