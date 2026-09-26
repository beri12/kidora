import { api } from "./client";
import type { PlanKey } from "./billing";

/** PaymentsController (@Controller('payments')). */
export interface StripeCheckout { url: string; sessionId?: string }
export interface PaypalOrder { orderId: string }
export interface PaypalCapture { status: string; subscriptionId?: string }

export interface PaymentProviders { chapa: boolean; stripe: boolean; paypal: boolean }
export interface ChapaCheckout { url: string; txRef: string }
export interface ChapaVerify { status: "paid" | "pending" | "failed"; plan: PlanKey }

export const paymentsApi = {
  providers: () => api.get<PaymentProviders>("/payments/providers"),
  chapaCheckout: (plan: PlanKey) => api.post<ChapaCheckout>("/payments/chapa/checkout", { plan }),
  chapaVerify: (txRef: string) => api.get<ChapaVerify>(`/payments/chapa/verify/${encodeURIComponent(txRef)}`),
  stripeCheckout: (plan: PlanKey) => api.post<StripeCheckout>("/payments/stripe/checkout", { plan }),
  paypalOrder: (plan: PlanKey) => api.post<PaypalOrder>("/payments/paypal/order", { plan }),
  paypalCapture: (orderId: string) => api.post<PaypalCapture>("/payments/paypal/capture", { orderId }),
};
