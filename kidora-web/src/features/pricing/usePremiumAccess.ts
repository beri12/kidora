'use client';
import { useQuery } from '@tanstack/react-query';
import { pricingApi } from '@/lib/api/pricing';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Whether premium content should show as unlocked: the user has a paid (or
 * pilot) plan, or the Kidora pilot is running, during which all of Kidora is
 * open. The API enforces the same rule; this only decides what the UI shows.
 * Shares the pricing page's cached query.
 */
export function usePremiumAccess() {
  const hasPlan = useAuthStore((s) => s.hasPlan());
  const { data } = useQuery({ queryKey: ['pricing'], queryFn: pricingApi.catalog, staleTime: 5 * 60_000 });
  return hasPlan || Boolean(data?.pilot?.active);
}
