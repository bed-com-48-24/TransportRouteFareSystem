/**
 * Single entry point for every backend call.
 *
 *   import { routes, bookings } from "@/services";
 *   const trips = await routes.search("Zomba", "Mzuzu");
 *
 * Pages and components should import from here (or a specific *.service file)
 * instead of calling fetch directly.
 */

export * as auth from "./auth.service";
export * as bookings from "./bookings.service";
export * as fares from "./fares.service";
export * as me from "./me.service";
export * as notifications from "./notifications.service";
export * as payments from "./payments.service";
export * as routes from "./routes.service";
export * as schedules from "./schedules.service";
export * as stops from "./stops.service";
export * as users from "./users.service";
export * as vehicles from "./vehicles.service";

export * as authStorage from "./auth-storage";
export {
  ApiError,
  apiDocsUrl,
  apiRequest,
  apiRequestList,
  apiRequestPage,
  backendApiUrl,
} from "./http";
export type { ApiScope, QueryValue, RequestOptions } from "./http";
export type * from "./types";
