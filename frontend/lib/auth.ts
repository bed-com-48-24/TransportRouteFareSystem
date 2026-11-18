"use client";

import { useMemo, useSyncExternalStore } from "react";
import { KEYS } from "./seed";
import { loginPassengerWithRole } from "./passenger-auth";
import {
  clearAuth,
  loginAccount,
  registerAccount,
  requestAdminAccess,
  saveAuth,
} from "./backend-api";
import * as authApi from "@/services/auth.service";

export type SessionRole = "admin" | "passenger" | "driver";
export type Session = { email: string; role: SessionRole } | null;

const REMEMBERED_SESSION_KEY = "sbus_remembered_session_v1";
const ADMIN_PROFILES_KEY = "sbus_admin_profiles_v1";

type AdminProfile = { companyName: string; email: string };

const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return (
      sessionStorage.getItem(KEYS.session) ??
      localStorage.getItem(REMEMBERED_SESSION_KEY)
    );
  } catch {
    return null;
  }
}

function readAdminProfiles(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ADMIN_PROFILES_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

function saveAdminProfile(email: string, companyName: string): void {
  try {
    localStorage.setItem(
      ADMIN_PROFILES_KEY,
      JSON.stringify({ ...readAdminProfiles(), [email]: companyName }),
    );
  } catch {
    // The profile is optional; ignore blocked storage.
  }
}

function demoDisplayName(email: string): string {
  const localPart = email.split("@")[0] ?? "";
  const words = localPart.replace(/[._-]+/g, " ").trim();
  return words
    ? words.replace(/\b\w/g, (character) => character.toUpperCase())
    : "Demo Transport Company";
}

function startSession(email: string, role: SessionRole, remember = false) {
  const value = JSON.stringify({ email, role });
  sessionStorage.setItem(KEYS.session, value);
  try {
    if (remember) {
      localStorage.setItem(REMEMBERED_SESSION_KEY, value);
    } else {
      localStorage.removeItem(REMEMBERED_SESSION_KEY);
    }
  } catch {
    // Remember-me is optional; ignore blocked storage.
  }
  listeners.forEach((fn) => fn());
}

function startAdminSession(email: string, remember = false) {
  startSession(email, "admin", remember);
}

export async function registerAdmin(
  companyName: string,
  email: string,
  password: string,
  phone = "",
): Promise<void> {
  const normalizedCompanyName = companyName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone.trim();

  if (normalizedCompanyName.length < 2 || normalizedCompanyName.length > 100) {
    throw new Error("Enter a company name between 2 and 100 characters.");
  }
  if (!normalizedEmail || password.length < 8) {
    throw new Error("Enter a valid company email and a password of at least 8 characters.");
  }
  if (!normalizedPhone) {
    throw new Error("Enter a company phone number for the administrator request.");
  }

  // The backend has no self-service admin creation: create the account, then
  // submit an admin-access request that an existing administrator must approve.
  const auth = await registerAccount({
    name: normalizedCompanyName,
    email: normalizedEmail,
    phone: normalizedPhone,
    password,
  });

  try {
    await requestAdminAccess(
      auth.accessToken,
      `Company account request for ${normalizedCompanyName}`,
    );
  } finally {
    clearAuth();
  }

  saveAdminProfile(normalizedEmail, normalizedCompanyName);
}

export async function loginAdmin(
  email: string,
  password: string,
  remember = false,
): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return false;
  }

   const auth = await loginAccount(normalizedEmail, password);

  if (auth.user.role !== "admin") {
    clearAuth();
    throw new Error("This account does not have administrator access.");
  }

  saveAuth(auth, remember);
  if (!readAdminProfiles()[normalizedEmail]) {
    saveAdminProfile(normalizedEmail, auth.user.fullName || demoDisplayName(normalizedEmail));
  }
  startAdminSession(normalizedEmail, remember);
  return true;
}


export type { AdminProfile };

/** Read the signed-in company's stored profile without exposing password data. */
export function readAdminProfile(email: string): AdminProfile | null {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const companyName = readAdminProfiles()[normalizedEmail];
  return {
    companyName: companyName?.trim() || demoDisplayName(normalizedEmail),
    email: normalizedEmail,
  };
}

export function updateAdminCompanyName(
  email: string,
  companyName: string,
): AdminProfile {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCompanyName = companyName.trim();

  if (normalizedCompanyName.length < 2 || normalizedCompanyName.length > 100) {
    throw new Error("Enter a company name between 2 and 100 characters.");
  }
  if (!normalizedEmail) {
    throw new Error("The company account could not be found. Please sign in again.");
  }

  saveAdminProfile(normalizedEmail, normalizedCompanyName);
  return { companyName: normalizedCompanyName, email: normalizedEmail };
}

export async function loginUser(
  email: string,
  password: string,
  remember = false,
): Promise<SessionRole | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return null;
  }

  const account = await loginPassengerWithRole(normalizedEmail, password, remember);
  if (!account) {
    return null;
  }

  const sessionEmail = account.session.email.trim().toLowerCase();
  if (account.role === "admin" && !readAdminProfiles()[sessionEmail]) {
    saveAdminProfile(
      sessionEmail,
      account.session.fullName || demoDisplayName(sessionEmail),
    );
  }

  startSession(sessionEmail, account.role, remember);
  return account.role;
}

export async function loginDriver(email: string, password: string, remember = false): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) return false;
  const auth = await loginAccount(normalizedEmail, password);
  if (auth.user.role !== "driver") {
    clearAuth();
    throw new Error("This account does not have the driver role. Ask an administrator to approve your driver request.");
  }
  saveAuth(auth, remember);
  startSession(normalizedEmail, "driver", remember);
  return true;
}

export function logout() {
  void authApi.logout().catch(() => undefined);
  sessionStorage.removeItem(KEYS.session);
  try {
    localStorage.removeItem(REMEMBERED_SESSION_KEY);
  } catch {
    // Ignore blocked storage.
  }
  clearAuth();
  listeners.forEach((fn) => fn());
}

export function useSession(): Session {
  const raw = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => readRaw() ?? "",
    () => "",
  );
  return useMemo(() => {
    try {
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  }, [raw]);
}
