// lib/env.ts
// Central place to read + validate public env vars used by the payment flow.
// Keep NEXT_PUBLIC_ vars limited to values safe to ship to the browser.

function required(name: string, value: string | undefined): string {
  if (!value) {
    // In dev, warn loudly instead of crashing the whole app on import.
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[env] Missing ${name}. Set it in .env.local`);
      return "";
    }
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  // One API base URL for the whole app. NEXT_PUBLIC_API_URL is the name the
  // rest of the codebase uses; NEXT_PUBLIC_API_BASE_URL is accepted first for
  // deployments that already set it, so the two spellings cannot disagree.
  apiBaseUrl: required(
    "NEXT_PUBLIC_API_URL",
    process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL,
  ),
  stripePublishableKey: required(
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ),
  paypalClientId: required(
    "NEXT_PUBLIC_PAYPAL_CLIENT_ID",
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  ),
  appUrl: required("NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL),
};