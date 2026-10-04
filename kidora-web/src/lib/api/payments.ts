import { api } from "./client";
import type { PlanKey } from "./billing";

/** PaymentsController (@Controller('payments')). */

/**
 * How a plan is obtained. Decided by the API from the plan's price, so the
 * pricing page never has to reason about amounts:
 *   free / pilot — $0, activated directly (no PayPal)
 *   paypal       — priced above zero, paid through PayPal
 *   contact      — not self-serve
 *   unavailable  — switched off
 */
export type CheckoutMode = "free" | "pilot" | "paypal" | "contact" | "unavailable";

export interface CatalogPlan {
  id: PlanKey;
  name: string;
  priceCents: number;
  /** Decimal string, e.g. "5.00". Display only — the API decides the charge. */
  price: string;
  currency: string;
  billingInterval: "month" | "year";
  checkout: CheckoutMode;
}

export interface PlanCatalog {
  plans: CatalogPlan[];
  /** The client id is public by design; the secret never leaves the API. */
  paypal: { enabled: boolean; clientId: string | null; environment: "sandbox" | "production" | null };
}

export interface Activation {
  /** PENDING: PayPal is still reviewing the payment, so nothing is unlocked yet. */
  status: "ACTIVE" | "PENDING";
  plan: PlanKey;
  provider: "paypal" | "pilot" | "stripe" | null;
  renewsAt: string | null;
  alreadyActive: boolean;
}

export interface PaypalOrder { orderId: string; plan: PlanKey; amount: string; currency: string }
export interface StripeCheckout { url: string; sessionId?: string }

// Requests carry only the plan id or the PayPal order id: the price, the
// currency and the user are all determined by the API.
export const paymentsApi = {
  plans: () => api.get<PlanCatalog>("/payments/plans"),
  activatePlan: (planId: PlanKey) => api.post<Activation>("/payments/activate-plan", { planId }),
  paypalCreateOrder: (planId: PlanKey) => api.post<PaypalOrder>("/payments/paypal/create-order", { planId }),
  paypalCaptureOrder: (orderId: string) => api.post<Activation>("/payments/paypal/capture-order", { orderId }),
  paypalCancelOrder: (orderId: string) => api.post<{ cancelled: boolean }>("/payments/paypal/cancel-order", { orderId }),
  stripeCheckout: (plan: PlanKey) => api.post<StripeCheckout>("/payments/stripe/checkout", { plan }),
};
