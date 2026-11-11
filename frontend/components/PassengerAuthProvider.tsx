"use client";

import AuthProvider from "react-auth-kit/AuthProvider";
import createAuthStore from "react-auth-kit/store/createAuthStore";
import useIsAuthenticated from "react-auth-kit/hooks/useIsAuthenticated";
import useSignIn from "react-auth-kit/hooks/useSignIn";
import useSignOut from "react-auth-kit/hooks/useSignOut";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  getPassengerAuthKitCredentials,
  logoutPassenger,
  readPassengerSession,
  subscribePassengerSession,
  type PassengerSession,
} from "@/lib/passenger-auth";

type PassengerAuthContextValue = {
  passenger: PassengerSession | null;
  ready: boolean;
  error: string;
  signIn: (session: PassengerSession) => Promise<void>;
  signOut: () => Promise<void>;
};

const PassengerAuthContext = createContext<PassengerAuthContextValue | null>(null);
const subscribeToClient = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;
const pendingAuthContext: PassengerAuthContextValue = {
  passenger: null,
  ready: false,
  error: "",
  signIn: async (session) => {
    const storedSession = await readPassengerSession();
    if (!storedSession || storedSession.email.toLowerCase() !== session.email.toLowerCase()) {
      throw new Error("Passenger sign-in is still initializing. Please try again.");
    }
  },
  signOut: logoutPassenger,
};

function PassengerAuthState({ children }: { children: ReactNode }) {
  const authKitSignIn = useSignIn<PassengerSession>();
  const authKitSignOut = useSignOut();
  const isAuthenticated = useIsAuthenticated();
  const [passenger, setPassenger] = useState<PassengerSession | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const signIn = useCallback(async (session: PassengerSession) => {
    const auth = await getPassengerAuthKitCredentials();
    authKitSignIn({ auth, userState: session });
    setPassenger(session);
    setError("");
  }, [authKitSignIn]);

  const signOut = useCallback(async () => {
    await logoutPassenger();
    authKitSignOut();
    setPassenger(null);
    setError("");
  }, [authKitSignOut]);

  useEffect(() => {
    let active = true;
    let requestId = 0;
    const refresh = async () => {
      const currentRequestId = ++requestId;
      try {
        const session = await readPassengerSession();
        if (!active || currentRequestId !== requestId) return;

        if (session) {
          const auth = await getPassengerAuthKitCredentials();
          if (!active || currentRequestId !== requestId) return;
          authKitSignIn({ auth, userState: session });
          setPassenger((current) =>
            current?.email === session.email &&
            current.fullName === session.fullName &&
            current.phoneNumber === session.phoneNumber
              ? current
              : session,
          );
        } else {
          authKitSignOut();
          setPassenger(null);
        }
        setError("");
      } catch (reason) {
        if (!active || currentRequestId !== requestId) return;
        authKitSignOut();
        setPassenger(null);
        setError(reason instanceof Error ? reason.message : "Your passenger sign-in could not be checked.");
      } finally {
        if (active && currentRequestId === requestId) setReady(true);
      }
    };

    void refresh();
    const unsubscribe = subscribePassengerSession(() => void refresh());
    return () => {
      active = false;
      requestId += 1;
      unsubscribe();
    };
  }, [authKitSignIn, authKitSignOut]);

  return (
    <PassengerAuthContext.Provider
      value={{
        passenger: ready && isAuthenticated ? passenger : null,
        ready,
        error,
        signIn,
        signOut,
      }}
    >
      {children}
    </PassengerAuthContext.Provider>
  );
}

export default function PassengerAuthProvider({ children }: { children: ReactNode }) {
  const clientReady = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot,
  );
  const authStore = useMemo(
    () => clientReady ? createAuthStore<PassengerSession>("localstorage", {
      authName: "sbus_passenger_auth",
    }) : null,
    [clientReady],
  );

  if (!authStore) {
    return (
      <PassengerAuthContext.Provider value={pendingAuthContext}>
        {children}
      </PassengerAuthContext.Provider>
    );
  }

  return (
    <AuthProvider store={authStore}>
      <PassengerAuthState>{children}</PassengerAuthState>
    </AuthProvider>
  );
}

export function usePassengerAuth(): PassengerAuthContextValue {
  const context = useContext(PassengerAuthContext);
  if (!context) {
    throw new Error("usePassengerAuth must be used within PassengerAuthProvider.");
  }
  return context;
}
