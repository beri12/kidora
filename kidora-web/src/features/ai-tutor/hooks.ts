import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { api, API_URL } from '@/lib/axios';
import { useAuthStore } from '@/stores/auth.store';

export interface TutorReply { answer: string; suggestions: string[]; recommendedLessons: { id: string; title: string; slug: string }[]; }

// Non-streaming: full reply + suggestions + recommended lessons.
export function useAITutor() {
  return useMutation({
    mutationFn: async (message: string) => (await api.post<TutorReply>('/ai/chat', { message })).data,
  });
}

export function useAIHistory() {
  return useQuery({ queryKey: ['ai-history'], queryFn: async () => (await api.get('/ai/chat/history')).data });
}

// Streaming: tokens arrive live via SSE from POST /ai/chat/stream.
export function useAITutorStream() {
  const token = useAuthStore((s) => s.accessToken);
  const [text, setText] = useState('');
  const [streaming, setStreaming] = useState(false);

  const ask = useCallback(async (message: string, onDone?: (full: string) => void) => {
    setText(''); setStreaming(true);
    let full = '';
    const res = await fetch(`${API_URL}/ai/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message }),
    });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value).split('\n')) {
        const t = line.replace(/^data: /, '').trim();
        if (!t || t === '[DONE]') continue;
        try { const tok = JSON.parse(t).token; if (tok) { full += tok; setText(full); } } catch {}
      }
    }
    setStreaming(false);
    onDone?.(full);
  }, [token]);

  return { text, streaming, ask };
}
