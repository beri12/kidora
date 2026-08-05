import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface Wallet { coins: number; gems: number; xp: number; level: number; }
export interface Mission { id: string; title: string; description: string; rewardXP: number; rewardCoins: number; completed: boolean; }
export interface Achievement { id: string; title: string; description: string; category: string; requirement: number; progress: number; unlockedAt: string | null; }

// Coin/gem/XP wallet.
export function useRewards() {
  return useQuery({ queryKey: ['rewards'], queryFn: async () => (await api.get<Wallet>('/rewards')).data });
}

// Buy an avatar item; refreshes wallet + inventory on success.
export function usePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => (await api.post('/rewards/purchase', { itemId })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rewards'] }); qc.invalidateQueries({ queryKey: ['inventory'] }); },
  });
}

export function useMissions() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['missions'], queryFn: async () => (await api.get<Mission[]>('/missions')).data });
  const complete = useMutation({
    mutationFn: async (id: string) => (await api.post(`/missions/${id}/complete`)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['missions'] }); qc.invalidateQueries({ queryKey: ['rewards'] }); },
  });
  return { ...query, complete };
}

export function useAchievements() {
  return useQuery({ queryKey: ['achievements'], queryFn: async () => (await api.get<Achievement[]>('/achievements')).data });
}
