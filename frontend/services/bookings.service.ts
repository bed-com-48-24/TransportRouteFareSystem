import { apiRequest, apiRequestList, apiRequestPage } from "./http";
import type { Booking, BookingStatus, Paginated } from "./types";

export type CreateBookingInput = {
  scheduleId: number;
  /** YYYY-MM-DD */
  travelDate: string;
  seatNumbers: number[];
  originStopId?: number;
  destinationStopId?: number;
};

export type BookingFilters = {
  page?: number;
  pageSize?: number;
  status?: BookingStatus;
  scheduleId?: number;
  /** YYYY-MM-DD */
  date?: string;
};

export type PassengerDetailsInput = {
  passengerName: string;
  phoneNumber: string;
  passengerEmail?: string;
  identificationNumber?: string;
};

function randomIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `bk-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Start a booking: holds the seats and returns a draft with a reference.
 * Pass the same idempotencyKey when retrying so seats are only held once.
 */
export function create(
  input: CreateBookingInput,
  idempotencyKey: string = randomIdempotencyKey(),
): Promise<Booking> {
  return apiRequest<Booking>("/bookings", {
    method: "POST",
    body: input,
    idempotencyKey,
  });
}

export function listMine(filters: BookingFilters = {}): Promise<Booking[]> {
  return apiRequestList<Booking>("/me/bookings", { query: filters });
}

/** Passenger manifest for a trip (driver only). */
export function driverManifest(scheduleId: number, travelDate: string): Promise<unknown> {
  return apiRequest(`/bookings/driver/${scheduleId}`, { query: { travelDate } });
}

export function get(reference: string): Promise<Booking> {
  return apiRequest<Booking>(`/bookings/${reference}`);
}

export function updatePassenger(
  reference: string,
  input: PassengerDetailsInput,
): Promise<Booking> {
  return apiRequest<Booking>(`/bookings/${reference}/passenger`, {
    method: "PATCH",
    body: input,
  });
}

export function cancel(reference: string): Promise<unknown> {
  return apiRequest(`/bookings/${reference}/cancel`, { method: "POST" });
}

export function listForAdmin(filters: BookingFilters = {}): Promise<Booking[]> {
  return apiRequestList<Booking>("/admin/bookings", { query: filters });
}

/** Admin bookings plus the backend's page metadata (useful for exhaustive scans). */
export function listForAdminPage(filters: BookingFilters = {}): Promise<Paginated<Booking>> {
  return apiRequestPage<Booking>("/admin/bookings", { query: filters });
}

export function getForAdmin(reference: string): Promise<Booking> {
  return apiRequest<Booking>(`/admin/bookings/${reference}`);
}
