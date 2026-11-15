import { apiRequest } from "./http";
import type { Fare } from "./types";

export type CreateFareInput = {
  originStopId: number;
  destinationStopId: number;
  amount: number;
  currency?: string;
};

export type UpdateFareInput = Partial<CreateFareInput>;

export function create(routeId: number, input: CreateFareInput): Promise<Fare> {
  return apiRequest<Fare>(`/routes/${routeId}/fares`, { method: "POST", body: input });
}

export function update(id: number, input: UpdateFareInput): Promise<Fare> {
  return apiRequest<Fare>(`/fares/${id}`, { method: "PATCH", body: input });
}

export function remove(id: number): Promise<unknown> {
  return apiRequest(`/fares/${id}`, { method: "DELETE" });
}
