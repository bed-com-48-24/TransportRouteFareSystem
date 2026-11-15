import { apiRequest, apiRequestList } from "./http";
import type { Vehicle } from "./types";

export type CreateVehicleInput = {
  plateNumber: string;
  vehicleType: string;
  capacity: number;
  description?: string;
  driverId?: number;
};

export type UpdateVehicleInput = Partial<CreateVehicleInput>;

export function list(): Promise<Vehicle[]> {
  return apiRequestList<Vehicle>("/transport-means");
}

export function get(id: number): Promise<Vehicle> {
  return apiRequest<Vehicle>(`/transport-means/${id}`);
}

export function create(input: CreateVehicleInput): Promise<Vehicle> {
  return apiRequest<Vehicle>("/transport-means", { method: "POST", body: input });
}

export function update(id: number, input: UpdateVehicleInput): Promise<Vehicle> {
  return apiRequest<Vehicle>(`/transport-means/${id}`, { method: "PATCH", body: input });
}

export function remove(id: number): Promise<unknown> {
  return apiRequest(`/transport-means/${id}`, { method: "DELETE" });
}

export function listForRoute(routeId: number): Promise<Vehicle[]> {
  return apiRequestList<Vehicle>(`/transport-means/route/${routeId}`);
}
