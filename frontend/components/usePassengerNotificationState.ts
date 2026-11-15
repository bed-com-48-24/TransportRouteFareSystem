"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

type PassengerNotificationState = {
  read: string[];
  dismissed: string[];
};

const EMPTY_STATE: PassengerNotificationState = { read: [], dismissed: [] };
const EMPTY_STATE_RAW = JSON.stringify(EMPTY_STATE);
const STORAGE_UNAVAILABLE = "__passenger_notification_state_unavailable__";
const STATE_KEY = "sbus-passenger-notification-state-v1";
const STATE_CHANGED_EVENT = "sbus-passenger-notification-state-change";

function isPassengerNotificationState(value: unknown): value is PassengerNotificationState {
  return (
    typeof value === "object" &&
    value !== null &&
    "read" in value &&
    Array.isArray(value.read) &&
    value.read.every((reference) => typeof reference === "string") &&
    "dismissed" in value &&
    Array.isArray(value.dismissed) &&
    value.dismissed.every((reference) => typeof reference === "string")
  );
}

function storageKey(email: string) {
  return `${STATE_KEY}:${email.trim().toLowerCase()}`;
}

function subscribeToState(email: string, callback: () => void) {
  const key = storageKey(email);
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(STATE_CHANGED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(STATE_CHANGED_EVENT, callback);
  };
}

function readStateSnapshot(email: string) {
  try {
    return localStorage.getItem(storageKey(email)) ?? EMPTY_STATE_RAW;
  } catch {
    return STORAGE_UNAVAILABLE;
  }
}

export default function usePassengerNotificationState(email: string) {
  const subscribe = useCallback(
    (callback: () => void) => subscribeToState(email, callback),
    [email],
  );
  const getSnapshot = useCallback(() => readStateSnapshot(email), [email]);
  const rawState = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_STATE_RAW);
  const parsedState = useMemo(() => {
    if (rawState === STORAGE_UNAVAILABLE) {
      return { state: EMPTY_STATE, error: "Notification status could not be loaded from this browser." };
    }

    try {
      const parsed: unknown = JSON.parse(rawState);
      if (!isPassengerNotificationState(parsed)) {
        throw new Error("Saved notification status is invalid.");
      }
      return { state: parsed, error: "" };
    } catch (reason) {
      return {
        state: EMPTY_STATE,
        error: reason instanceof Error ? reason.message : "Notification status could not be loaded.",
      };
    }
  }, [rawState]);

  const updateReferences = useCallback((field: keyof PassengerNotificationState, references: string[]) => {
    const key = storageKey(email);
    const raw = localStorage.getItem(key);
    const saved: unknown = raw ? JSON.parse(raw) : EMPTY_STATE;
    if (!isPassengerNotificationState(saved)) {
      throw new Error("Saved notification status is invalid.");
    }
    const updated = {
      ...saved,
      [field]: Array.from(new Set([...saved[field], ...references])),
    };
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new Event(STATE_CHANGED_EVENT));
  }, [email]);

  const markRead = useCallback((reference: string) => {
    updateReferences("read", [reference]);
  }, [updateReferences]);

  const dismiss = useCallback((reference: string) => {
    updateReferences("dismissed", [reference]);
  }, [updateReferences]);

  const markAllRead = useCallback((references: string[]) => {
    updateReferences("read", references);
  }, [updateReferences]);

  const readReferences = useMemo(() => new Set(parsedState.state.read), [parsedState.state.read]);
  const dismissedReferences = useMemo(
    () => new Set(parsedState.state.dismissed),
    [parsedState.state.dismissed],
  );

  return {
    readReferences,
    dismissedReferences,
    error: parsedState.error,
    markRead,
    markAllRead,
    dismiss,
  };
}
