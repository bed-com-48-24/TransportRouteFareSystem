import { apiRequest, apiRequestList, apiRequestPage } from "./http";
import type { Paginated, Stop } from "./types";

export type CreateStopInput = {
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
};

export type UpdateStopInput = Partial<CreateStopInput> & {
  /** Hide a stop without deleting it (it stays linked to historical routes/bookings). */
  isActive?: boolean;
};

/**
 * GET /stops — paginated envelope ({ data, total, page, limit }).
 * This endpoint takes `limit` (not `pageSize`) and rejects unknown query keys.
 */
export function list(page?: { page?: number; limit?: number }): Promise<Paginated<Stop>> {
  return apiRequestPage<Stop>("/stops", { query: page });
}

/** Every active stop, following the backend's pages (default page size is 20). */
export async function listAll(): Promise<Stop[]> {
  const limit = 100;
  const first = await list({ page: 1, limit });
  const pageCount = Math.max(1, Math.ceil(first.total / limit));
  if (pageCount === 1) return first.data;

  const remaining = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) => list({ page: index + 2, limit })),
  );
  return [...first.data, ...remaining.flatMap((page) => page.data)];
}

export function nearby(lat: number, lng: number, radius: number): Promise<Stop[]> {
  return apiRequestList<Stop>("/stops/nearby", {
    query: { lat: String(lat), lng: String(lng), radius: String(radius) },
  });
}

/** Autocomplete used by the "where to?" search box. */
export function searchPlaces(q: string, limit = 8): Promise<Stop[]> {
  return apiRequestList<Stop>("/stops/places/search", { query: { q, limit } });
}

export function get(id: number): Promise<Stop> {
  return apiRequest<Stop>(`/stops/${id}`);
}

export function create(input: CreateStopInput): Promise<Stop> {
  return apiRequest<Stop>("/stops", { method: "POST", body: input });
}

export function update(id: number, input: UpdateStopInput): Promise<Stop> {
  return apiRequest<Stop>(`/stops/${id}`, { method: "PATCH", body: input });
}

export function remove(id: number): Promise<unknown> {
  return apiRequest(`/stops/${id}`, { method: "DELETE" });
}
