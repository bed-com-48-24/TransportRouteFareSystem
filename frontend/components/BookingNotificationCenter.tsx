"use client";

import { useEffect, useRef, useState } from "react";
import {
  markBookingNotificationRead,
  type BookingNotification,
} from "@/lib/notifications";
import { KEYS } from "@/lib/seed";
import { useStoredList } from "@/lib/storage";

const NO_NOTIFICATIONS: BookingNotification[] = [];

export default function BookingNotificationCenter() {
  const notifications = useStoredList<BookingNotification>(KEYS.notifications, NO_NOTIFICATIONS);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const unread = notifications.filter((notification) => !notification.read);
  const toggleLabel = unread.length > 0 ? `Notifications, ${unread.length} unread` : "Notifications";

  function closePanel(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) toggleRef.current?.focus();
  }

  function acknowledge(id: string) {
    setError("");
    try {
      markBookingNotificationRead(id);
    } catch {
      setError("This notification could not be marked as read.");
    }
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="booking-notification-center" ref={containerRef}>
      <button
        ref={toggleRef}
        type="button"
        className="booking-notification-toggle"
        aria-expanded={open}
        aria-controls="booking-notification-list"
        aria-label={toggleLabel}
        title="Notifications"
        onClick={() => {
          setError("");
          setOpen((current) => !current);
        }}
      >
        <svg
          className="notification-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread.length > 0 && <span className="booking-notification-count">{unread.length}</span>}
      </button>
      {open && (
        <section
          id="booking-notification-list"
          className="booking-notification-panel"
          aria-label="Booking notifications"
        >
          <div className="booking-notification-heading">
            <h2>{unread.length > 0 ? `New updates (${unread.length})` : "Booking updates"}</h2>
            <button
              type="button"
              className="booking-notification-close"
              aria-label="Close notifications"
              title="Close"
              onClick={() => closePanel(true)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {unread.length > 0 && (
            <ul className="booking-notification-list">
              {unread.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    className="booking-notification-item"
                    aria-label={`Mark as read: ${notification.title}`}
                    onClick={() => acknowledge(notification.id)}
                  >
                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>
                    <small>
                      Ref. {notification.reference} ·{" "}
                      {new Date(notification.createdAt).toLocaleString()}
                    </small>
                    <span className="booking-notification-item-hint">Open to mark as read</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="site-nav-error" role="alert">{error}</p>}
        </section>
      )}
    </div>
  );
}
