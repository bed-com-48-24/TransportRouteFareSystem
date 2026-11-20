import { apiRequest, apiRequestList } from "./http";
import type { Fare, Route } from "./types";

export type CreateRouteInput = {
  name: string;
  originStopId: number;
  destinationStopId: number;
  intermediateStopIds?: number[];
  distance?: number;
  companyName?: string;
  pickupLocation?: string;
  featured?: boolean;
};

export type UpdateRouteInput = {
  name?: string;
  distance?: number;
  companyName?: string;
  pickupLocation?: string;
  featured?: boolean;
  isActive?: boolean;
};

export function list(filters?: {
  originStopId?: number;
  destinationStopId?: number;
}): Promise<Route[]> {
  return apiRequestList<Route>("/routes", { query: filters });
}

/** Search by city names, e.g. "Zomba" → "Mzuzu". */
export function search(origin: string, destination: string): Promise<Route[]> {
  return apiRequestList<Route>("/routes/search", { query: { origin, destination } });
}

export function get(id: number): Promise<Route> {
  return apiRequest<Route>(`/routes/${id}`);
}

export function create(input: CreateRouteInput): Promise<Route> {
  return apiRequest<Route>("/routes", { method: "POST", body: input });
}

export function update(id: number, input: UpdateRouteInput): Promise<Route> {
  return apiRequest<Route>(`/routes/${id}`, { method: "PATCH", body: input });
}

export function remove(id: number): Promise<unknown> {
  return apiRequest(`/routes/${id}`, { method: "DELETE" });
}

/** Admin view: includes inactive routes. */
export function listForAdmin(): Promise<Route[]> {
  return apiRequestList<Route>("/routes/admin/list");
}

export function updateFare(id: number, amount: number): Promise<Route> {
  return apiRequest<Route>(`/routes/${id}/fare`, {
    method: "PATCH",
    body: { amount },
  });
}

/** Fares are nested under their route. */
export function listFares(routeId: number): Promise<Fare[]> {
  return apiRequestList<Fare>(`/routes/${routeId}/fares`);
}
