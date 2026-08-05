// lib/hooks/usePayments.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelSubscription,
  createCheckoutSession,
  getInvoices,
  getMySubscription,
  type CreateCheckoutSessionRequest,
} from "@/lib/payment";
import { normalizeApiError } from "@/lib/http";

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: (payload: CreateCheckoutSessionRequest) => createCheckoutSession(payload),
    onError: (error) => normalizeApiError(error),
  });
}

export function useMySubscription() {
  return useQuery({
    queryKey: ["subscription", "me"],
    queryFn: getMySubscription,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices", "me"],
    queryFn: getInvoices,
    staleTime: 60_000,
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription", "me"] });
    },
  });
}

// Generates a stable idempotency key per checkout attempt (not per render).
export function generateIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}