import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface Avatar { id: string; body: string; skinColor: string; hair: string; face: string; clothes: string; accessories: string[]; pet?: string; }
export interface InventoryItem { id: string; equipped: boolean; item: { id: string; name: string; category: string; rarity: string; price: number; assetUrl: string }; }

// Read + update the child's avatar config.
export function useAvatar() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['avatar'], queryFn: async () => (await api.get<Avatar>('/avatar')).data });
  const update = useMutation({
    mutationFn: async (patch: Partial<Avatar>) => (await api.put<Avatar>('/avatar', patch)).data,
    onSuccess: (data) => qc.setQueryData(['avatar'], data),
  });
  return { ...query, update };
}

export function useAvatarItems(category?: string) {
  return useQuery({ queryKey: ['avatar-items', category ?? 'all'], queryFn: async () => (await api.get('/avatar/items', { params: { category } })).data });
}

export function useInventory() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['inventory'], queryFn: async () => (await api.get<InventoryItem[]>('/inventory')).data });
  const equip = useMutation({
    mutationFn: async ({ itemId, equipped }: { itemId: string; equipped: boolean }) => (await api.post(`/inventory/${itemId}/equip`, { equipped })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });
  return { ...query, equip };
}
