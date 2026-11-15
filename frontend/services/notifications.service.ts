import { apiRequest, apiRequestList } from "./http";
import type { Notification } from "./types";

/** Notifications are mounted at the server root, so they use scope "root". */

export type NotificationFilters = {
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export function list(filters: NotificationFilters = {}): Promise<Notification[]> {
  return apiRequestList<Notification>("/me/notifications", {
    query: filters,
    scope: "root",
  });
}

export function unreadCount(): Promise<number> {
  return apiRequest<number>("/me/notifications/unread-count", { scope: "root" });
}

export function markAsRead(notificationId: string): Promise<Notification> {
  return apiRequest<Notification>(`/me/notifications/${notificationId}`, {
    method: "PATCH",
    scope: "root",
  });
}
