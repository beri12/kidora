import { api } from "./client";

/** SubscriptionsController + InvoicesController. */
export type PlanKey = "free" | "family" | "school" | "district";

export interface Subscription { id: string; plan: PlanKey; status: string; renewsAt?: string | null; provider?: string | null }
/** Exactly what SubscriptionsService.usage() returns. */
export interface Usage { lessons: number; aiChats: number; games: number }
export interface Invoice { id: string; amountCents?: number; amount?: number; currency: string; createdAt?: string; issuedAt?: string; plan?: PlanKey; pdfUrl?: string }

export const billingApi = {
  subscription: () => api.get<Subscription | null>("/subscriptions"),
  usage: () => api.get<Usage>("/subscriptions/usage"),
  setPlan: (plan: PlanKey) => api.post<Subscription>("/subscriptions", { plan }),
  cancel: () => api.post<Subscription>("/subscriptions/cancel"),
  invoices: () => api.get<Invoice[]>("/invoices"),
};
