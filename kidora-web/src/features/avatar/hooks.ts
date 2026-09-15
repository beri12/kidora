'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface Avatar {
  skinColor?: string;
  hair?: string;
  clothes?: string;
  pet?: string;
  accessories?: string[];
  [key: string]: unknown;
}

export interface AvatarItem {
  id: string;
  name: string;
  category?: string;
  rarity?: string;
  price: number;
}

const avatarKeys = {
  mine: ['avatar'] as const,
  items: (category?: string) => ['avatar', 'items', category ?? 'all'] as const,
  inventory: ['inventory'] as const,
};

/**
 * The customiser reads `data` and calls `update.mutate(patch)` on every
 * click, so the saved avatar and its mutation are returned together.
 *
 * The patch is merged onto the cached avatar optimistically so the preview
 * updates on the same frame as the click instead of waiting for the round
 * trip; a failed save rolls back to the previous value.
 */
export function useAvatar() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: avatarKeys.mine,
    queryFn: async () => (await api.get<Avatar>('/avatar')).data,
  });

  const update = useMutation({
    mutationFn: async (patch: Record<string, unknown>) =>
      (await api.put<Avatar>('/avatar', patch)).data,
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: avatarKeys.mine });
      const previous = qc.getQueryData<Avatar>(avatarKeys.mine);
      qc.setQueryData<Avatar>(avatarKeys.mine, { ...(previous ?? {}), ...patch });
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) qc.setQueryData(avatarKeys.mine, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: avatarKeys.mine }),
  });

  return { ...query, update };
}

/** Shop catalogue — GET /api/avatar/items. */
export function useAvatarItems(category?: string) {
  return useQuery({
    queryKey: avatarKeys.items(category),
    queryFn: async () =>
      (await api.get<AvatarItem[]>('/avatar/items', { params: category ? { category } : undefined })).data,
  });
}

/** Items the signed-in user already owns — GET /api/inventory. */
export function useInventory() {
  return useQuery({
    queryKey: avatarKeys.inventory,
    queryFn: async () => (await api.get<AvatarItem[]>('/inventory')).data,
  });
}
