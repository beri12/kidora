// lib/api/payments.ts
// This is the contract the NestJS PaymentsController will implement.
// Keeping it typed here means the backend build just has to match these shapes.
import { http } from "./http";

export type PaymentProvider = "stripe" | "paypal" | "apple_pay" | "telebirr";
export type BillingCycle = "monthly" | "yearly";
export type PlanKey = "free" | "family" | "school" | "district";

export interface CreateCheckoutSessionRequest {
  planKey: PlanKey;
  billingCycle: BillingCycle;
  provider: PaymentProvider;
  idempotencyKey: string; // generated client-side, required by backend to prevent double charges
}

export interface CreateCheckoutSessionResponse {
  // Stripe/PayPal: redirect the browser here (hosted checkout).
  // Apple Pay via Stripe: may instead return a clientSecret for Payment Request Button flow.
  redirectUrl?: string;
  clientSecret?: string;
  sessionId: string;
  provider: PaymentProvider;
}

export interface SubscriptionSummary {
  id: string;
  planKey: PlanKey;
  billingCycle: BillingCycle;
  status: "active" | "past_due" | "canceled" | "trialing";
  currentPeriodEnd: string; // ISO date
  provider: PaymentProvider;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  issuedAt: string;
  pdfUrl: string;
  planKey: PlanKey;
}

export async function createCheckoutSession(
  payload: CreateCheckoutSessionRequest
): Promise<CreateCheckoutSessionResponse> {
  const { data } = await http.post<CreateCheckoutSessionResponse>(
    "/payments/checkout-session",
    payload,
    { headers: { "Idempotency-Key": payload.idempotencyKey } }
  );
  return data;
}

export async function getCheckoutSessionStatus(sessionId: string) {
  const { data } = await http.get<{ status: "pending" | "succeeded" | "failed" }>(
    `/payments/checkout-session/${sessionId}`
  );
  return data;
}

export async function getMySubscription(): Promise<SubscriptionSummary | null> {
  const { data } = await http.get<SubscriptionSummary | null>("/payments/subscription");
  return data;
}

export async function cancelSubscription(): Promise<void> {
  await http.post("/payments/subscription/cancel");
}

export async function getInvoices(): Promise<Invoice[]> {
  const { data } = await http.get<Invoice[]>("/payments/invoices");
  return data;
}

// --- PayPal (in-app Smart Buttons flow: create order -> user approves -> capture) ---

export interface CreatePayPalOrderRequest {
  planKey: PlanKey;
  billingCycle: BillingCycle;
}

export interface CreatePayPalOrderResponse {
  orderId: string;
}

export async function createPayPalOrder(
  payload: CreatePayPalOrderRequest
): Promise<CreatePayPalOrderResponse> {
  const { data } = await http.post<CreatePayPalOrderResponse>("/payments/paypal/orders", payload);
  return data;
}

export interface CapturePayPalOrderResponse {
  status: "succeeded" | "failed";
  subscriptionId?: string;
}

export async function capturePayPalOrder(orderId: string): Promise<CapturePayPalOrderResponse> {
  const { data } = await http.post<CapturePayPalOrderResponse>(
    `/payments/paypal/orders/${orderId}/capture`
  );
  return data;
}

// --- Stripe (inline PaymentElement flow: create PaymentIntent -> confirm client-side) ---

export interface CreateStripePaymentIntentRequest {
  planKey: PlanKey;
  billingCycle: BillingCycle;
}

export interface CreateStripePaymentIntentResponse {
  clientSecret: string;
}

export async function createStripePaymentIntent(
  payload: CreateStripePaymentIntentRequest
): Promise<CreateStripePaymentIntentResponse> {
  const { data } = await http.post<CreateStripePaymentIntentResponse>(
    "/payments/stripe/payment-intent",
    payload
  );
  return data;
}