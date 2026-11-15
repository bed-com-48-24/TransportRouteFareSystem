import { KEYS } from "./seed";
import { loadList, saveList } from "./storage";

export type SavedRoute = {
  id: string;
  route: string;
  fare: number;
  savedAt: string;
};

export function savedRouteId(route: string): string {
  return route
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function readSavedRoutes(): SavedRoute[] {
  return loadList<SavedRoute>(KEYS.savedRoutes, []);
}

/** Save a route, or remove it if it is already saved. Returns the new list. */
export function toggleSavedRoute(route: string, fare: number): SavedRoute[] {
  const saved = readSavedRoutes();
  const id = savedRouteId(route);
  const next = saved.some((item) => item.id === id)
    ? saved.filter((item) => item.id !== id)
    : [
        {
          id,
          route,
          fare,
          savedAt: new Date().toISOString(),
        },
        ...saved,
      ];

  saveList(KEYS.savedRoutes, next);
  return next;
}

export function removeSavedRoute(id: string): SavedRoute[] {
  const next = readSavedRoutes().filter((item) => item.id !== id);
  saveList(KEYS.savedRoutes, next);
  return next;
}
