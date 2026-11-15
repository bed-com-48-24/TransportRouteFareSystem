"use client";

/**
 * Page-level data hooks. Each one reads from the backend and only falls back to
 * the demo dataset when the API cannot be reached (see lib/api-fallback.ts).
 */
import { useApiList, type ApiList } from "./api-fallback";
import { buildDemoBookings, buildDemoTrips } from "./demo-data";
import { SEED_FARES, SEED_ROUTES, SEED_STOPS } from "./seed";
import type { Booking, FareItem, RouteItem, StopItem, Trip } from "./types";
import {
  isoDateInDays,
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

/** How many days ahead the schedule screens look. */
export const SCHEDULE_DAYS = 7;

export function useBackendRoutes(): ApiList<RouteItem> {
  return useApiList(
    async () => (await apiRoutes.list()).map(toRouteItem),
    () => SEED_ROUTES,
    "routes",
  );
}

export function useBackendStops(): ApiList<StopItem> {
  return useApiList(
    async () => (await apiStops.listAll()).map(toStopItem),
    () => SEED_STOPS,
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
    () => SEED_FARES,
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
        // Nothing answered: treat the backend as unavailable so demo data shows.
        const firstRejected = results.find(
          (result): result is PromiseRejectedResult => result.status === "rejected",
        );
        throw firstRejected?.reason ?? new Error("Could not load schedules.");
      }

      return fulfilled.flatMap(({ date, schedules }) =>
        schedules.map((schedule) => toTrip(schedule, date)),
      );
    },
    () => buildDemoTrips(),
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
    () => buildDemoBookings(buildDemoTrips()),
    "my-bookings",
  );
}
