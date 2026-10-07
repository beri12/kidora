import type { AnalyticsEvent } from '@/types';

import { api } from './api';

export const analyticsService = {
  /** API GAP #5: batch product-analytics ingestion. */
  sendBatch: (events: AnalyticsEvent[]) => api.post<unknown>('/analytics/events', { events }),
};
