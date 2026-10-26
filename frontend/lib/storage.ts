"use client";

import { useMemo, useSyncExternalStore } from "react";

const listeners = new Map<string, Set<() => void>>();

function emit(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // private mode / blocked storage
  }
}

function subscribe(key: string, callback: () => void) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === key || e.key === null) callback(); // other tab changed it
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.get(key)?.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

/** Read a list synchronously (use inside event handlers, not render). */
export function loadList<T>(key: string, seed: T[]): T[] {
  const raw = readRaw(key);
  if (!raw) return seed;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : seed;
  } catch {
    return seed;
  }
}

/** Save a list and notify every component that is watching this key. */
export function saveList<T>(key: string, items: T[]) {
  localStorage.setItem(key, JSON.stringify(items));
  emit(key);
}

/** React hook: always re-renders when the list changes (this tab or another). */
export function useStoredList<T>(key: string, seed: T[]): T[] {
  const seedRaw = useMemo(() => JSON.stringify(seed), [seed]);
  const raw = useSyncExternalStore(
    (cb) => subscribe(key, cb),
    () => readRaw(key) ?? seedRaw,
    () => seedRaw, 
  );
  return useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : seed;
    } catch {
      return seed;
    }
  }, [raw, seed]);
}

export function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
