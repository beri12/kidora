import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getLocale } from '@/i18n';
import { logger } from '@/lib/logger';
import { notificationService } from '@/services/notification.service';
import { useNotificationStore } from '@/store/notificationStore';
import type { PushPayload } from '@/types';

import { categoryFor } from './routing';

/**
 * Foreground presentation honours the user's per-category preferences.
 * (Server-side filtering is the long-term home for this — API GAP #4.)
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const data = (n.request.content.data ?? {}) as PushPayload;
      const category = categoryFor(data.type);
      const prefs = useNotificationStore.getState().preferences;
      const show = category ? prefs[category] : true;
      return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: false, shouldSetBadge: show };
    },
  });
}

export async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Kidora',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200, 120, 200],
  });
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Learning reminders',
    importance: Notifications.AndroidImportance.LOW,
  });
}

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Ask for permission (only after sign-in, never on first launch), fetch the
 * Expo push token and register it with the backend.
 */
export async function registerForPush(): Promise<string | null> {
  const store = useNotificationStore.getState();
  if (!Device.isDevice) return null;
  await ensureAndroidChannels();

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted' && current.canAskAgain) {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  store.setPermission(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined');
  if (status !== 'granted') return null;

  const id = projectId();
  if (!id) {
    logger.warn('No EAS projectId configured; push token unavailable');
    return null;
  }
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    store.setPushToken(token);
    await notificationService
      .registerPushToken({ token, platform: Platform.OS, locale: getLocale() })
      .catch((e: unknown) => logger.debug('push token registration deferred (API GAP #4)', e));
    return token;
  } catch (e) {
    logger.warn('push token failed', e);
    return null;
  }
}

export async function unregisterPush(): Promise<void> {
  if (Platform.OS === 'web') return;
  const token = useNotificationStore.getState().pushToken;
  if (!token) return;
  await notificationService.unregisterPushToken(token).catch(() => undefined);
  useNotificationStore.getState().setPushToken(null);
}

const REMINDER_ID = 'kidora-daily-lesson-reminder';

/** Local daily reminder — works offline and needs no backend. */
export async function syncLessonReminder(enabled: boolean, hour = 17, minute = 0): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => undefined);
  if (!enabled) return;
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: 'Kidora',
      body: '🏝️ Your island is waiting! Keep your streak going.',
      data: { type: 'lesson_reminder' } satisfies PushPayload,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: 'reminders' },
  });
}
