"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { billingApi, type PlanKey } from "@/lib/api/billing";

export const billingKeys = {
  subscription: ["billing", "subscription"] as const,
  usage: ["billing", "usage"] as const,
  invoices: ["billing", "invoices"] as const,
};

/**
 * Current plan, its usage counters, and the plan-change mutations.
 * The account page destructures `{ data, usage, setPlan, cancel }`.
 */
export function useSubscription() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: billingKeys.subscription, queryFn: billingApi.subscription, staleTime: 60_000 });
  const usage = useQuery({ queryKey: billingKeys.usage, queryFn: billingApi.usage, staleTime: 60_000 });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: billingKeys.subscription });
    qc.invalidateQueries({ queryKey: billingKeys.usage });
    qc.invalidateQueries({ queryKey: billingKeys.invoices });
  };

  const setPlan = useMutation({ mutationFn: (plan: PlanKey) => billingApi.setPlan(plan), onSuccess: invalidate });
  const cancel = useMutation({ mutationFn: () => billingApi.cancel(), onSuccess: invalidate });

  // `usage` is the query object, not its data: the account page reads
  // usage.data and needs the loading/error flags alongside it.
  return { ...query, usage, setPlan, cancel };
}

export function useInvoices() {
  return useQuery({ queryKey: billingKeys.invoices, queryFn: billingApi.invoices, staleTime: 5 * 60_000 });
}
