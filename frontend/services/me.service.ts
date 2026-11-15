import { apiRequest } from "./http";
import type { BackendUser, PassengerProfile } from "./types";

/** Who is logged in. */
export function me(): Promise<BackendUser> {
  return apiRequest<BackendUser>("/me");
}

/** Saved passenger details, reused to prefill the booking form. */
export function getPassengerProfile(): Promise<PassengerProfile | null> {
  return apiRequest<PassengerProfile | null>("/me/passenger-profile");
}

export function savePassengerProfile(input: PassengerProfile): Promise<PassengerProfile> {
  return apiRequest<PassengerProfile>("/me/passenger-profile", {
    method: "PUT",
    body: input,
  });
}
