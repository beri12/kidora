// Error normalisation shared by the payment flow.
//
// This module used to also export its own axios instance, pointed at a second
// env var (NEXT_PUBLIC_API_BASE_URL) and reading a bearer token from a
// localStorage key ("accessToken") that this app never writes — the session
// lives under "cl.auth". Nothing sent requests through it, and anything that
// started to would have been silently unauthenticated. The client to use is
// lib/api/client.ts (typed fetch, LMS endpoints) or lib/axios.ts (auth
// endpoints, owns the refresh interceptor).
import axios, { AxiosError } from "axios";

export interface ApiErrorShape {
  message: string;
  code?: string;
  statusCode?: number;
}

// Normalizes whatever NestJS's exception filter returns into one shape,
// so every UI component can handle errors the same way.
export function normalizeApiError(error: unknown): ApiErrorShape {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<{ message?: string | string[]; error?: string }>;
    const data = err.response?.data;
    const rawMessage = Array.isArray(data?.message) ? data?.message.join(", ") : data?.message;
    return {
      message: rawMessage || err.message || "Something went wrong. Please try again.",
      code: data?.error,
      statusCode: err.response?.status,
    };
  }
  return { message: "Unexpected error. Please try again." };
}
