import { api } from "./client";
import type { PlanKey } from "./billing";

/** PaymentsController (@Controller('payments')). */
export interface StripeCheckout { url: string; sessionId?: string }
export interface PaypalOrder { orderId: string }
/** PENDING: PayPal is still reviewing the payment, so nothing is unlocked yet. */
export interface PaypalCapture { status: "COMPLETED" | "PENDING"; granted: boolean; plan: PlanKey }
export interface PilotActivation { status: "ACTIVE"; plan: PlanKey; alreadyActive: boolean }

export interface PaymentProviders {
  chapa: boolean;
  stripe: boolean;
  paypal: boolean;
  /** Public by design; the PayPal secret never leaves the API. */
  paypalClientId: string | null;
  paypalEnvironment: "sandbox" | "production" | null;
}
export interface ChapaCheckout { url: string; txRef: string }
export interface ChapaVerify { status: "paid" | "pending" | "failed"; plan: PlanKey }

// Requests name the plan (or the PayPal order) only: the price, currency and
// payer are decided by the API.
export const paymentsApi = {
  providers: () => api.get<PaymentProviders>("/payments/providers"),
  /** A $0 plan during the pilot. No payment provider is involved. */
  activatePlan: (plan: PlanKey) => api.post<PilotActivation>("/payments/activate-plan", { plan }),
  chapaCheckout: (plan: PlanKey) => api.post<ChapaCheckout>("/payments/chapa/checkout", { plan }),
  chapaVerify: (txRef: string) => api.get<ChapaVerify>(`/payments/chapa/verify/${encodeURIComponent(txRef)}`),
  stripeCheckout: (plan: PlanKey) => api.post<StripeCheckout>("/payments/stripe/checkout", { plan }),
  paypalOrder: (plan: PlanKey) => api.post<PaypalOrder>("/payments/paypal/create-order", { plan }),
  paypalCapture: (orderId: string) => api.post<PaypalCapture>("/payments/paypal/capture-order", { orderId }),
  paypalCancel: (orderId: string) => api.post<{ cancelled: boolean }>("/payments/paypal/cancel-order", { orderId }),
};
