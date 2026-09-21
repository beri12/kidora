'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';
import { API_URL } from '@/lib/axios';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  type?: string;
  attachmentUrl?: string | null;
  replyToId?: string | null;
  /** emoji -> the user ids that reacted with it. */
  reactions: Record<string, string[]>;
  editedAt?: string | null;
  deletedAt?: string | null;
  createdAt?: string;
}

const WS_URL = API_URL.replace(/\/api\/?$/, '');

/**
 * Live conversation over the /chat socket.io namespace.
 *
 * The socket is created once per (conversation, token) pair. Joining emits
 * chat:join, which the gateway answers with chat:history — so the transcript
 * is seeded from the server rather than kept in component state across
 * conversation switches.
 *
 * `reactions` is typed as Record<string, string[]> rather than left implicit
 * so Object.entries(...) in the UI yields string[] for the reactor list and
 * `.length` is a number, not an unknown.
 */
export function useChat(conversationId: string | null) {
  const token = useAuthStore((s) => s.accessToken);
  const me = useAuthStore((s) => s.user?.id ?? null);

  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [online, setOnline] = useState<string[]>([]);

  useEffect(() => {
    if (!conversationId || !token) {
      setMessages([]);
      setConnected(false);
      return;
    }

    const socket = io(`${WS_URL}/chat`, {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    const upsert = (msg: ChatMessage) =>
      setMessages((list) => {
        const i = list.findIndex((m) => m.id === msg.id);
        if (i === -1) return [...list, msg];
        const next = [...list];
        next[i] = { ...next[i], ...msg };
        return next;
      });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('chat:join', { conversationId });
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('chat:history', (p: { conversationId: string; messages: ChatMessage[] }) => {
      if (p.conversationId === conversationId) setMessages(p.messages ?? []);
    });
    socket.on('chat:message', upsert);
    socket.on('chat:edited', upsert);
    socket.on('chat:deleted', (p: { id: string }) =>
      setMessages((list) =>
        list.map((m) => (m.id === p.id ? { ...m, deletedAt: new Date().toISOString() } : m)),
      ),
    );
    socket.on('chat:reaction', (p: { id: string; reactions: Record<string, string[]> }) =>
      setMessages((list) => list.map((m) => (m.id === p.id ? { ...m, reactions: p.reactions } : m))),
    );

    socket.on('chat:typing', (p: { userId: string; typing: boolean }) =>
      setTypingUsers((users) =>
        p.typing ? (users.includes(p.userId) ? users : [...users, p.userId]) : users.filter((u) => u !== p.userId),
      ),
    );
    socket.on('chat:presence', (p: { userId: string; online: boolean }) =>
      setOnline((users) =>
        p.online ? (users.includes(p.userId) ? users : [...users, p.userId]) : users.filter((u) => u !== p.userId),
      ),
    );

    return () => {
      socket.off();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [conversationId, token]);

  const send = useCallback(
    (body: string) => {
      const text = body.trim();
      if (!text || !conversationId) return;
      socketRef.current?.emit('chat:message', { conversationId, body: text });
    },
    [conversationId],
  );

  const setTyping = useCallback(
    (typing: boolean) => {
      if (!conversationId) return;
      socketRef.current?.emit('chat:typing', { conversationId, typing });
    },
    [conversationId],
  );

  const react = useCallback(
    (messageId: string, emoji: string) => {
      if (!conversationId) return;
      socketRef.current?.emit('chat:react', { conversationId, messageId, emoji });
    },
    [conversationId],
  );

  const remove = useCallback(
    (messageId: string) => {
      if (!conversationId) return;
      socketRef.current?.emit('chat:delete', { conversationId, messageId });
    },
    [conversationId],
  );

  const markRead = useCallback(() => {
    if (!conversationId) return;
    socketRef.current?.emit('chat:read', { conversationId });
  }, [conversationId]);

  return { connected, messages, typingUsers, online, me, send, setTyping, react, remove, markRead };
}
