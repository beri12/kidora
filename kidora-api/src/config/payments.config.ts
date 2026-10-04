import { registerAs } from '@nestjs/config';

export type PaypalEnvironment = 'sandbox' | 'production';

// The REST host is derived from the environment so no PayPal URL is written
// anywhere else in the app.
export const PAYPAL_API_BASE_URLS: Record<PaypalEnvironment, string> = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  production: 'https://api-m.paypal.com',
};

/**
 * PAYPAL_ENVIRONMENT is the documented variable. PAYPAL_MODE (sandbox | live)
 * is what this repo's .env.example used before, so it is still honoured.
 * Anything unrecognised is null, which disables PayPal rather than quietly
 * falling back to sandbox in production.
 */
function paypalEnvironment(): PaypalEnvironment | null {
  const raw = (process.env.PAYPAL_ENVIRONMENT ?? process.env.PAYPAL_MODE ?? 'sandbox').trim().toLowerCase();
  if (raw === 'sandbox') return 'sandbox';
  if (raw === 'production' || raw === 'live') return 'production';
  return null;
}

export interface PaypalConfig {
  clientId: string;
  clientSecret: string;
  environment: PaypalEnvironment | null;
  apiBaseUrl: string | null;
  /** Raw value, for the error message when it is not recognised. */
  environmentRaw: string;
}

export interface PaymentsConfig {
  paypal: PaypalConfig;
  /**
   * The smallest positive price a plan may be sold at, in cents. A plan priced
   * between 0 and this is treated as misconfigured and kept out of checkout.
   * $0 plans are never affected — they are pilot/free activations.
   */
  minPaidAmountCents: number;
}

export default registerAs('payments', (): PaymentsConfig => {
  const environment = paypalEnvironment();
  const min = Number(process.env.PAYMENTS_MIN_PAID_AMOUNT_CENTS ?? 1);
  return {
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID?.trim() ?? '',
      clientSecret: process.env.PAYPAL_CLIENT_SECRET?.trim() ?? '',
      environment,
      apiBaseUrl: environment ? PAYPAL_API_BASE_URLS[environment] : null,
      environmentRaw: process.env.PAYPAL_ENVIRONMENT ?? process.env.PAYPAL_MODE ?? '',
    },
    minPaidAmountCents: Number.isInteger(min) && min > 0 ? min : 1,
  };
});
