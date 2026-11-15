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

export function registerAccount(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<AuthPayload> {
  return register(input);
}

export function loginAccount(email: string, password: string): Promise<AuthPayload> {
  return login({ email, password });
}

export function requestAdminAccess(accessToken: string, reason: string): Promise<unknown> {
  return requestAdmin(reason, accessToken);
}
