'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';
import { API_URL } from '@/lib/axios';

export interface ChatMessage {
  id: string; conversationId: string; senderId: string; body: string;
  type: string; attachmentUrl?: string | null; replyToId?: string | null;
  editedAt?: string | null; deletedAt?: string | null;
  reactions: Record<string, string[]>; readBy: string[]; createdAt: string;
}

const WS_URL = API_URL.replace(/\/api$/, '');

// Real-time chat connection to the NestJS /chat gateway.
// Handles history, live messages, typing indicators, presence, read receipts,
// reactions, edits and deletes — all Redis-synced across API instances.
export function useChat(conversationId: string | null) {
  const token = useAuthStore((s) => s.accessToken);
  const me = useAuthStore((s) => s.user?.id);
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [online, setOnline] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!token) return;
    const socket = io(`${WS_URL}/chat`, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('chat:history', (p: { conversationId: string; messages: ChatMessage[] }) => { if (p.conversationId === conversationId) setMessages(p.messages); });
    socket.on('chat:message', (m: ChatMessage) => { if (m.conversationId === conversationId) setMessages((x) => [...x, m]); });
    socket.on('chat:edited', (m: ChatMessage) => setMessages((x) => x.map((o) => o.id === m.id ? m : o)));
    socket.on('chat:deleted', (p: { id: string }) => setMessages((x) => x.map((o) => o.id === p.id ? { ...o, deletedAt: new Date().toISOString(), body: '' } : o)));
    socket.on('chat:reaction', (p: { id: string; reactions: Record<string, string[]> }) => setMessages((x) => x.map((o) => o.id === p.id ? { ...o, reactions: p.reactions } : o)));
    socket.on('chat:typing', (p: { userId: string; typing: boolean }) => setTypingUsers((u) => p.typing ? [...new Set([...u, p.userId])] : u.filter((id) => id !== p.userId)));
    socket.on('chat:presence', (p: { userId: string; online: boolean }) => setOnline((o) => ({ ...o, [p.userId]: p.online })));
    return () => { socket.disconnect(); };
  }, [token, conversationId]);

  useEffect(() => {
    const s = socketRef.current;
    if (s && connected && conversationId) { setMessages([]); s.emit('chat:join', { conversationId }); s.emit('chat:read', { conversationId }); }
  }, [connected, conversationId]);

  const send = useCallback((body: string, extra?: Partial<ChatMessage>) => {
    if (!conversationId || !body.trim()) return;
    socketRef.current?.emit('chat:message', { conversationId, body, type: extra?.type ?? 'text', attachmentUrl: extra?.attachmentUrl, replyToId: extra?.replyToId });
  }, [conversationId]);

  const setTyping = useCallback((typing: boolean) => { if (conversationId) socketRef.current?.emit('chat:typing', { conversationId, typing }); }, [conversationId]);
  const react = useCallback((messageId: string, emoji: string) => { if (conversationId) socketRef.current?.emit('chat:react', { conversationId, messageId, emoji }); }, [conversationId]);
  const edit = useCallback((messageId: string, body: string) => { if (conversationId) socketRef.current?.emit('chat:edit', { conversationId, messageId, body }); }, [conversationId]);
  const remove = useCallback((messageId: string) => { if (conversationId) socketRef.current?.emit('chat:delete', { conversationId, messageId }); }, [conversationId]);

  return { connected, messages, typingUsers, online, me, send, setTyping, react, edit, remove };
}
