"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

export type NotificationPreferences = {
  inApp: boolean;
  email: boolean;
};

const DEFAULT_PREFERENCES: NotificationPreferences = { inApp: true, email: false };
const PREFERENCES_KEY = "sbus-notification-preferences-v1";
const PREFERENCES_CHANGED_EVENT = "sbus-notification-preferences-change";
const DEFAULT_PREFERENCES_RAW = JSON.stringify(DEFAULT_PREFERENCES);
const STORAGE_UNAVAILABLE = "__notification_preferences_unavailable__";

function isNotificationPreferences(value: unknown): value is NotificationPreferences {
  return (
    typeof value === "object" &&
    value !== null &&
    "inApp" in value &&
    typeof value.inApp === "boolean" &&
    "email" in value &&
    typeof value.email === "boolean"
  );
}

function preferenceStorageKey(email: string) {
  return `${PREFERENCES_KEY}:${email.toLowerCase()}`;
}

function subscribeToPreferences(email: string, callback: () => void) {
  const key = preferenceStorageKey(email);
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(PREFERENCES_CHANGED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PREFERENCES_CHANGED_EVENT, callback);
  };
}

function readPreferencesSnapshot(email: string) {
  try {
    return localStorage.getItem(preferenceStorageKey(email)) ?? DEFAULT_PREFERENCES_RAW;
  } catch {
    return STORAGE_UNAVAILABLE;
  }
}

export function usePassengerNotificationPreferences(email: string) {
  const subscribe = useCallback(
    (callback: () => void) => subscribeToPreferences(email, callback),
    [email],
  );
  const getSnapshot = useCallback(() => readPreferencesSnapshot(email), [email]);
  const rawPreferences = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_PREFERENCES_RAW);
  const parsedPreferences = useMemo(() => {
    if (rawPreferences === STORAGE_UNAVAILABLE) {
      return { preferences: DEFAULT_PREFERENCES, error: "Notification preferences could not be loaded from this browser." };
    }

    try {
      const parsed: unknown = JSON.parse(rawPreferences);
      if (!isNotificationPreferences(parsed)) throw new Error("Saved notification preferences are invalid.");
      return { preferences: parsed, error: "" };
    } catch (reason) {
      return {
        preferences: DEFAULT_PREFERENCES,
        error: reason instanceof Error ? reason.message : "Notification preferences could not be loaded.",
      };
    }
  }, [rawPreferences]);
  const [saveError, setSaveError] = useState("");

  const updatePreference = useCallback((name: keyof NotificationPreferences, checked: boolean) => {
    const preferences = { ...parsedPreferences.preferences, [name]: checked };
    try {
      localStorage.setItem(preferenceStorageKey(email), JSON.stringify(preferences));
      window.dispatchEvent(new Event(PREFERENCES_CHANGED_EVENT));
      setSaveError("");
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : "Notification preferences could not be saved.");
    }
  }, [email, parsedPreferences.preferences]);

  return {
    preferences: parsedPreferences.preferences,
    error: parsedPreferences.error,
    saveError,
    updatePreference,
  };
}
