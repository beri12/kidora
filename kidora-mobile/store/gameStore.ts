import { create } from 'zustand';

import type { RewardOutcome } from '@/types';

export type Celebration =
  | { id: string; kind: 'xp'; xp: number; coins: number }
  | { id: string; kind: 'level_up'; level: number }
  | { id: string; kind: 'achievement'; title: string };

interface GameState {
  /** Queue of celebrations to play, one at a time. */
  celebrations: Celebration[];
  /** XP earned offline that the server hasn't confirmed yet (optimistic). */
  pendingXp: number;
  celebrate: (outcome: RewardOutcome) => void;
  push: (c: Celebration) => void;
  dismiss: (id: string) => void;
  addPendingXp: (xp: number) => void;
  clearPendingXp: () => void;
  reset: () => void;
}

let seq = 0;
const nextId = () => `c${Date.now()}_${seq++}`;

/** Turn a backend RewardOutcome into the celebrations it deserves. */
export function celebrationsFor(outcome: RewardOutcome): Celebration[] {
  const out: Celebration[] = [];
  if (outcome.xp > 0 || outcome.coins > 0) out.push({ id: nextId(), kind: 'xp', xp: outcome.xp, coins: outcome.coins });
  if (outcome.leveledUp) out.push({ id: nextId(), kind: 'level_up', level: outcome.newLevel });
  outcome.unlockedAchievements.forEach((title) => out.push({ id: nextId(), kind: 'achievement', title }));
  return out;
}

export const useGameStore = create<GameState>((set) => ({
  celebrations: [],
  pendingXp: 0,
  celebrate: (outcome) => set((s) => ({ celebrations: [...s.celebrations, ...celebrationsFor(outcome)] })),
  push: (c) => set((s) => ({ celebrations: [...s.celebrations, c] })),
  dismiss: (id) => set((s) => ({ celebrations: s.celebrations.filter((c) => c.id !== id) })),
  addPendingXp: (xp) => set((s) => ({ pendingXp: s.pendingXp + xp })),
  clearPendingXp: () => set({ pendingXp: 0 }),
  reset: () => set({ celebrations: [], pendingXp: 0 }),
}));
