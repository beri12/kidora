"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { aiApi } from "@/lib/api/ai";

export const aiKeys = { history: ["ai", "history"] as const };

/**
 * Asks Kai a question. Exposed as a bare mutation because the chat page drives
 * its own transcript and calls `ai.mutate(text, { onSuccess })`.
 */
export function useAITutor() {
  return useMutation({ mutationFn: (message: string) => aiApi.ask(message) });
}

/** Past conversations, for restoring the transcript. */
export function useAIHistory() {
  return useQuery({ queryKey: aiKeys.history, queryFn: aiApi.history, staleTime: 5 * 60_000 });
}
