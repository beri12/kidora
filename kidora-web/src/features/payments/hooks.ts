"use client";
import { useMutation } from "@tanstack/react-query";
import { paymentsApi } from "@/lib/api/payments";
import type { PlanKey } from "@/lib/api/billing";

/**
 * Starts Stripe hosted checkout and sends the browser to it.
 * The redirect happens here so every caller behaves the same way.
 */
export function useStripeCheckout() {
  return useMutation({
    mutationFn: (plan: PlanKey) => paymentsApi.stripeCheckout(plan),
    onSuccess: (session) => {
      if (session?.url) window.location.href = session.url;
    },
  });
}

/**
 * PayPal Smart Buttons: create an order, then capture it after approval.
 * The pricing page calls `paypal.create(plan)` and `paypal.capture(orderID)`
 * directly from the button callbacks, so both are plain promises rather than
 * mutations.
 */
export function usePaypalOrder() {
  const order = useMutation({ mutationFn: (plan: PlanKey) => paymentsApi.paypalOrder(plan) });
  const capture = useMutation({ mutationFn: (orderId: string) => paymentsApi.paypalCapture(orderId) });

  return {
    // <PayPalButtons createOrder> must resolve to the order id string, so
    // these are plain promise-returning functions rather than mutation objects.
    createOrder: async (plan: PlanKey) => (await order.mutateAsync(plan)).orderId,
    capture: (orderId: string) => capture.mutateAsync(orderId),
    isPending: order.isPending || capture.isPending,
    orderMutation: order,
    captureMutation: capture,
  };
}
