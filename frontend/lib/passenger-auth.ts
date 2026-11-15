import { ApiError, clearAuth, loginAccount, registerAccount, saveAuth } from "./backend-api";

export type PassengerSession = {
  fullName: string;
  email: string;
};

/** Kept for the admin workspace's local passenger list. */
export const PASSENGER_ACCOUNTS_KEY = "routewise-passenger-accounts-v2";
const SESSION_KEY = "routewise-passenger-session-v1";
const REMEMBERED_SESSION_KEY = "routewise-passenger-session-remembered-v1";

function saveSession(session: PassengerSession, remember = false): void {
  const value = JSON.stringify(session);
  sessionStorage.setItem(SESSION_KEY, value);
  try {
    if (remember) {
      localStorage.setItem(REMEMBERED_SESSION_KEY, value);
    } else {
      localStorage.removeItem(REMEMBERED_SESSION_KEY);
    }
  } catch {
    // Remember-me is optional; ignore blocked storage.
  }
}

export async function registerPassenger(
  fullName: string,
  email: string,
  password: string,
  remember = false,
  phone = "",
): Promise<PassengerSession> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone.trim();
  if (!normalizedPhone) {
    throw new Error("Enter a phone number so the transport company can reach you.");
  }

  const auth = await registerAccount({
    name: fullName.trim(),
    email: normalizedEmail,
    phone: normalizedPhone,
    password,
  });

  const session = {
    fullName: auth.user.fullName,
    email: auth.user.email ?? normalizedEmail,
  };
  saveAuth(auth, remember);
  saveSession(session, remember);
  return session;
}

export async function loginPassenger(
  email: string,
  password: string,
  remember = false,
): Promise<PassengerSession | null> {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const auth = await loginAccount(normalizedEmail, password);
    if (auth.user.role === "admin") {
      throw new Error("This is a company admin account. Use the company admin sign-in page.");
    }
    if (auth.user.role !== "passenger") {
      throw new Error("This account cannot sign in as a passenger.");
    }

    const session = {
      fullName: auth.user.fullName,
      email: auth.user.email ?? normalizedEmail,
    };
    saveAuth(auth, remember);
    saveSession(session, remember);
    return session;
  } catch (reason) {
    if (reason instanceof ApiError && (reason.status === 401 || reason.status === 403)) {
      return null;
    }
    throw reason;
  }
}

export function readPassengerSession(): PassengerSession | null {
  const raw =
    sessionStorage.getItem(SESSION_KEY) ??
    localStorage.getItem(REMEMBERED_SESSION_KEY);
  if (!raw) return null;
  const parsed: unknown = JSON.parse(raw);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("fullName" in parsed) ||
    typeof parsed.fullName !== "string" ||
    !("email" in parsed) ||
    typeof parsed.email !== "string"
  ) {
    throw new Error("The saved sign-in session is invalid. Please sign in again.");
  }
  return { fullName: parsed.fullName, email: parsed.email };
}

export function logoutPassenger(): void {
  sessionStorage.removeItem(SESSION_KEY);
  try {
    localStorage.removeItem(REMEMBERED_SESSION_KEY);
  } catch {
    // Ignore blocked storage.
  }
  clearAuth();
}

export function updatePassengerName(
  email: string,
  fullName: string,
): PassengerSession {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = fullName.trim();
  const current = readPassengerSession();

  if (!current || current.email.trim().toLowerCase() !== normalizedEmail) {
    throw new Error("The passenger account could not be found. Please sign in again.");
  }

  const session = { fullName: normalizedName, email: normalizedEmail };
  let remember = false;
  try {
    remember = Boolean(localStorage.getItem(REMEMBERED_SESSION_KEY));
  } catch {
    remember = false;
  }
  saveSession(session, remember);
  return session;
}
