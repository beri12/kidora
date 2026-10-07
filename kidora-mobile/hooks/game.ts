import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { flattenIslandNodes } from '@/features/game/map';
import { resolveIslandKey } from '@/features/game/islands';
import { qk } from '@/lib/query-keys';
import { buildIslands, gameService } from '@/services/game.service';
import type { AvatarConfig } from '@/types';

import { useStudentDashboard } from './student';

export function useWorld() {
  return useQuery({ queryKey: qk.world, queryFn: gameService.world, staleTime: 60_000 });
}

export function useIslands() {
  const world = useWorld();
  const dashboard = useStudentDashboard();
  const xp = dashboard.data?.profile.xp ?? 0;
  const data = useMemo(() => (world.data ? buildIslands(world.data, xp) : undefined), [world.data, xp]);
  return { ...world, data };
}

export function useIsland(idOrSlug: string) {
  const islands = useIslands();
  const key = resolveIslandKey(idOrSlug);
  const island = useMemo(() => islands.data?.find((i) => i.key === key), [islands.data, key]);
  const nodes = useMemo(() => (island ? flattenIslandNodes(island.nodes) : []), [island]);
  return { ...islands, data: island, nodes };
}

export function useWallet() {
  return useQuery({ queryKey: qk.wallet, queryFn: gameService.wallet });
}

export function useShop() {
  return useQuery({ queryKey: qk.avatarItems(), queryFn: gameService.shop });
}

export function usePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => gameService.purchase(itemId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.wallet });
      void qc.invalidateQueries({ queryKey: qk.student.dashboard });
      void qc.invalidateQueries({ queryKey: ['avatar'] });
    },
  });
}

export function useAvatar() {
  return useQuery({ queryKey: qk.avatar, queryFn: gameService.avatar });
}

export function useAvatarItems(category?: string) {
  return useQuery({ queryKey: qk.avatarItems(category), queryFn: () => gameService.avatarItems(category) });
}

export function useSaveAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: AvatarConfig) => gameService.updateAvatar(config),
    onMutate: (config) => {
      const prev = qc.getQueryData<AvatarConfig>(qk.avatar);
      qc.setQueryData(qk.avatar, config);
      return { prev };
    },
    onError: (_e, _c, ctx) => qc.setQueryData(qk.avatar, ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.avatar }),
  });
}
