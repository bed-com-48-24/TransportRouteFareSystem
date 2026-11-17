import { apiRequest, apiRequestList } from "./http";
import type { BackendRole, BackendUser } from "./types";

export function list(role?: BackendRole): Promise<BackendUser[]> {
  return apiRequestList<BackendUser>("/users", { query: { role } });
}

export function get(id: number): Promise<BackendUser> {
  return apiRequest<BackendUser>(`/users/${id}`);
}

