// Thin typed fetch wrapper. Reads NEXT_PUBLIC_API_URL (production:
// https://api.justkidora.com/api). Never falls back to localhost in production.

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

if (!BASE && typeof window !== "undefined" && process.env.NODE_ENV === "production") {
  // eslint-disable-next-line no-console
  console.error("NEXT_PUBLIC_API_URL is not set; API calls will fail.");
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public payload?: unknown) {
    super(message);
    this.name = "ApiError";
  }
  get isUnauthorized() { return this.status === 401; }
  get isForbidden() { return this.status === 403; }
  get isNotFound() { return this.status === 404; }
}

/** Hook into the existing auth: if the app stores an access token, expose it here. */
let tokenGetter: () => string | null = () => null;
export function setAuthTokenGetter(fn: () => string | null) { tokenGetter = fn; }

type Query = object;

function qs(query?: Query) {
  if (!query) return "";
  const p = new URLSearchParams();
  Object.entries(query as Record<string, unknown>).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") p.set(k, String(v)); });
  const s = p.toString();
  return s ? `?${s}` : "";
}

async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body && !isForm) headers["Content-Type"] = "application/json";
  const token = tokenGetter();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}${qs(query)}`, {
      method,
      headers,
      credentials: "include",
      body: body ? (isForm ? (body as FormData) : JSON.stringify(body)) : undefined,
    });
  } catch {
    throw new ApiError(0, "Can't reach Kidora right now. Check your connection and try again.");
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = undefined;
  try { data = text ? JSON.parse(text) : undefined; } catch { data = text; }

  if (!res.ok) {
    const msg = (data as { message?: string | string[] })?.message;
    const friendly =
      res.status === 401 ? "Please sign in again." :
      res.status === 403 ? "You don't have access to this." :
      res.status === 404 ? "We couldn't find that." :
      res.status >= 500 ? "Something went wrong on our side. Try again in a moment." :
      Array.isArray(msg) ? msg.join(", ") : msg || "Request failed.";
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
