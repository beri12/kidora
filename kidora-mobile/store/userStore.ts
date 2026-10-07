import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/constants/storage-keys';

import { asyncJSONStorage } from './storage';

interface UserUiState {
  /** Parent: which child the dashboard is showing. */
  selectedChildId: string | null;
  /** Student: last island opened, to reopen the map there. */
  lastIslandKey: string | null;
  setSelectedChild: (id: string | null) => void;
  setLastIsland: (key: string | null) => void;
  reset: () => void;
}

export const useUserStore = create<UserUiState>()(
  persist(
    (set) => ({
      selectedChildId: null,
      lastIslandKey: null,
      setSelectedChild: (selectedChildId) => set({ selectedChildId }),
      setLastIsland: (lastIslandKey) => set({ lastIslandKey }),
      reset: () => set({ selectedChildId: null, lastIslandKey: null }),
    }),
    { name: `${STORAGE_KEYS.settings}.user`, storage: asyncJSONStorage },
  ),
);
