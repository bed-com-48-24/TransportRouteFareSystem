import { KEYS } from "./seed";
import { loadList, newId, saveList } from "./storage";
import type { NotificationItem } from "./types";

export function addMockNotification(
  notification: Omit<NotificationItem, "id" | "createdAt" | "readAt">,
) {
  const items = loadList<NotificationItem>(KEYS.notifications, []);
  saveList(KEYS.notifications, [
    { ...notification, id: newId("notification"), createdAt: new Date().toISOString(), readAt: null },
    ...items,
  ]);
}
