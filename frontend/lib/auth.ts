"use client";

import { useMemo, useSyncExternalStore } from "react";
import { KEYS } from "./seed";

export type Session = { email: string; role: "admin" | "passenger" } | null;

// DEMO ONLY: there is no backend yet, so this check runs in the browser.
// It hides admin screens from normal users but is NOT real security (see NFR05).
const ADMINS = [{ email: "admin@routewise.mw", password: "Admin@123" }];
const ADMIN_ACCOUNTS_KEY = "sbus_admin_accounts_v1";
const PASSWORD_ITERATIONS = 150_000;

type AdminAccount = {
  email: string;
  salt: string;
  passwordHash: string;
};

const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return sessionStorage.getItem(KEYS.session);
  } catch {
    return null;
  }
}

function readAdminAccounts(): AdminAccount[] {
  const raw = localStorage.getItem(ADMIN_ACCOUNTS_KEY);
  if (!raw) return [];

  const accounts: unknown = JSON.parse(raw);
  if (
    !Array.isArray(accounts) ||
    !accounts.every(
      (account): account is AdminAccount =>
        typeof account === "object" &&
        account !== null &&
        "email" in account &&
        typeof account.email === "string" &&
        "salt" in account &&
        typeof account.salt === "string" &&
        "passwordHash" in account &&
        typeof account.passwordHash === "string",
    )
  ) {
    throw new Error("Saved administrator accounts are invalid. Clear them and try again.");
  }

  return accounts;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: PASSWORD_ITERATIONS,
      hash: "SHA-256",
    },
    key,
    256,
  );

  return toHex(new Uint8Array(bits));
}

function startAdminSession(email: string) {
  sessionStorage.setItem(
    KEYS.session,
    JSON.stringify({ email, role: "admin" }),
  );
  listeners.forEach((fn) => fn());
}

export async function registerAdmin(
  email: string,
  password: string,
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = readAdminAccounts();

  if (
    ADMINS.some((account) => account.email === normalizedEmail) ||
    accounts.some((account) => account.email === normalizedEmail)
  ) {
    throw new Error("An administrator account already exists for this email.");
  }

  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const passwordHash = await hashPassword(password, salt);
  localStorage.setItem(
    ADMIN_ACCOUNTS_KEY,
    JSON.stringify([...accounts, { email: normalizedEmail, salt, passwordHash }]),
  );
  startAdminSession(normalizedEmail);
}

export async function loginAdmin(email: string, password: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const builtInAccount = ADMINS.some(
    (a) => a.email === email.trim().toLowerCase() && a.password === password,
  );

  if (builtInAccount) {
    startAdminSession(normalizedEmail);
    return true;
  }

  const account = readAdminAccounts().find(
    (item) => item.email === normalizedEmail,
  );
  if (!account || (await hashPassword(password, account.salt)) !== account.passwordHash) {
    return false;
  }

  startAdminSession(normalizedEmail);
  return true;
}

export function logout() {
  sessionStorage.removeItem(KEYS.session);
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
