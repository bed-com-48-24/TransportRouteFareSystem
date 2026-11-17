import { getAccessToken } from "./auth-storage";
import type { Paginated } from "./types";

/**
 * The backend mounts most controllers under /api/v1 but a few (payments,
 * notifications) sit at the server root. "v1" and "root" pick the right base.
 */
export type ApiScope = "v1" | "root";

export type QueryValue = string | number | boolean | null | undefined;

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryValue>;
  scope?: ApiScope;
  /** Attach the stored bearer token (default true). */
  auth?: boolean;
  /** Explicit token, overriding the stored one. */
  token?: string;
  /** Sent as Idempotency-Key, for endpoints that must not double-submit. */
  idempotencyKey?: string;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

const BACKEND_ORIGIN = (process.env.BACKEND_API_URL ?? "http://localhost:3001").replace(/\/+$/, "");
const API_PREFIX = (process.env.BACKEND_API_PREFIX ?? "/api/v1").replace(/\/+$/, "");

// The backend sends no CORS headers, so the browser talks to these same-origin
// paths, which next.config.ts rewrites to BACKEND_API_URL.
const V1_PROXY_PATH = process.env.NEXT_PUBLIC_API_PROXY_PATH ?? "/backend-api";
const ROOT_PROXY_PATH = process.env.NEXT_PUBLIC_API_ROOT_PROXY_PATH ?? "/backend-root";

/** Direct backend API base (http://localhost:3001/api/v1). */
export const backendApiUrl =
  process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:3001/api/v1";

/** Swagger UI for the backend (http://localhost:3001/docs). */
export const apiDocsUrl = process.env.NEXT_PUBLIC_SWAGGER_URL ?? "http://localhost:3001/docs";

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;

  constructor(
    message: string,
    status: number,
    details: { code?: string; requestId?: string } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = details.code;
    this.requestId = details.requestId;
  }
}

type ErrorBody = {
  message?: string | string[];
  error?:
    | string
    | {
        code?: string;
        message?: string;
        requestId?: string;
        details?: Record<string, string[]>;
      };
  requestId?: string;
};

function detailMessage(details: Record<string, string[]> | undefined): string {
  if (!details) return "";
  return Object.entries(details)
    .flatMap(([field, messages]) =>
      Array.isArray(messages)
        ? messages
            .filter((item): item is string => typeof item === "string")
            .map((item) => `${field}: ${item}`)
        : [],
    )
    .join("; ");
}

function errorFromBody(body: unknown, status: number): ApiError {
  const fallback = `The server rejected the request (${status}).`;
  if (typeof body !== "object" || body === null) {
    return new ApiError(fallback, status);
  }

  const record = body as ErrorBody;
  const nested =
    typeof record.error === "object" && record.error !== null ? record.error : undefined;

  // Nest's default filter sends `message`, this backend's filter sends
  // `error.message` plus per-field `error.details`; support all of them so
  // users see the real reason instead of "Validation failed".
  const message = Array.isArray(record.message)
    ? record.message.filter((item): item is string => typeof item === "string").join(" ")
    : typeof record.message === "string" && record.message.trim()
      ? record.message
      : typeof nested?.message === "string" && nested.message.trim()
        ? nested.message
        : typeof record.error === "string" && record.error.trim()
          ? record.error
          : fallback;

  const details = detailMessage(nested?.details);

  return new ApiError(details ? `${message} (${details})` : message, status, {
    code: nested?.code,
    requestId: nested?.requestId ?? record.requestId,
  });
}

function baseUrl(scope: ApiScope): string {
  if (typeof window !== "undefined") {
    return scope === "root" ? ROOT_PROXY_PATH : V1_PROXY_PATH;
  }
  return scope === "root" ? BACKEND_ORIGIN : `${BACKEND_ORIGIN}${API_PREFIX}`;
}

function queryString(query?: Record<string, QueryValue>): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function buildUrl(path: string, scope: ApiScope, query?: Record<string, QueryValue>): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl(scope)}${normalized}${queryString(query)}`;
}

/** Core request helper. Every service module goes through this. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    query,
    scope = "v1",
    auth = true,
    token,
    idempotencyKey,
    signal,
    headers = {},
  } = options;

  const bearer = token ?? (auth ? getAccessToken() : null);
  const requestHeaders: Record<string, string> = { Accept: "application/json", ...headers };
  if (body !== undefined) requestHeaders["Content-Type"] = "application/json";
  if (bearer) requestHeaders.Authorization = `Bearer ${bearer}`;
  if (idempotencyKey) requestHeaders["Idempotency-Key"] = idempotencyKey;

  const response = await fetch(buildUrl(path, scope, query), {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
    cache: "no-store",
  });

  const raw = await response.text();
  let payload: unknown = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = raw;
    }
  }

  if (!response.ok) throw errorFromBody(payload, response.status);
  if (method !== "GET" && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("backend-data-changed"));
  }
  return payload as T;
}

/** For endpoints that return either a bare array or a { data | items, total } envelope. */
export async function apiRequestList<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T[]> {
  const payload = await apiRequest<T[] | { data?: T[]; items?: T[] }>(path, options);
  return Array.isArray(payload) ? payload : payload.data ?? payload.items ?? [];
}

/** Same, but keeps the pagination metadata (both backend envelope styles). */
export async function apiRequestPage<T>(
  path: string,
  options: RequestOptions = {},
): Promise<Paginated<T>> {
  type Envelope = {
    data?: T[];
    items?: T[];
    total?: number;
    page?: number;
    limit?: number;
    pageSize?: number;
    pagination?: {
      page?: number;
      pageSize?: number;
      total?: number;
      totalPages?: number;
    };
  };

  const payload = await apiRequest<T[] | Envelope>(path, options);
  if (Array.isArray(payload)) {
    return { data: payload, total: payload.length, page: 1, limit: payload.length };
  }

  // /stops returns { data, total, page, limit }; /admin/bookings returns
  // { items, page, pageSize, total }; /schedules adds a nested pagination.
  // Normalise all three.
  const nested = payload.pagination;
  const data = payload.data ?? payload.items ?? [];
  return {
    data,
    total: payload.total ?? nested?.total ?? data.length,
    page: payload.page ?? nested?.page ?? 1,
    limit: payload.limit ?? payload.pageSize ?? nested?.pageSize ?? 0,
  };
}
