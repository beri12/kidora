'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export type PlanKey = 'free' | 'family' | 'school';

export interface Subscription {
  plan: PlanKey | string;
  status: string;
  renewsAt?: string | null;
}

export interface Usage {
  lessons: number;
  aiChats: number;
  games: number;
}

export interface Invoice {
  id: string;
  amountCents: number;
  currency?: string;
  status: string;
  createdAt: string;
}

const subKeys = {
  mine: ['subscription'] as const,
  usage: ['subscription', 'usage'] as const,
  invoices: ['invoices'] as const,
};

/**
 * The account page reads `data`, `usage`, `setPlan` and `cancel` off a single
 * hook, so the plan query, the usage query and both mutations are bundled
 * here. Every mutation refreshes the subscription so the header reflects the
 * new plan without a manual reload.
 */
export function useSubscription() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: subKeys.mine,
    queryFn: async () => (await api.get<Subscription>('/subscriptions')).data,
  });

  const usage = useQuery({
    queryKey: subKeys.usage,
    queryFn: async () => (await api.get<Usage>('/subscriptions/usage')).data,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: subKeys.mine });
    qc.invalidateQueries({ queryKey: subKeys.usage });
  };

  const setPlan = useMutation({
    mutationFn: async (plan: PlanKey | string) =>
      (await api.post<Subscription>('/subscriptions', { plan })).data,
    onSuccess: invalidate,
  });

  const cancel = useMutation({
    mutationFn: async () => (await api.post<Subscription>('/subscriptions/cancel')).data,
    onSuccess: invalidate,
  });

  return { ...query, usage, setPlan, cancel };
}

export function useInvoices() {
  return useQuery({
    queryKey: subKeys.invoices,
    queryFn: async () => (await api.get<Invoice[]>('/invoices')).data,
  });
}
