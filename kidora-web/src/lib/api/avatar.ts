import { api } from "./client";

/** AvatarController (@Controller()). */
export interface Avatar {
  id: string; userId: string; body: string; skinColor: string; hair: string;
  face: string; clothes: string; accessories: string[]; pet?: string | null;
}
export interface AvatarItem { id: string; name: string; category: string; rarity: string; price: number; assetUrl: string }
export interface InventoryEntry { id: string; itemId: string; equipped: boolean; item: AvatarItem }

export const avatarApi = {
  get: () => api.get<Avatar>("/avatar"),
  update: (patch: Partial<Avatar>) => api.put<Avatar>("/avatar", patch),
  items: (category?: string) => api.get<AvatarItem[]>("/avatar/items", { category }),
  inventory: () => api.get<InventoryEntry[]>("/inventory"),
  equip: (itemId: string, equipped = true) => api.post<InventoryEntry>(`/inventory/${itemId}/equip`, { equipped }),
};
