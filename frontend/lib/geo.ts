export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Mock travel estimate from a straight-line distance: widen it for road bends
 * and assume an average driving speed of about 50 km/h.
 */
export function travelEstimate(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const straightLineKm = distanceKm(fromLat, fromLng, toLat, toLng);
  if (straightLineKm < 0.5) {
    return { label: "You are at the departure town", km: 0, minutes: 0 };
  }
  const km = Math.max(1, Math.round(straightLineKm * 1.3));
  const minutes = Math.max(2, Math.round((km / 50) * 60));
  return { label: `≈ ${km} km · ~${minutes} min drive`, km, minutes };
}

type MaybeLocated = { lat: number | null; lng: number | null };

/** True only when the item has real, in-range coordinates. */
export function hasCoords<T extends MaybeLocated>(s: T): s is T & { lat: number; lng: number } {
  return (
    s.lat !== null && s.lng !== null &&
    Number.isFinite(s.lat) && Number.isFinite(s.lng) &&
    s.lat >= -90 && s.lat <= 90 && s.lng >= -180 && s.lng <= 180
  );
}
