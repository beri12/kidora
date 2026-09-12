// Thin typed fetch wrapper and the single source of the API base URL.
//
// Every client in the app resolves its base URL from API_BASE_URL here, so
// there is one env var to set and no module can drift onto a different host.

function resolveBaseUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
  if (configured) return configured;

  // A localhost fallback in production is worse than a loud failure: the app
  // looks fine and every request quietly fails against a host that is not
  // there. Only development gets the convenience default.
  if (process.env.NODE_ENV === "production") {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.error("NEXT_PUBLIC_API_URL is not set; API calls will fail.");
    }
    return "";
  }
  return "http://localhost:4000/api";
}

/** e.g. https://api.justkidora.com/api */
export const API_BASE_URL = resolveBaseUrl();

/** Origin without the /api suffix, for static files such as /uploads/*. */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

const BASE = API_BASE_URL;

export class ApiError extends Error {
  constructor(public status: number, message: string, public payload?: unknown) {
    super(message);
    this.name = "ApiError";
  }
  get isUnauthorized() { return this.status === 401; }
  get isForbidden() { return this.status === 403; }
  get isNotFound() { return this.status === 404; }
  get isValidation() { return this.status === 400 || this.status === 422; }
  get isRateLimited() { return this.status === 429; }
  /** No HTTP response at all — DNS, offline, CORS preflight failure. */
  get isNetwork() { return this.status === 0; }
}

/**
 * Auth wiring.
 *
 * These are installed once at startup by src/providers/index.tsx from the auth
 * store. Until that call happens every request goes out unauthenticated, which
 * is what used to make each dashboard 401 despite a valid session.
 */
let tokenGetter: () => string | null = () => null;
export function setAuthTokenGetter(fn: () => string | null) { tokenGetter = fn; }

/**
 * The current access token, for requests that cannot go through `api` —
 * uploads use XMLHttpRequest so they can report progress, and still need to be
 * authenticated the same way.
 */
export function getAuthToken(): string | null { return tokenGetter(); }

/** Exchanges the refresh token for a new access token, or null if it failed. */
let tokenRefresher: (() => Promise<string | null>) | null = null;
export function setAuthTokenRefresher(fn: () => Promise<string | null>) { tokenRefresher = fn; }

/** Called when the session is unrecoverable, so the app can clear and redirect. */
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(fn: () => void) { onSessionExpired = fn; }

// One shared refresh across concurrent 401s: a dashboard fires several queries
// at once, and without this each would start its own refresh and all but one
// would be rejected as a reused token.
let refreshing: Promise<string | null> | null = null;
function refreshOnce(): Promise<string | null> {
  if (!tokenRefresher) return Promise.resolve(null);
  if (!refreshing) {
    refreshing = tokenRefresher().finally(() => { refreshing = null; });
  }
  return refreshing;
}

type Query = object;

function qs(query?: Query) {
  if (!query) return "";
  const p = new URLSearchParams();
  Object.entries(query as Record<string, unknown>).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") p.set(k, String(v)); });
  const s = p.toString();
  return s ? `?${s}` : "";
}

async function send(method: string, path: string, body: unknown, query: Query | undefined, token: string | null) {
  const headers: Record<string, string> = { Accept: "application/json" };
  // FormData must set its own Content-Type so the browser can add the
  // multipart boundary.
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body && !isForm) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetch(`${BASE}${path}${qs(query)}`, {
    method,
    headers,
    credentials: "include",
    body: body ? (isForm ? (body as FormData) : JSON.stringify(body)) : undefined,
  });
}

async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  let res: Response;
  try {
    res = await send(method, path, body, query, tokenGetter());
  } catch {
    throw new ApiError(0, "Can't reach Kidora right now. Check your connection and try again.");
  }

  // An expired access token is recoverable: refresh once and replay. A body
  // that is a FormData stream cannot be replayed, so those are not retried.
  const replayable = !(typeof FormData !== "undefined" && body instanceof FormData);
  if (res.status === 401 && replayable && tokenRefresher) {
    const fresh = await refreshOnce();
    if (fresh) {
      try {
        res = await send(method, path, body, query, fresh);
      } catch {
        throw new ApiError(0, "Can't reach Kidora right now. Check your connection and try again.");
      }
    } else {
      onSessionExpired?.();
    }
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = undefined;
  try { data = text ? JSON.parse(text) : undefined; } catch { data = text; }

  if (!res.ok) {
    const msg = (data as { message?: string | string[] })?.message;
    // Never surface a raw backend message for 5xx — those can carry stack
    // detail. Validation messages (400/422) are written for users, so they pass
    // through.
    const friendly =
      res.status === 401 ? "Your session has expired. Please sign in again." :
      res.status === 403 ? "You don't have access to this." :
      res.status === 404 ? "We couldn't find that." :
      res.status === 429 ? "Too many attempts. Please wait a moment and try again." :
      res.status >= 500 ? "Something went wrong on our side. Try again in a moment." :
      Array.isArray(msg) ? msg.join(", ") : msg || "Request failed.";
    if (res.status === 401) onSessionExpired?.();
    throw new ApiError(res.status, friendly, data);
  }
  // Support both {data: ...} envelopes and bare payloads.
  const env = data as { data?: unknown };
  return (env && typeof env === "object" && "data" in env ? env.data : data) as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, undefined, query),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
