import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { NotificationCategory, NotificationPreferences } from '@/types';

import { asyncJSONStorage } from './storage';

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  lesson_reminder: true,
  assignment: true,
  achievement: true,
  level_up: true,
  new_course: true,
  parent_report: true,
  teacher_announcement: true,
  school_announcement: true,
};

/** Critical categories cannot be switched off (account/safety). None of the product categories are critical. */
export const CRITICAL_CATEGORIES: readonly NotificationCategory[] = [];

interface NotificationState {
  preferences: NotificationPreferences;
  pushToken: string | null;
  permission: 'undetermined' | 'granted' | 'denied';
  setPreference: (category: NotificationCategory, enabled: boolean) => void;
  setPushToken: (token: string | null) => void;
  setPermission: (p: NotificationState['permission']) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      preferences: DEFAULT_PREFERENCES,
      pushToken: null,
      permission: 'undetermined',
      setPreference: (category, enabled) =>
        set((s) => ({
          preferences: { ...s.preferences, [category]: CRITICAL_CATEGORIES.includes(category) ? true : enabled },
        })),
      setPushToken: (pushToken) => set({ pushToken }),
      setPermission: (permission) => set({ permission }),
    }),
    { name: STORAGE_KEYS.notificationPrefs, storage: asyncJSONStorage, partialize: (s) => ({ preferences: s.preferences }) },
  ),
);
