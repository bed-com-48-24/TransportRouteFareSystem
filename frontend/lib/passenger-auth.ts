import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase-client";

export type PassengerSession = {
  fullName: string;
  email: string;
};

export type PassengerRegistration = {
  session: PassengerSession | null;
  confirmationRequired: boolean;
};

function toPassengerSession(user: User): PassengerSession {
  return {
    fullName: typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : user.email ?? "",
    email: user.email ?? "",
  };
}

export async function registerPassenger(
  fullName: string,
  email: string,
  password: string,
): Promise<PassengerRegistration> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { session: null, confirmationRequired: false };
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { full_name: fullName.trim() },
      emailRedirectTo: `${window.location.origin}/accounts-reports?mode=confirmed`,
    },
  });

  if (error) throw error;

  return {
    session: data.session && data.user ? toPassengerSession(data.user) : null,
    confirmationRequired: !data.session,
  };
}

export async function loginPassenger(
  email: string,
  password: string,
): Promise<PassengerSession | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    if (error.code === "invalid_credentials") return null;
    throw error;
  }

  return data.user ? toPassengerSession(data.user) : null;
}

export async function readPassengerSession(): Promise<PassengerSession | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user ? toPassengerSession(data.user) : null;
}

export async function requestPassengerPasswordReset(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: `${window.location.origin}/accounts-reports?mode=reset` },
  );
  if (error) throw error;
}

export async function updatePassengerPassword(password: string): Promise<PassengerSession> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Passenger accounts are not configured.");
  }

  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  if (!data.user) throw new Error("Your password could not be updated. Request a new reset link.");
  return toPassengerSession(data.user);
}

export async function logoutPassenger(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;
}

export async function updatePassengerName(
  email: string,
  fullName: string,
): Promise<PassengerSession> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Passenger accounts are not configured.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = fullName.trim();
  const { data, error } = await supabase.auth.updateUser({
    data: { full_name: normalizedName },
  });
  if (error) throw error;
  if (!data.user) throw new Error("The passenger account could not be found. Please sign in again.");
  return { ...toPassengerSession(data.user), email: data.user.email ?? normalizedEmail };
}
