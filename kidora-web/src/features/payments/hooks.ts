"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { paymentsApi, type CatalogPlan } from "@/lib/api/payments";
import { billingApi, type PlanKey } from "@/lib/api/billing";
import { billingKeys } from "@/features/subscription/hooks";
import { ApiError } from "@/lib/api/client";
import { formatPrice } from "@/lib/utils";

export const paymentKeys = { catalog: ["payments", "catalog"] as const };

/** Plans with their price and checkout mode, straight from the API. Public. */
export function usePlanCatalog() {
  return useQuery({ queryKey: paymentKeys.catalog, queryFn: paymentsApi.plans, staleTime: 5 * 60_000 });
}

/** The signed-in user's plan; idle when signed out. */
export function useCurrentSubscription(enabled: boolean) {
  return useQuery({ queryKey: billingKeys.subscription, queryFn: billingApi.subscription, enabled, staleTime: 60_000 });
}

/**
 * Starts Stripe hosted checkout and sends the browser to it. The pricing page
 * now checks out through PayPal; this stays for the existing Stripe route.
 */
export function useStripeCheckout() {
  return useMutation({
    mutationFn: (plan: PlanKey) => paymentsApi.stripeCheckout(plan),
    onSuccess: (session) => {
      if (session?.url) window.location.href = session.url;
    },
  });
}

export const CHECKOUT_MESSAGES = {
  pilotActive: "Your Kidora pilot access is now active.",
  freeActive: "You're on the Kidora Free plan.",
  paid: "Payment successful. Your Kidora plan is now active.",
  pending: "PayPal is reviewing your payment. Your plan will activate as soon as it clears.",
  paypalUnavailable: "Payment service is temporarily unavailable. Please try again.",
  cancelled: "Payment was cancelled. No charge was made.",
  failed: "Payment could not be completed. Please try again.",
  unavailable: "This plan is currently unavailable.",
  signIn: "Please sign in to continue.",
  catalogDown: "Plans are temporarily unavailable. Please refresh the page.",
} as const;

/**
 * A message safe to show. 4xx messages from the API are written for users;
 * anything else (outage, network, a PayPal SDK error) gets a fixed message so
 * no provider detail reaches the screen.
 */
export function checkoutErrorMessage(e: unknown, paypal: boolean): string {
  if (e instanceof ApiError) {
    if (e.isUnauthorized) return CHECKOUT_MESSAGES.signIn;
    if (e.isNetwork || e.status >= 500) return paypal ? CHECKOUT_MESSAGES.paypalUnavailable : "Something went wrong. Please try again.";
    return e.message;
  }
  return CHECKOUT_MESSAGES.failed;
}

/** How a plan's price reads on a pricing card. */
export function priceLabel(plan: CatalogPlan | undefined): { amount: string; suffix?: string; note?: string } {
  if (!plan) return { amount: "…" };
  switch (plan.checkout) {
    case "pilot": return { amount: "Free", note: "Free during Kidora pilot" };
    case "free": return { amount: "Free" };
    case "paypal": return { amount: formatPrice(plan.priceCents, plan.currency), suffix: plan.billingInterval === "year" ? "/yr" : "/mo" };
    case "contact": return { amount: "Contact us" };
    default: return { amount: "—", note: "Currently unavailable" };
  }
}
