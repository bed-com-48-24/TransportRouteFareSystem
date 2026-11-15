import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase-client";

export type PassengerSession = {
  fullName: string;
  email: string;
  phoneNumber?: string;
};

export type PassengerRegistration = {
  session: PassengerSession | null;
  confirmationRequired: boolean;
};

type MockPassengerAccount = {
  fullName: string;
  email: string;
  phoneNumber?: string;
  salt: string;
  passwordHash: string;
};

const MOCK_PASSENGER_ACCOUNTS_KEY = "sbus_passenger_accounts_v1";
const MOCK_PASSENGER_SESSION_KEY = "sbus_passenger_session_v1";
const PASSENGER_SESSION_EVENT = "sbus-passenger-session-change";
const PASSWORD_ITERATIONS = 150_000;

export type PassengerAuthKitCredentials = {
  token: string;
  type: string;
};

function toPassengerSession(user: User): PassengerSession {
  return {
    fullName: typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : user.email ?? "",
    email: user.email ?? "",
    phoneNumber: typeof user.user_metadata.phone_number === "string"
      ? user.user_metadata.phone_number
      : "",
  };
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations: PASSWORD_ITERATIONS,
      hash: "SHA-256",
    },
    key,
    256,
  );

  return toHex(new Uint8Array(bits));
}

function readMockPassengerAccounts(): MockPassengerAccount[] {
  const raw = localStorage.getItem(MOCK_PASSENGER_ACCOUNTS_KEY);
  if (!raw) return [];

  const accounts: unknown = JSON.parse(raw);
  if (
    !Array.isArray(accounts) ||
    !accounts.every(
      (account): account is MockPassengerAccount =>
        typeof account === "object" &&
        account !== null &&
        "fullName" in account &&
        typeof account.fullName === "string" &&
        "email" in account &&
        typeof account.email === "string" &&
        (!("phoneNumber" in account) || typeof account.phoneNumber === "string") &&
        "salt" in account &&
        typeof account.salt === "string" &&
        "passwordHash" in account &&
        typeof account.passwordHash === "string",
    )
  ) {
    throw new Error("Saved passenger accounts are invalid. Clear them and try again.");
  }

  return accounts;
}

function notifyPassengerSessionChanged() {
  window.dispatchEvent(new Event(PASSENGER_SESSION_EVENT));
}

export function subscribePassengerSession(callback: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === MOCK_PASSENGER_SESSION_KEY || event.key?.startsWith("sb-")) {
      callback();
    }
  };
  const supabase = getSupabaseClient();
  const authSubscription = supabase?.auth.onAuthStateChange(() => {
    window.setTimeout(notifyPassengerSessionChanged, 0);
  }).data.subscription;

  window.addEventListener(PASSENGER_SESSION_EVENT, callback);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(PASSENGER_SESSION_EVENT, callback);
    window.removeEventListener("storage", handleStorage);
    authSubscription?.unsubscribe();
  };
}

export async function getPassengerAuthKitCredentials(): Promise<PassengerAuthKitCredentials> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) throw new Error("Your passenger session has expired. Please sign in again.");
    return { token: data.session.access_token, type: "Bearer" };
  }

  // Mock accounts have no backend token; this JWT-shaped value is only a local Auth Kit session marker.
  const encode = (value: object) => btoa(JSON.stringify(value));
  const header = encode({ alg: "none", typ: "JWT" });
  const payload = encode({
    sub: "mock-passenger-session",
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
  });
  return { token: `${header}.${payload}.`, type: "Passenger" };
}

