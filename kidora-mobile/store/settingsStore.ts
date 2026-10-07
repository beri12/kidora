import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/constants/storage-keys';

import { asyncJSONStorage } from './storage';

export interface SettingsState {
  /** null = follow the device language */
  locale: string | null;
  music: boolean;
  soundEffects: boolean;
  voice: boolean;
  /** User override; the OS reduce-motion flag is also honoured (see useReducedMotionPref). */
  reduceMotion: boolean;
  haptics: boolean;
  dataSaver: boolean;
  largeText: boolean;
  hydrated: boolean;
  set: (patch: Partial<Omit<SettingsState, 'set' | 'hydrated' | 'reset'>>) => void;
  reset: () => void;
}

const DEFAULTS = {
  locale: null,
  music: false,
  soundEffects: true,
  voice: true,
  reduceMotion: false,
  haptics: true,
  dataSaver: false,
  largeText: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      hydrated: false,
      set: (patch) => set(patch),
      reset: () => set(DEFAULTS),
    }),
    {
      name: STORAGE_KEYS.settings,
      storage: asyncJSONStorage,
      partialize: ({ hydrated: _h, set: _s, reset: _r, ...rest }) => rest,
      onRehydrateStorage: () => () => useSettingsStore.setState({ hydrated: true }),
    },
  ),
);
