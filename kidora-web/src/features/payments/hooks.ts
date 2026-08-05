import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/axios';

// Stripe hosted checkout: backend creates a session, we redirect to it.
export function useStripeCheckout() {
  return useMutation({
    mutationFn: async (plan: string) => (await api.post<{ url: string }>('/payments/stripe/checkout', { plan })).data,
    onSuccess: (data) => { if (data.url) window.location.href = data.url; },
  });
}

// PayPal: backend creates + captures the order. These map to the
// @paypal/react-paypal-js createOrder / onApprove callbacks.
export function usePaypalOrder() {
  return {
    createOrder: async (plan: string) => (await api.post<{ id: string }>('/payments/paypal/order', { plan })).data.id,
    capture: async (orderId: string) => (await api.post('/payments/paypal/capture', { orderId })).data,
  };
}
