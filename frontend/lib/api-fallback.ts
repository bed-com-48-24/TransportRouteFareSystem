"use client";

import { useCallback, useEffect, useState } from "react";
/** Where the currently rendered rows came from. */
export type DataSource = "loading" | "api";

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
 * Loads from the backend. Failed calls keep the result empty and expose the error.
 * `key` re-runs the loader when the query (origin, date, …) changes.
 */
export function useApiData<T>(
  load: () => Promise<T>,
  _fallback: () => T,
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
    const refresh = () => setAttempt((value) => value + 1);

    async function run() {
      try {
        const data = await load();
        if (!cancelled) setState({ data, source: "api", error: null });
      } catch (error) {
        if (cancelled) return;
        setState({ data: initial, source: "api", error: describe(error) });
      }
    }

    void run();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 30_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("backend-data-changed", refresh);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("backend-data-changed", refresh);
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

/** List flavour of useApiData: starts empty and never substitutes mock records. */
export function useApiList<T>(load: () => Promise<T[]>, _fallback: () => T[], key = ""): ApiList<T> {
  const state = useApiData<T[]>(load, _fallback, [], key);
  return {
    data: state.data,
    source: state.source,
    usingDemo: false,
    loading: state.source === "loading",
    error: state.error,
    reload: state.reload,
  };
}
