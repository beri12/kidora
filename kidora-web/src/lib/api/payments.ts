import { api } from "./client";
import type { PlanKey } from "./billing";

/** PaymentsController (@Controller('payments')). */
export interface StripeCheckout { url: string; sessionId?: string }
export interface PaypalOrder { orderId: string }
export interface PaypalCapture { status: string; subscriptionId?: string }

export const paymentsApi = {
  stripeCheckout: (plan: PlanKey) => api.post<StripeCheckout>("/payments/stripe/checkout", { plan }),
  paypalOrder: (plan: PlanKey) => api.post<PaypalOrder>("/payments/paypal/order", { plan }),
  paypalCapture: (orderId: string) => api.post<PaypalCapture>("/payments/paypal/capture", { orderId }),
};
