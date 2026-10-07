import type { NotificationPage } from '@/types';

import { api } from './api';

export const notificationService = {
  list: (page = 1) => api.get<NotificationPage>('/lms/notifications', { page }),
  markRead: (id: string) => api.patch<{ ok: boolean }>(`/lms/notifications/${id}/read`),
  markAllRead: () => api.patch<{ ok: boolean }>('/lms/notifications/read-all'),
  /** API GAP #4: register this device's Expo push token. */
  registerPushToken: (body: { token: string; platform: string; locale: string }) =>
    api.post<unknown>('/notifications/push-tokens', body),
  /** API GAP #4. */
  unregisterPushToken: (token: string) => api.delete<unknown>(`/notifications/push-tokens/${encodeURIComponent(token)}`),
};
