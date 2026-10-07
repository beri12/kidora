/** SecureStore keys — authentication material only lives here. */
export const SECURE_KEYS = {
  accessToken: 'kidora.auth.accessToken',
  refreshToken: 'kidora.auth.refreshToken',
  sessionMeta: 'kidora.auth.sessionMeta',
} as const;

/** AsyncStorage keys — non-sensitive data only (preferences, caches, queues). */
export const STORAGE_KEYS = {
  settings: 'kidora.settings.v1',
  game: 'kidora.game.v1',
  offlineQueue: 'kidora.offline.queue.v1',
  queryCache: 'kidora.query.cache.v1',
  notificationPrefs: 'kidora.notifications.v1',
  analyticsBuffer: 'kidora.analytics.buffer.v1',
} as const;
