import { api as http, API_URL } from "@/lib/axios";
import type { AuthResponse, User } from "@/types";

/**
 * Auth endpoints.
 *
 * These go through lib/axios rather than lib/api/client because that instance
 * owns the 401-refresh interceptor and the auth store's token wiring. Keeping
 * them here means the store holds session state only, and every network call in
 * the app lives under lib/api.
 */

/** Everything POST /auth/register accepts beyond name/email/password. */
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: string;
  phone?: string;
  gradeLevel?: string;
  schoolCode?: string;
  subject?: string;
  schoolName?: string;
  country?: string;
  districtName?: string;
  region?: string;
}

export interface OtpRequestResult {
  sent: boolean;
  expiresIn: number;
  /** Present only when Twilio is unconfigured outside production. */
  devCode?: string;
}

export const authApi = {
  login: async (email: string, password: string) =>
    (await http.post<AuthResponse>("/auth/login", { email, password })).data,

  /** Same endpoint; the backend resolves the account by whichever identifier is sent. */
  loginWithPhone: async (phone: string, password: string) =>
    (await http.post<AuthResponse>("/auth/login", { phone, password })).data,

  register: async (payload: RegisterPayload) => {
    // Blank optional fields are dropped rather than sent as "", which the
    // API's string validators would reject.
    const body = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined && String(v).trim() !== ""),
    );
    return (await http.post<AuthResponse>("/auth/register", body)).data;
  },

  requestOtp: async (phone: string) =>
    (await http.post<OtpRequestResult>("/auth/otp/request", { phone })).data,

  verifyOtp: async (phone: string, code: string) =>
    (await http.post<AuthResponse>("/auth/otp/verify", { phone, code })).data,

  me: async () => (await http.get<User>("/auth/me")).data,

  logout: async () => {
    try {
      await http.post("/auth/logout", {});
    } catch {
      // A failed logout must still clear the client session; the refresh token
      // is revoked server-side on its own expiry.
    }
  },

  /**
   * Deliberately raw fetch, not the axios instance.
   *
   * This is what the 401 interceptor calls to recover a session. Routing it
   * through the same instance would let a 401 on the refresh call re-enter the
   * interceptor and recurse.
   */
  refresh: async (refreshToken: string) => {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) throw new Error("refresh failed");
    return (await res.json()) as { accessToken?: string; refreshToken?: string };
  },
};
