import * as Notifications from 'expo-notifications';
import { go } from '@/lib/navigation';
import { useEffect, useRef, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';

import { configureNotificationHandler, registerForPush, syncLessonReminder } from '@/features/notifications/push';
import { routeForPayload } from '@/features/notifications/routing';
import { logger } from '@/lib/logger';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import type { PushPayload } from '@/types';

// Push is a native capability; the web preview skips it entirely.
const PUSH_SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

if (PUSH_SUPPORTED) configureNotificationHandler();

/**
 * Push registration (after sign-in only) and tap routing. A tap that
 * arrives before the session is restored is held until the user is known.
 */
export function NotificationsProvider({ children }: PropsWithChildren) {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const reminders = useNotificationStore((s) => s.preferences.lesson_reminder);
  const pending = useRef<PushPayload | null>(null);

  useEffect(() => {
    if (!PUSH_SUPPORTED || status !== 'authenticated') return;
    registerForPush().catch((e: unknown) => logger.debug('push registration skipped', e));
  }, [status]);

  useEffect(() => {
    if (!PUSH_SUPPORTED || status !== 'authenticated' || user?.role !== 'STUDENT') return;
    syncLessonReminder(reminders).catch(() => undefined);
  }, [status, user?.role, reminders]);

  const route = (payload: PushPayload) => {
    const role = useAuthStore.getState().user?.role;
    if (!role) {
      pending.current = payload;
      return;
    }
    go(routeForPayload(payload, role));
  };

  useEffect(() => {
    if (user && pending.current) {
      const p = pending.current;
      pending.current = null;
      go(routeForPayload(p, user.role));
    }
  }, [user]);

  useEffect(() => {
    if (!PUSH_SUPPORTED) return undefined;
    try {
      const last = Notifications.getLastNotificationResponse();
      if (last) route((last.notification.request.content.data ?? {}) as PushPayload);
    } catch (e) {
      logger.debug('no launch notification', e);
    }
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      route((res.notification.request.content.data ?? {}) as PushPayload);
    });
    return () => sub.remove();
  }, []);

  return <>{children}</>;
}
