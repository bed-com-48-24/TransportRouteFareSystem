"use client";

import { useMemo, useSyncExternalStore } from "react";
import { KEYS } from "./seed";

export type Session = { email: string; role: "admin" | "passenger" } | null;

// DEMO ONLY: there is no backend yet, so this check runs in the browser.
// It hides admin screens from normal users but is NOT real security (see NFR05).
const ADMINS = [{ email: "admin@routewise.mw", password: "Admin@123" }];

const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return sessionStorage.getItem(KEYS.session);
  } catch {
    return null;
  }
}

export function loginAdmin(email: string, password: string): boolean {
  const ok = ADMINS.some(
    (a) => a.email === email.trim().toLowerCase() && a.password === password,
  );
  if (!ok) return false;
  sessionStorage.setItem(KEYS.session, JSON.stringify({ email: email.trim().toLowerCase(), role: "admin" }));
  listeners.forEach((fn) => fn());
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
