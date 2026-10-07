import { ISLANDS, islandDefinition } from '@/features/game/islands';
import { levelProgress } from '@/lib/level';
import type { AvatarConfig, AvatarItem, Island, Reward, Wallet, WorldResponse } from '@/types';

import { api } from './api';

/**
 * Merge the static island catalogue with GET /student/world.
 *
 * Every catalogue island is shown; an island with no enrolled course yet is
 * locked. Unknown world keys from the backend become new islands
 * automatically, so islands can be added server-side without an app release.
 */
export function buildIslands(world: WorldResponse, totalXp: number): Island[] {
  const byKey = new Map(world.worlds.map((w) => [w.key, w]));
  const keys = new Set<string>([...ISLANDS.map((i) => i.key), ...world.worlds.map((w) => w.key)]);
  const level = levelProgress(totalXp).level;
  return [...keys]
    .map((key) => {
      const def = islandDefinition(key);
      const live = byKey.get(key);
      return {
        ...def,
        accent: live?.accent ?? def.accent,
        id: key,
        progress: live?.progress ?? 0,
        unlocked: !!live && live.nodes.length > 0,
        level,
        xp: totalXp,
        nodes: live?.nodes ?? [],
      } satisfies Island;
    })
    .sort((a, b) => a.order - b.order);
}

export const gameService = {
  world: () => api.get<WorldResponse>('/student/world'),
  wallet: () => api.get<Wallet>('/rewards'),
  shop: () => api.get<Reward[]>('/avatar/items'),
  purchase: (itemId: string) => api.post<unknown>('/rewards/purchase', { itemId }),
  avatar: () => api.get<AvatarConfig>('/avatar'),
  updateAvatar: (config: AvatarConfig) => api.put<AvatarConfig>('/avatar', config),
  avatarItems: (category?: string) => api.get<AvatarItem[]>('/avatar/items', category ? { category } : undefined),
  equip: (itemId: string, equipped: boolean) => api.post<unknown>(`/inventory/${itemId}/equip`, { equipped }),
};
