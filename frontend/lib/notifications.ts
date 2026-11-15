import { KEYS } from "./seed";
import { loadList, newId, saveList } from "./storage";
import type { Booking } from "./types";

export type BookingNotificationType =
  | "booking-confirmed"
  | "booking-cancelled"
  | "booking-reconfirmed"
  | "payment-complete"
  | "route-update"
  | "report-update"
  | "company-update";

export type BookingNotification = {
  id: string;
  type: BookingNotificationType;
  title: string;
  message: string;
  reference: string;
  createdAt: string;
  read: boolean;
};

const MAX_NOTIFICATIONS = 50;

function notificationTitle(type: BookingNotificationType) {
  switch (type) {
    case "booking-confirmed": return "Booking confirmed";
    case "booking-cancelled": return "Booking cancelled";
    case "booking-reconfirmed": return "Booking confirmed again";
    case "payment-complete": return "Payment complete";
    case "route-update": return "Route update";
    case "report-update": return "Report update";
    case "company-update": return "Message from the transport company";
  }
}

function addNotification(
  type: BookingNotificationType,
  message: string,
  reference: string,
): void {
  const notifications = loadList<BookingNotification>(KEYS.notifications, []);

  saveList(KEYS.notifications, [
    {
      id: newId("notification"),
      type,
      title: notificationTitle(type),
      message,
      reference,
      createdAt: new Date().toISOString(),
      read: false,
    },
    ...notifications,
  ].slice(0, MAX_NOTIFICATIONS));
}

export function notifyBookingStatus(
  booking: Booking,
  type: BookingNotificationType,
  message: string,
): void {
  addNotification(type, message, booking.reference);
}

/** Announce an admin change to routes, fares, or scheduled departures. */
export function notifyRouteUpdate(message: string, reference = "Route schedule"): void {
  addNotification("route-update", message, reference);
}

/** Tell passengers that an administrator reviewed one of their reports. */
export function notifyReportUpdate(message: string, reference: string): void {
  addNotification("report-update", message, reference);
}

/** Announce company news, a profile change, or a general notice to passengers. */
export function notifyCompanyUpdate(message: string, reference = "Company announcement"): void {
  addNotification("company-update", message, reference);
}

export function readBookingNotifications(): BookingNotification[] {
  return loadList<BookingNotification>(KEYS.notifications, []);
}

/** Mark one update as seen so it leaves the "new" list and the unread badge drops. */
export function markBookingNotificationRead(id: string): void {
  const notifications = loadList<BookingNotification>(KEYS.notifications, []);
  if (notifications.every((notification) => notification.id !== id || notification.read)) return;

  saveList(
    KEYS.notifications,
    notifications.map((notification) =>
      notification.id === id ? { ...notification, read: true } : notification,
    ),
  );
}

export function markAllBookingNotificationsRead(): void {
  const notifications = loadList<BookingNotification>(KEYS.notifications, []);
  if (notifications.every((notification) => notification.read)) return;

  saveList(
    KEYS.notifications,
    notifications.map((notification) => ({ ...notification, read: true })),
  );
}
