import { apiRequest, apiRequestList } from "./http";
import type { Schedule, SeatAvailability, Weekday } from "./types";

export type ScheduleSearch = {
  origin?: string;
  destination?: string;
  routeId?: number;
  /** YYYY-MM-DD */
  date?: string;
  availableOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export type CreateScheduleInput = {
  routeId: number;
  vehicleId: number;
  departureStopId: number;
  /** HH:mm */
  departureTime: string;
  /** HH:mm */
  arrivalAt?: string;
  fare?: number;
  daysOfWeek: Weekday[];
};

export type UpdateScheduleInput = Partial<CreateScheduleInput>;

/**
 * Seat map for one trip on one date. The live backend returns counts
 * (`capacity`/`availableSeats`/`occupiedSeats`/`heldSeats`); an array of
 * seat numbers or a per-seat list may appear on other builds.
 */
export type ScheduleSeats = {
  scheduleId?: number;
  date?: string;
  capacity?: number;
  seats?: SeatAvailability[];
  bookedSeats?: number[];
  availableSeats?: number[] | number;
  occupiedSeats?: number;
  heldSeats?: number;
  [key: string]: unknown;
};

export function search(filters: ScheduleSearch = {}): Promise<Schedule[]> {
  return apiRequestList<Schedule>("/schedules", { query: filters });
}

export function get(id: number, date: string): Promise<Schedule> {
  return apiRequest<Schedule>(`/schedules/${id}`, { query: { date } });
}

export function getSeats(id: number, date: string): Promise<ScheduleSeats> {
  return apiRequest<ScheduleSeats>(`/schedules/${id}/seats`, { query: { date } });
}

export function listForAdmin(): Promise<Schedule[]> {
  return apiRequestList<Schedule>("/admin/schedules");
}

export function getForAdmin(id: number): Promise<Schedule> {
  return apiRequest<Schedule>(`/admin/schedules/${id}`);
}

export function create(input: CreateScheduleInput): Promise<Schedule> {
  return apiRequest<Schedule>("/admin/schedules", { method: "POST", body: input });
}

export function update(id: number, input: UpdateScheduleInput): Promise<Schedule> {
  return apiRequest<Schedule>(`/admin/schedules/${id}`, { method: "PATCH", body: input });
}

export function remove(id: number): Promise<unknown> {
  return apiRequest(`/admin/schedules/${id}`, { method: "DELETE" });
}
