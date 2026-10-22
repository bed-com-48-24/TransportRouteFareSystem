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

type MaybeLocated = { lat: number | null; lng: number | null };

/** True only when the item has real, in-range coordinates. */
export function hasCoords<T extends MaybeLocated>(s: T): s is T & { lat: number; lng: number } {
  return (
    s.lat !== null && s.lng !== null &&
    Number.isFinite(s.lat) && Number.isFinite(s.lng) &&
    s.lat >= -90 && s.lat <= 90 && s.lng >= -180 && s.lng <= 180
  );
}
