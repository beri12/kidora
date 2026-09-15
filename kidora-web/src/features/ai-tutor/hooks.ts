'use client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface TutorReply {
  answer: string;
  suggestions?: string[];
}

export interface TutorHistoryEntry {
  id: string;
  message: string;
  answer: string;
  createdAt: string;
}

/**
 * Asks Kai a question — POST /api/ai/chat.
 *
 * A mutation rather than a query: each message is a distinct action with a
 * side effect (it is stored in the tutor history), and the page drives the
 * transcript from its own state via onSuccess.
 */
export function useAITutor() {
  return useMutation<TutorReply, unknown, string>({
    mutationFn: async (message: string) =>
      (await api.post<TutorReply>('/ai/chat', { message })).data,
  });
}

export function useAITutorHistory() {
  return useQuery({
    queryKey: ['ai', 'history'],
    queryFn: async () => (await api.get<TutorHistoryEntry[]>('/ai/chat/history')).data,
  });
}
