"use client";

import { useMemo, useState } from "react";
import { fmtDate } from "@/lib/booking-data";
import { KEYS } from "@/lib/seed";
import { useStoredList } from "@/lib/storage";
import type { Booking } from "@/lib/types";
import type { PassengerSession } from "@/lib/passenger-auth";
import { usePassengerNotificationPreferences } from "@/components/usePassengerNotificationPreferences";
import usePassengerNotificationState from "@/components/usePassengerNotificationState";

function notificationDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString("en-MW", { dateStyle: "medium", timeStyle: "short" });
}

export default function PassengerNotifications({ passenger }: { passenger: PassengerSession }) {
  const { preferences, error } = usePassengerNotificationPreferences(passenger.email);
  const bookings = useStoredList<Booking>(KEYS.bookings, []);
  const {
    readReferences,
    dismissedReferences,
    error: stateError,
    markRead,
    markAllRead,
    dismiss,
  } = usePassengerNotificationState(passenger.email);
  const [actionError, setActionError] = useState("");
  const notifications = useMemo(() => bookings
    .filter((booking) => booking.email.trim().toLowerCase() === passenger.email.toLowerCase())
    .filter((booking) => !dismissedReferences.has(booking.reference))
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt)),
  [bookings, dismissedReferences, passenger.email]);
  const unreadReferences = notifications
    .filter((booking) => !readReferences.has(booking.reference))
    .map((booking) => booking.reference);

  function runNotificationAction(action: () => void) {
    setActionError("");
    try {
      action();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "The notification could not be updated.");
    }
  }

  return (
    <section className="module-section account-panel account-auth-card" aria-labelledby="notifications-heading">
      <div className="module-section-heading">
        <div>
          <p className="module-eyebrow">ACCOUNT UPDATES</p>
          <h2 id="notifications-heading">Notifications</h2>
          <p className="module-copy mt-1">
            {unreadReferences.length === 0
              ? "You’re all caught up."
              : `${unreadReferences.length} unread notification${unreadReferences.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {unreadReferences.length > 0 && (
          <button
            className="secondary-button"
            type="button"
            onClick={() => runNotificationAction(() => markAllRead(unreadReferences))}
          >
            Mark all as read
          </button>
        )}
      </div>
      {(error || stateError || actionError) ? (
        <p className="module-error" role="alert">{error || stateError || actionError}</p>
      ) : !preferences.inApp ? (
        <p className="module-copy">In-account booking notifications are turned off in your account preferences.</p>
      ) : notifications.length === 0 ? (
        <p className="module-copy">You don’t have any notifications.</p>
      ) : (
        <ul className="grid gap-3">
          {notifications.map((booking) => {
            const isRead = readReferences.has(booking.reference);
            return (
              <li
                key={booking.reference}
                className={`rounded-lg border p-3 ${isRead ? "border-slate-200 bg-slate-50" : "border-blue-300 bg-blue-50"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      Booking {booking.status === "confirmed" ? "confirmed" : "cancelled"}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{booking.route}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {fmtDate(booking.travelDate)} · {booking.pickup} → {booking.dropoff}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{notificationDate(booking.createdAt)}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${isRead ? "bg-slate-200 text-slate-700" : "bg-blue-100 text-blue-800"}`}>
                    {isRead ? "Read" : "Unread"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!isRead && (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => runNotificationAction(() => markRead(booking.reference))}
                    >
                      Mark as read
                    </button>
                  )}
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => runNotificationAction(() => dismiss(booking.reference))}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
