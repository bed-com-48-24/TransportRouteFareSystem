export type PassengerSession = {
  fullName: string;
  email: string;
};

type StoredAccount = PassengerSession & {
  salt: string;
  passwordHash: string;
};

const ACCOUNTS_KEY = "routewise-passenger-accounts-v2";
const SESSION_KEY = "routewise-passenger-session-v1";
const PASSWORD_ITERATIONS = 150_000;

function readAccounts(): StoredAccount[] {
  const raw = localStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];

  const parsed: unknown = JSON.parse(raw);
  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (account): account is StoredAccount =>
        typeof account === "object" &&
        account !== null &&
        "fullName" in account &&
        typeof account.fullName === "string" &&
        "email" in account &&
        typeof account.email === "string" &&
        "salt" in account &&
        typeof account.salt === "string" &&
        "passwordHash" in account &&
        typeof account.passwordHash === "string",
    )
  ) {
    throw new Error("Saved passenger accounts are invalid. Please clear the saved account data and try again.");
  }
  return parsed;
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

function saveSession(session: PassengerSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function registerPassenger(
  fullName: string,
  email: string,
  password: string,
): Promise<PassengerSession> {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = readAccounts();

  if (accounts.some((account) => account.email === normalizedEmail)) {
    throw new Error("An account with this email address already exists.");
  }

  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const passwordHash = await hashPassword(password, salt);
  const session = { fullName: fullName.trim(), email: normalizedEmail };
  localStorage.setItem(
    ACCOUNTS_KEY,
    JSON.stringify([...accounts, { ...session, salt, passwordHash }]),
  );
  saveSession(session);
  return session;
}

export async function loginPassenger(
  email: string,
  password: string,
): Promise<PassengerSession | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const account = readAccounts().find((item) => item.email === normalizedEmail);
  if (!account || (await hashPassword(password, account.salt)) !== account.passwordHash) {
    return null;
  }

  const session = { fullName: account.fullName, email: account.email };
  saveSession(session);
  return session;
}

export function readPassengerSession(): PassengerSession | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
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
}

export function updatePassengerName(
  email: string,
  fullName: string,
): PassengerSession {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = fullName.trim();
  const accounts = readAccounts();
  const accountIndex = accounts.findIndex((account) => account.email === normalizedEmail);

  if (accountIndex < 0) {
    throw new Error("The passenger account could not be found. Please sign in again.");
  }

  const updatedAccounts = accounts.map((account, index) =>
    index === accountIndex ? { ...account, fullName: normalizedName } : account,
  );
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updatedAccounts));

  const session = { fullName: normalizedName, email: normalizedEmail };
  saveSession(session);
  return session;
}
