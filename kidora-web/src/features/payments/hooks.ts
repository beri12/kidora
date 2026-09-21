'use client';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface CheckoutSession {
  url: string;
  id?: string;
}

export interface PaypalOrder {
  id: string;
}

/**
 * Stripe hosted checkout — POST /api/payments/stripe/checkout.
 *
 * The redirect happens here rather than in the page so every caller gets the
 * same behaviour, and the mutation stays `isPending` through the navigation
 * (the button keeps its "Redirecting…" label instead of flicking back).
 */
export function useStripeCheckout() {
  return useMutation<CheckoutSession, unknown, string>({
    mutationFn: async (plan: string) =>
      (await api.post<CheckoutSession>('/payments/stripe/checkout', { plan })).data,
    onSuccess: (session) => {
      if (session?.url) window.location.href = session.url;
    },
  });
}

/**
 * PayPal order lifecycle.
 *
 * <PayPalButtons> expects plain promise-returning callbacks — createOrder
 * must resolve to the order id string and onApprove awaits the capture — so
 * these are exposed as functions rather than as mutation objects.
 */
export function usePaypalOrder() {
  const createOrder = async (plan: string): Promise<string> => {
    const { data } = await api.post<PaypalOrder>('/payments/paypal/order', { plan });
    return data.id;
  };

  const capture = async (orderId: string) => {
    const { data } = await api.post('/payments/paypal/capture', { orderId });
    return data;
  };

  return { createOrder, capture };
}
