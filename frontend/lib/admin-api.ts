/**
 * Admin form → backend translation helpers.
 *
 * The admin screens collect plain town names and seat counts, while the
 * backend expects stop and vehicle ids. These helpers look up or create the
 * supporting records so the forms stay simple.
 */
import { DISTRICT_COORDINATES, TRANSPORT_TOWN_COORDINATES } from "./malawi-locations";
import type { Coordinates } from "./malawi-locations";
import type { Stop } from "@/services/types";
import * as apiStops from "@/services/stops.service";
import * as apiVehicles from "@/services/vehicles.service";
import { fromStopItem } from "@/services/adapters";
import type { StopItem } from "./types";

function coordinatesFor(city: string): Coordinates {
  return (
    TRANSPORT_TOWN_COORDINATES[city] ??
    DISTRICT_COORDINATES[city] ?? { lat: 0, lng: 0 }
  );
}

function sameName(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

/**
 * Finds a stop by name, creating it when the admin typed a new town.
 * `existing` avoids an extra request when the caller already has the list.
 */
export async function ensureStop(
  name: string,
  city: string,
  kind: StopItem["kind"],
  existing?: Stop[],
): Promise<Stop> {
  const stops = existing ?? (await apiStops.listAll());
  const found = stops.find((stop) => sameName(stop.name, name));
  if (found) return found;

  const coords = coordinatesFor(city);
  return apiStops.create(
    fromStopItem({
      name: name.trim(),
      city: city.trim(),
      kind,
      lat: coords.lat,
      lng: coords.lng,
    }),
  );
}

/** Stop ids for the two towns of a route. */
export async function ensureRouteStops(
  origin: string,
  destination: string,
  existing?: Stop[],
): Promise<{ originStopId: number; destinationStopId: number }> {
  const stops = existing ?? (await apiStops.listAll());
  const originStop = await ensureStop(origin, origin, "both", stops);
  const destinationStop = await ensureStop(destination, destination, "both", stops);
  return { originStopId: originStop.id, destinationStopId: destinationStop.id };
}

/** A stop id from a stop name, falling back to the route's departure stop. */
export async function resolveStopId(name: string, fallbackId: number): Promise<number> {
  if (!name.trim()) return fallbackId;
  const stops = await apiStops.listAll();
  const found = stops.find((stop) => sameName(stop.name, name));
  return found?.id ?? fallbackId;
}

/** A vehicle with this seat capacity, created on demand. */
export async function ensureVehicle(capacity: number): Promise<number> {
  const vehicles = await apiVehicles.list();
  const match = vehicles.find((vehicle) => vehicle.capacity === capacity);
  if (match) return match.id;

  const plate = `MW-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const created = await apiVehicles.create({
    plateNumber: plate,
    vehicleType: capacity > 20 ? "Bus" : "Minibus",
    capacity,
  });
  return created.id;
}
