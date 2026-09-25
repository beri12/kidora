import { api as http, API_URL } from "@/lib/axios";
import type { AuthResponse, EmailPending, EmailVerifyResponse, User } from "@/types";

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

/** The code itself is only ever delivered by SMS, never in this response. */
export interface OtpRequestResult {
  sent: boolean;
  expiresIn: number;
}

export const authApi = {
  login: async (email: string, password: string) =>
    (await http.post<AuthResponse>("/auth/login", { email, password })).data,

  /** Same endpoint; the backend resolves the account by whichever identifier is sent. */
  loginWithPhone: async (phone: string, password: string) =>
    (await http.post<AuthResponse>("/auth/login", { phone, password })).data,

  /**
   * Creates the account and emails a 6-digit code. No session yet — finish
   * with `verifyEmail`.
   */
  register: async (payload: RegisterPayload) => {
    // Blank optional fields are dropped rather than sent as "", which the
    // API's string validators would reject.
    const body = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined && String(v).trim() !== ""),
    );
    return (await http.post<EmailPending>("/auth/register", body)).data;
  },

  verifyEmail: async (email: string, code: string) =>
    (await http.post<EmailVerifyResponse>("/auth/email/verify", { email, code })).data,

  resendEmail: async (email: string) =>
    (await http.post<EmailPending>("/auth/email/resend", { email })).data,

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
