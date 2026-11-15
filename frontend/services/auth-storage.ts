import type { AuthPayload } from "./types";

const AUTH_KEY = "routewise-backend-auth-v1";

function stores(): Storage[] {
  if (typeof window === "undefined") return [];
  return [sessionStorage, localStorage];
}

/**
 * Persist a signed-in session. Hit by auth.service callers only, never by pages.
 */
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
  for (const store of stores()) {
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

/** Bearer token for outgoing API calls, or null when signed out. */
export function getAccessToken(): string | null {
  return readAuth()?.accessToken ?? null;
}

export function getRefreshToken(): string | null {
  return readAuth()?.refreshToken ?? null;
}

export function clearAuth(): void {
  for (const store of stores()) {
    try {
      store.removeItem(AUTH_KEY);
    } catch {
      // Ignore blocked storage.
    }
  }
}
