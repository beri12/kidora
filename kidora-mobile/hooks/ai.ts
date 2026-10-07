import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { analytics } from '@/features/analytics/track';
import { qk } from '@/lib/query-keys';
import { aiService } from '@/services/ai.service';
import type { AIMessage, AiHistoryResponse, AiKind, AiReportReason } from '@/types';
import { localId } from '@/utils/id';

export interface AskOptions {
  kind?: AiKind;
  lessonId?: string;
  courseId?: string;
}

/**
 * Kai conversation. History is server state (never persisted to disk on the
 * device); the optimistic user bubble + "thinking" state are local.
 */
export function useAiTutor(context: { lessonId?: string; courseId?: string } = {}) {
  const qc = useQueryClient();
  const history = useQuery({ queryKey: qk.ai.history, queryFn: aiService.history, staleTime: 5 * 60_000 });
  const [remainingToday, setRemaining] = useState<number | null>(null);
  const [failed, setFailed] = useState<{ message: string; opts: AskOptions } | null>(null);

  const mutation = useMutation({
    mutationFn: ({ message, opts }: { message: string; opts: AskOptions }) =>
      aiService.ask({ message, kind: opts.kind ?? 'TUTOR', lessonId: opts.lessonId ?? context.lessonId, courseId: opts.courseId ?? context.courseId }),
    onMutate: ({ message }) => {
      setFailed(null);
      const optimistic: AIMessage = { id: localId('msg'), role: 'user', content: message, createdAt: new Date().toISOString(), pending: true };
      qc.setQueryData<AiHistoryResponse>(qk.ai.history, (prev) => ({
        items: [...(prev?.items ?? []), optimistic],
        page: 1,
        pageSize: prev?.pageSize ?? 50,
        total: (prev?.total ?? 0) + 1,
      }));
      return { optimisticId: optimistic.id };
    },
    onSuccess: (res, _v, ctx) => {
      setRemaining(res.remainingToday);
      qc.setQueryData<AiHistoryResponse>(qk.ai.history, (prev) => {
        const items = (prev?.items ?? []).map((m) => (m.id === ctx?.optimisticId ? { ...m, pending: false } : m));
        return { items: [...items, res.reply], page: 1, pageSize: prev?.pageSize ?? 50, total: items.length + 1 };
      });
    },
    onError: (_e, v, ctx) => {
      setFailed(v);
      qc.setQueryData<AiHistoryResponse>(qk.ai.history, (prev) =>
        prev ? { ...prev, items: prev.items.map((m) => (m.id === ctx?.optimisticId ? { ...m, pending: false, failed: true } : m)) } : prev,
      );
    },
  });

  const ask = useCallback(
    (message: string, opts: AskOptions = {}) => {
      const trimmed = message.trim().slice(0, 2000);
      if (!trimmed || mutation.isPending) return;
      analytics.track('ai_question_asked', { kind: opts.kind ?? 'TUTOR' });
      mutation.mutate({ message: trimmed, opts });
    },
    [mutation],
  );

  const retry = useCallback(() => {
    if (failed) mutation.mutate(failed);
  }, [failed, mutation]);

  const report = useMutation({
    mutationFn: ({ messageId, reason }: { messageId: string; reason: AiReportReason }) => aiService.report(messageId, reason),
  });

  return {
    messages: history.data?.items ?? [],
    isLoadingHistory: history.isLoading,
    historyError: history.error,
    ask,
    retry,
    isThinking: mutation.isPending,
    error: mutation.error,
    remainingToday,
    report,
  };
}
