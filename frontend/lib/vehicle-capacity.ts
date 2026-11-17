const DEFAULT_CAPACITY: Record<string, number> = {
  minibus: 15,
  bus: 40,
  coach: 50,
  shuttle: 12,
};

/** Suggested passenger seats by vehicle type; admins can adjust for the actual vehicle. */
export function suggestedVehicleCapacity(vehicleType: string): number {
  const normalized = vehicleType.trim().toLowerCase();
  const match = Object.entries(DEFAULT_CAPACITY).find(([type]) => normalized.includes(type));
  return match?.[1] ?? 15;
}
