"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth";
import * as apiNotifications from "@/services/notifications.service";
import type { Notification } from "@/services/types";

export default function BookingNotificationCenter() {
  const session = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const unread = notifications.filter((notification) => !notification.read);
  const toggleLabel = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications";

  async function loadNotifications() {
    if (!session) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const [items, count] = await Promise.all([
        apiNotifications.list(),
        apiNotifications.unreadCount(),
      ]);
      setNotifications(items);
      setUnreadCount(count);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Notifications could not be loaded.");
    }
  }

  useEffect(() => {
    void loadNotifications();
    // Session email changes when the user signs in or out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.email]);

  function closePanel(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) toggleRef.current?.focus();
  }

  async function acknowledge(id: string) {
    setError("");
    try {
      await apiNotifications.markAsRead(id);
      await loadNotifications();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This notification could not be marked as read.");
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

          {!session ? (
            <p className="module-empty">Sign in to view your notifications.</p>
          ) : unread.length > 0 ? (
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
                      {new Date(notification.createdAt).toLocaleString()}
                    </small>
                    <span className="booking-notification-item-hint">Open to mark as read</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="module-empty">No unread notifications.</p>}

          {error && <p className="site-nav-error" role="alert">{error}</p>}
        </section>
      )}
    </div>
  );
}
