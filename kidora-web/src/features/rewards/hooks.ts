"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { economyApi } from "@/lib/api/economy";

export const rewardKeys = {
  wallet: ["economy", "wallet"] as const,
  transactions: ["economy", "transactions"] as const,
  missions: ["economy", "missions"] as const,
  achievements: ["economy", "achievements"] as const,
};

/** Coin/gem/XP wallet. */
export function useRewards() {
  return useQuery({ queryKey: rewardKeys.wallet, queryFn: economyApi.wallet, staleTime: 30_000 });
}

export function useTransactions() {
  return useQuery({ queryKey: rewardKeys.transactions, queryFn: economyApi.transactions, staleTime: 60_000 });
}

/** Buying an item debits the wallet, so both are refetched. */
export function usePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => economyApi.purchase(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rewardKeys.wallet });
      qc.invalidateQueries({ queryKey: rewardKeys.transactions });
      qc.invalidateQueries({ queryKey: ["avatar"] });
    },
  });
}

/**
 * Missions plus the mutation that completes one. The rewards page destructures
 * `{ data, complete }`, so the mutation rides along with the query.
 */
export function useMissions() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: rewardKeys.missions, queryFn: economyApi.missions, staleTime: 30_000 });
  const complete = useMutation({
    mutationFn: (id: string) => economyApi.completeMission(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rewardKeys.missions });
      qc.invalidateQueries({ queryKey: rewardKeys.wallet });
    },
  });
  return { ...query, complete };
}

export function useAchievements() {
  return useQuery({ queryKey: rewardKeys.achievements, queryFn: economyApi.achievements, staleTime: 60_000 });
}
