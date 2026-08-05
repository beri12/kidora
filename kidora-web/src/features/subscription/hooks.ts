import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface Subscription { id: string; plan: string; status: string; renewsAt: string | null; }

export function useSubscription() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['subscription'], queryFn: async () => (await api.get<Subscription>('/subscriptions')).data });
  const usage = useQuery({ queryKey: ['subscription-usage'], queryFn: async () => (await api.get('/subscriptions/usage')).data });
  const setPlan = useMutation({
    mutationFn: async (plan: string) => (await api.post('/subscriptions', { plan })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscription'] }),
  });
  const cancel = useMutation({
    mutationFn: async () => (await api.post('/subscriptions/cancel')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscription'] }),
  });
  return { ...query, usage, setPlan, cancel };
}

export function useInvoices() {
  return useQuery({ queryKey: ['invoices'], queryFn: async () => (await api.get('/invoices')).data });
}
