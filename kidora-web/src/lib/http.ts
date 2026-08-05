// lib/api/http.ts
import axios, { AxiosError } from "axios";
import { env } from "@/lib//env";

export const http = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true, // needed if your NestJS auth uses httpOnly cookies
  timeout: 15000,
});

// Attach JWT if you store it client-side (e.g. in memory / a store).
// If you're using httpOnly cookies for auth instead, you can delete this interceptor.
http.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("accessToken") : null;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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