export async function registerPassenger(
  fullName: string,
  phoneNumber: string,
  email: string,
  password: string,
): Promise<PassengerRegistration> {
  const supabase = getSupabaseClient();
  const normalizedName = fullName.trim();
  const normalizedPhoneNumber = phoneNumber.trim();
  const normalizedEmail = email.trim().toLowerCase();
  if (
    normalizedName.length < 2 ||
    !normalizedPhoneNumber ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    throw new Error("Enter a valid name, phone number, and email address.");
  }
  if (password.length < 8) throw new Error("Use a password with at least 8 characters.");

  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { full_name: normalizedName, phone_number: normalizedPhoneNumber },
        emailRedirectTo: `${window.location.origin}/login?mode=confirmed`,
      },
    });

    if (error) throw error;
    const session = data.session && data.user ? toPassengerSession(data.user) : null;
    if (session) notifyPassengerSessionChanged();
    return { session, confirmationRequired: !data.session };
  }

  const accounts = readMockPassengerAccounts();
  if (accounts.some((account) => account.email === normalizedEmail)) {
    throw new Error("An account already exists for this email. Please sign in instead.");
  }

  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const passwordHash = await hashPassword(password, salt);
  const session = {
    fullName: normalizedName,
    email: normalizedEmail,
    phoneNumber: normalizedPhoneNumber,
  };
  localStorage.setItem(
    MOCK_PASSENGER_ACCOUNTS_KEY,
    JSON.stringify([...accounts, { ...session, salt, passwordHash }]),
  );
  localStorage.setItem(MOCK_PASSENGER_SESSION_KEY, JSON.stringify(session));
  notifyPassengerSessionChanged();
  return { session, confirmationRequired: false };
}

export async function loginPassenger(
  email: string,
  password: string,
): Promise<PassengerSession | null> {
  const supabase = getSupabaseClient();
  const normalizedEmail = email.trim().toLowerCase();
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      if (error.code === "invalid_credentials") return null;
      throw error;
    }

    const session = data.user ? toPassengerSession(data.user) : null;
    if (session) notifyPassengerSessionChanged();
    return session;
  }

  if (!normalizedEmail || !password) return null;
  const account = readMockPassengerAccounts().find((item) => item.email === normalizedEmail);
  if (!account || (await hashPassword(password, account.salt)) !== account.passwordHash) return null;

  const session = {
    fullName: account.fullName,
    email: account.email,
    phoneNumber: account.phoneNumber ?? "",
  };
  localStorage.setItem(MOCK_PASSENGER_SESSION_KEY, JSON.stringify(session));
  notifyPassengerSessionChanged();
  return session;
}

export async function readPassengerSession(): Promise<PassengerSession | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    const raw = localStorage.getItem(MOCK_PASSENGER_SESSION_KEY);
    if (!raw) return null;
    const session: unknown = JSON.parse(raw);
    if (
      typeof session !== "object" ||
      session === null ||
      !("fullName" in session) ||
      typeof session.fullName !== "string" ||
      !("email" in session) ||
      typeof session.email !== "string"
    ) {
      throw new Error("Saved passenger sign-in is invalid. Please sign in again.");
    }
    return {
      fullName: session.fullName,
      email: session.email,
      phoneNumber: "phoneNumber" in session && typeof session.phoneNumber === "string"
        ? session.phoneNumber
        : "",
    };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user ? toPassengerSession(data.user) : null;
}

export async function requestPassengerPasswordReset(email: string): Promise<"email" | "mock"> {
  const supabase = getSupabaseClient();
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }
  if (!supabase) return "mock";

  const { error } = await supabase.auth.resetPasswordForEmail(
    normalizedEmail,
    { redirectTo: `${window.location.origin}/login?mode=reset` },
  );
  if (error) throw error;
  return "email";
}

export async function updatePassengerPassword(
  password: string,
  email?: string,
): Promise<PassengerSession | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail) throw new Error("Enter the email address for your passenger account.");
    const accounts = readMockPassengerAccounts();
    const accountIndex = accounts.findIndex((account) => account.email === normalizedEmail);
    if (accountIndex < 0) {
      throw new Error("No passenger account was found for this email on this device.");
    }

    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
    const passwordHash = await hashPassword(password, salt);
    const account = accounts[accountIndex];
    accounts[accountIndex] = { ...account, salt, passwordHash };
    localStorage.setItem(MOCK_PASSENGER_ACCOUNTS_KEY, JSON.stringify(accounts));
    return null;
  }

  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  if (!data.user) throw new Error("Your password could not be updated. Request a new reset link.");
  return toPassengerSession(data.user);
}

export async function logoutPassenger(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    localStorage.removeItem(MOCK_PASSENGER_SESSION_KEY);
    notifyPassengerSessionChanged();
    return;
  }

  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;
  notifyPassengerSessionChanged();
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
