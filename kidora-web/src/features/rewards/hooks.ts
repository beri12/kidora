'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface Wallet {
  coins: number;
  gems: number;
  xp: number;
  level: number;
}

export interface Mission {
  id: string;
  title: string;
  rewardCoins: number;
  rewardXP: number;
  completed: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlockedAt?: string | null;
}

const rewardKeys = {
  wallet: ['rewards', 'wallet'] as const,
  missions: ['missions'] as const,
  achievements: ['achievements'] as const,
};

/** Coin / gem / XP wallet — GET /api/rewards. */
export function useRewards() {
  return useQuery({
    queryKey: rewardKeys.wallet,
    queryFn: async () => (await api.get<Wallet>('/rewards')).data,
  });
}

/**
 * Buys a shop item — POST /api/rewards/purchase.
 *
 * Both the wallet (coins were spent) and the inventory (the item is now
 * owned) are invalidated, so the balance and the shop's affordability checks
 * update together.
 */
export function usePurchase() {
  const qc = useQueryClient();
  return useMutation<unknown, unknown, string>({
    mutationFn: async (itemId: string) =>
      (await api.post('/rewards/purchase', { itemId })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rewardKeys.wallet });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

/**
 * Daily missions plus the completion mutation, since the page destructures
 * `data` and `complete` from one hook. Completing a mission pays out coins
 * and XP, so the wallet is refreshed alongside the mission list.
 */
export function useMissions() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: rewardKeys.missions,
    queryFn: async () => (await api.get<Mission[]>('/missions')).data,
  });

  const complete = useMutation<unknown, unknown, string>({
    mutationFn: async (id: string) => (await api.post(`/missions/${id}/complete`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rewardKeys.missions });
      qc.invalidateQueries({ queryKey: rewardKeys.wallet });
    },
  });

  return { ...query, complete };
}

export function useAchievements() {
  return useQuery({
    queryKey: rewardKeys.achievements,
    queryFn: async () => (await api.get<Achievement[]>('/achievements')).data,
  });
}
