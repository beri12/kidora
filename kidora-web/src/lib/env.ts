// lib/env.ts
// Central place to read + validate public env vars used by the payment flow.
// Keep NEXT_PUBLIC_ vars limited to values safe to ship to the browser.
//
// Nothing here throws while the module is being imported. It used to: the
// API base URL was resolved eagerly and `required()` threw in production, so
// `next build` died with "Missing required env var" while prerendering any
// page that transitively imports lib/http — including pages with no payment
// UI at all. Keys that genuinely cannot be defaulted are exposed as getters
// instead, so the error surfaces when a checkout actually needs them.

function optional(value: string | undefined): string | undefined {
  return value && value.trim() ? value : undefined;
}

function requiredAtUse(name: string, value: string | undefined): string {
  const v = optional(value);
  if (v) return v;
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[env] Missing ${name}. Set it in .env.local`);
    return '';
  }
  throw new Error(`Missing required env var: ${name}`);
}

// One source of truth for the API origin. NEXT_PUBLIC_API_BASE_URL is
// accepted for backwards compatibility, but NEXT_PUBLIC_API_URL is the
// variable the rest of the app already uses (see lib/axios.ts), and the
// default matches it so a local checkout works with no configuration.
export const API_BASE_URL =
  optional(process.env.NEXT_PUBLIC_API_BASE_URL) ??
  optional(process.env.NEXT_PUBLIC_API_URL) ??
  'http://localhost:4000/api';

export const APP_URL =
  optional(process.env.NEXT_PUBLIC_APP_URL) ??
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

export const env = {
  apiBaseUrl: API_BASE_URL,
  appUrl: APP_URL,

  // Lazily validated: reading these without configuration is a real error,
  // but merely importing a module that mentions them is not.
  get stripePublishableKey(): string {
    return requiredAtUse(
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    );
  },
  get paypalClientId(): string {
    return requiredAtUse(
      'NEXT_PUBLIC_PAYPAL_CLIENT_ID',
      process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
    );
  },
};
