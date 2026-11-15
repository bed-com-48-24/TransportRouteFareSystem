import { apiRequest, apiRequestList } from "./http";
import type { AuthPayload } from "./types";

export type RegisterInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type PendingRequest = {
  id: number;
  type?: string;
  status?: string;
  user?: { id: number; fullName: string; email?: string };
};

export function register(input: RegisterInput): Promise<AuthPayload> {
  return apiRequest<AuthPayload>("/auth/register", {
    method: "POST",
    body: input,
    auth: false,
  });
}

export function login(input: LoginInput): Promise<AuthPayload> {
  return apiRequest<AuthPayload>("/auth/login", {
    method: "POST",
    body: input,
    auth: false,
  });
}

/** Swap an expired access token for a fresh pair. */
export function refresh(refreshToken: string): Promise<AuthPayload> {
  return apiRequest<AuthPayload>("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
    auth: false,
  });
}

export function logout(): Promise<unknown> {
  return apiRequest("/auth/logout", { method: "POST" });
}

export function requestAdmin(reason: string, token?: string): Promise<unknown> {
  return apiRequest("/auth/request-admin", {
    method: "POST",
    body: { reason },
    token,
  });
}

export function requestDriver(licenseId: string): Promise<unknown> {
  return apiRequest("/auth/request-driver", {
    method: "POST",
    body: { licenseId },
  });
}

export function listRequests(type: "admin" | "driver"): Promise<PendingRequest[]> {
  return apiRequestList<PendingRequest>("/auth/requests", { query: { type } });
}

export function approveRequest(id: number): Promise<unknown> {
  return apiRequest(`/auth/requests/${id}/approve`, { method: "POST" });
}
