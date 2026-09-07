import { api } from "./client";

/** Wallet, shop, missions and achievements — EconomyController (@Controller()). */
export interface Wallet { id: string; userId: string; coins: number; gems: number; xp: number; level: number }
export interface Transaction { id: string; type: string; amount: number; description: string; createdAt: string }
export interface Mission { id: string; title: string; description: string; rewardXP: number; rewardCoins: number; completed?: boolean; progress?: number }
export interface Achievement { id: string; title: string; description: string; badgeUrl: string; category: string; requirement: number; progress?: number; unlockedAt?: string | null }

export const economyApi = {
  wallet: () => api.get<Wallet>("/rewards"),
  transactions: () => api.get<Transaction[]>("/rewards/transactions"),
  purchase: (itemId: string) => api.post<Wallet>("/rewards/purchase", { itemId }),
  missions: () => api.get<Mission[]>("/missions"),
  completeMission: (id: string) => api.post<Mission>(`/missions/${id}/complete`),
  achievements: () => api.get<Achievement[]>("/achievements"),
};
