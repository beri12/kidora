"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { avatarApi, type Avatar } from "@/lib/api/avatar";

export const avatarKeys = {
  me: ["avatar", "me"] as const,
  items: (category?: string) => ["avatar", "items", category ?? "all"] as const,
  inventory: ["avatar", "inventory"] as const,
};

/** The signed-in user's avatar plus the mutation that saves changes. */
export function useAvatar() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: avatarKeys.me, queryFn: avatarApi.get, staleTime: 5 * 60_000 });
  const update = useMutation({
    mutationFn: (patch: Partial<Avatar>) => avatarApi.update(patch),
    // Write the server's copy straight into the cache so the preview does not
    // flicker back to the old look while a refetch is in flight.
    onSuccess: (saved) => qc.setQueryData(avatarKeys.me, saved),
  });
  return { ...query, update };
}

/** Shop catalogue; public, so it does not need a session. */
export function useAvatarItems(category?: string) {
  return useQuery({
    queryKey: avatarKeys.items(category),
    queryFn: () => avatarApi.items(category),
    staleTime: 10 * 60_000,
  });
}

export function useInventory() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: avatarKeys.inventory, queryFn: avatarApi.inventory, staleTime: 60_000 });
  const equip = useMutation({
    mutationFn: ({ itemId, equipped = true }: { itemId: string; equipped?: boolean }) =>
      avatarApi.equip(itemId, equipped),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: avatarKeys.inventory });
      qc.invalidateQueries({ queryKey: avatarKeys.me });
    },
  });
  return { ...query, equip };
}
