import type { AiAskRequest, AiAskResponse, AiHistoryResponse, AiReportReason } from '@/types';

import { api } from './api';

/**
 * Kai, the AI tutor. Every request goes to the Kidora backend, which owns the
 * model keys, the child-safe system prompt, per-school daily limits and
 * logging. The app never talks to an AI provider directly.
 */
export const aiService = {
  ask: (body: AiAskRequest) => api.post<AiAskResponse>('/lms/ai/tutor', body),
  history: () => api.get<AiHistoryResponse>('/lms/ai/tutor/history'),
  /** API GAP #6: flag an AI reply for review by staff. */
  report: (messageId: string, reason: AiReportReason) => api.post<unknown>('/lms/ai/tutor/report', { messageId, reason }),
};
