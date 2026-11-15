<<<<<<< HEAD
export type BackendRole = "admin" | "driver" | "passenger";

export type BackendUser = {
  id: number;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  role: BackendRole;
};

export type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  user: BackendUser;
};

const AUTH_KEY = "routewise-backend-auth-v1";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function errorMessage(body: unknown, fallback: string): string {
  if (typeof body === "object" && body !== null) {
    const record = body as Record<string, unknown>;
    if (Array.isArray(record.message)) {
      return record.message.filter((item): item is string => typeof item === "string").join(" ");
    }
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
  }
  return fallback;
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/backend-api${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      errorMessage(body, `The server rejected the request (${response.status}).`),
      response.status,
    );
  }
  return body as T;
}
=======
/**
 * Backwards-compatible facade over the service layer.
 *
 * API calls live in `services/*`; this module keeps the older helpers working so
 * existing pages keep importing from one place. New code should import
 * `@/services` directly.
 */
import {
  clearAuth,
  readAuth,
  saveAuth,
} from "@/services/auth-storage";
import { login, register, requestAdmin } from "@/services/auth.service";
import { ApiError } from "@/services/http";
import type { AuthPayload, BackendRole, BackendUser } from "@/services/types";

export type { AuthPayload, BackendRole, BackendUser };
export { ApiError, clearAuth, readAuth, saveAuth };
>>>>>>> feature/integration

export function registerAccount(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<AuthPayload> {
<<<<<<< HEAD
  return apiRequest<AuthPayload>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function loginAccount(email: string, password: string): Promise<AuthPayload> {
  return apiRequest<AuthPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function requestAdminAccess(accessToken: string, reason: string): Promise<unknown> {
  return apiRequest("/auth/request-admin", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ reason }),
  });
}

export function saveAuth(auth: AuthPayload, remember = false): void {
  clearAuth();
  try {
    const store = remember ? localStorage : sessionStorage;
    store.setItem(AUTH_KEY, JSON.stringify(auth));
  } catch {
    // A blocked storage store must not undo a successful sign-in.
  }
}

export function readAuth(): AuthPayload | null {
  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = store.getItem(AUTH_KEY);
      if (!raw) continue;
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "accessToken" in parsed &&
        typeof parsed.accessToken === "string" &&
        "user" in parsed &&
        typeof parsed.user === "object" &&
        parsed.user !== null
      ) {
        return parsed as AuthPayload;
      }
    } catch {
      // Ignore unreadable or invalid saved auth and try the next store.
    }
  }
  return null;
}

export function clearAuth(): void {
  for (const store of [sessionStorage, localStorage]) {
    try {
      store.removeItem(AUTH_KEY);
    } catch {
      // Ignore blocked storage.
    }
  }
=======
  return register(input);
}

export function loginAccount(email: string, password: string): Promise<AuthPayload> {
  return login({ email, password });
}

export function requestAdminAccess(accessToken: string, reason: string): Promise<unknown> {
  return requestAdmin(reason, accessToken);
>>>>>>> feature/integration
}
