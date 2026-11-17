"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth";
import * as apiNotifications from "@/services/notifications.service";
import type { Notification } from "@/services/types";
import { markBookingNotificationRead, readBookingNotifications, type DemoNotification } from "@/lib/notifications";

type VisibleNotification = Notification | DemoNotification;

export default function BookingNotificationCenter() {
  const session = useSession();
  const [notifications, setNotifications] = useState<VisibleNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const unread = notifications.filter((notification) => !notification.read);
  // Keep the badge and the panel in sync by counting the same loaded items.
  const unreadCount = unread.length;
  const toggleLabel = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications";

  async function loadNotifications() {
    if (!session) {
      setNotifications([]);
      return;
    }
    const demoItems = readBookingNotifications(session.email);
    try {
      const items = await apiNotifications.list();
      setNotifications([...items, ...demoItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setError("");
    } catch {
      setNotifications(demoItems);
      setError("Account notifications are unavailable. Browser demo updates are still shown.");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadNotifications(); }, 0);
    return () => window.clearTimeout(timer);
    // Session email changes when the user signs in or out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.email]);

  useEffect(() => {
    const refresh = () => { void loadNotifications(); };
    const refreshStoredNotifications = (event: StorageEvent) => {
      if (event.key === "routewise-demo-notifications-v1" || event.key === null) refresh();
    };
    window.addEventListener("backend-notifications-changed", refresh);
    window.addEventListener("storage", refreshStoredNotifications);
    return () => {
      window.removeEventListener("backend-notifications-changed", refresh);
      window.removeEventListener("storage", refreshStoredNotifications);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.email]);

  function closePanel(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) toggleRef.current?.focus();
  }

  async function acknowledge(id: string) {
    setError("");
    if (id.startsWith("demo-")) {
      markBookingNotificationRead(id);
      setNotifications((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
      return;
    }
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
          setOpen((current) => {
            if (!current) void loadNotifications();
            return !current;
          });
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
        {unreadCount > 0 && (
          <span className="booking-notification-count" aria-hidden="true" key={unreadCount}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
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
                    {"source" in notification && notification.source === "demo" && <small className="booking-notification-demo-tag">Demo · this browser only</small>}
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
