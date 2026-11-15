"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/services/http";

/** Where the currently rendered rows came from. */
export type DataSource = "loading" | "api" | "demo";

/**
 * The demo fallback is only for an unreachable backend. A 4xx means the backend
 * answered (bad credentials, missing record), which must not be masked by demo data.
 */
export function isBackendUnavailable(error: unknown): boolean {
  if (error instanceof ApiError) return error.status >= 500;
  return true; // fetch TypeError: offline, DNS failure, connection refused
}

function describe(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Could not reach the backend.";
}

type Loaded<T> = {
  data: T;
  source: DataSource;
  error: string | null;
  reload: () => void;
};

/**
 * Loads from the backend, falling back to demo data only when it is unavailable.
 * `key` re-runs the loader when the query (origin, date, …) changes.
 */
export function useApiData<T>(
  load: () => Promise<T>,
  fallback: () => T,
  initial: T,
  key = "",
): Loaded<T> {
  const [state, setState] = useState<{ data: T; source: DataSource; error: string | null }>({
    data: initial,
    source: "loading",
    error: null,
  });
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const data = await load();
        if (!cancelled) setState({ data, source: "api", error: null });
      } catch (error) {
        if (cancelled) return;
        if (isBackendUnavailable(error)) {
          setState({ data: fallback(), source: "demo", error: null });
        } else {
          setState({ data: initial, source: "api", error: describe(error) });
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
    // load/fallback/initial are intentionally excluded: `key` captures the inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  return { ...state, reload };
}

export type ApiList<T> = {
  data: T[];
  source: DataSource;
  usingDemo: boolean;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/** List flavour of useApiData: starts empty instead of showing demo data. */
export function useApiList<T>(load: () => Promise<T[]>, fallback: () => T[], key = ""): ApiList<T> {
  const state = useApiData<T[]>(load, fallback, [], key);
  return {
    data: state.data,
    source: state.source,
    usingDemo: state.source === "demo",
    loading: state.source === "loading",
    error: state.error,
    reload: state.reload,
  };
}
