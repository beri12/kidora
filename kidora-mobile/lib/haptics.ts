import * as Haptics from 'expo-haptics';

import { useSettingsStore } from '@/store/settingsStore';

/** Haptics that respect the user's "Vibration feedback" setting and never throw. */
function allowed(): boolean {
  return useSettingsStore.getState().haptics;
}

export const haptics = {
  tap(): void {
    if (allowed()) Haptics.selectionAsync().catch(() => undefined);
  },
  press(): void {
    if (allowed()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  },
  success(): void {
    if (allowed()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  },
  error(): void {
    if (allowed()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
  },
  reward(): void {
    if (!allowed()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
  },
};
