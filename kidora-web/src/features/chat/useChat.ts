"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/auth.store";
import { API_ORIGIN } from "@/lib/api/client";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  type?: string;
  attachmentUrl?: string | null;
  /** emoji -> user ids. Always an object so callers can Object.entries it. */
  reactions: Record<string, string[]>;
  editedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
}

/**
 * Live conversation over the ChatGateway (namespace "/chat").
 *
 * Event names mirror the gateway exactly: chat:join / chat:history /
 * chat:message / chat:typing / chat:react / chat:delete. The socket
 * authenticates with the same access token as the REST calls, so the gateway
 * resolves the same user and its room checks apply.
 */
export function useChat(conversationId: string | null) {
  const token = useAuthStore((s) => s.accessToken);
  const me = useAuthStore((s) => s.user?.id) ?? null;

  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [online, setOnline] = useState<string[]>([]);

  useEffect(() => {
    if (!token) return;

    const socket = io(`${API_ORIGIN}/chat`, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("chat:history", (p: { conversationId: string; messages: ChatMessage[] }) => {
      // Ignore history for a conversation the user has already switched away from.
      if (p.conversationId === conversationId) {
        setMessages(p.messages.map((m) => ({ ...m, reactions: m.reactions ?? {} })));
      }
    });

    const normalise = (m: ChatMessage): ChatMessage => ({ ...m, reactions: m.reactions ?? {} });

    socket.on("chat:message", (m: ChatMessage) => {
      const msg = normalise(m);
      setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
    });

    socket.on("chat:edited", (m: ChatMessage) =>
      setMessages((prev) => prev.map((x) => (x.id === m.id ? normalise(m) : x))),
    );

    socket.on("chat:deleted", (p: { id: string }) =>
      setMessages((prev) => prev.filter((x) => x.id !== p.id)),
    );

    socket.on("chat:reaction", (p: { id: string; reactions: Record<string, string[]> }) =>
      setMessages((prev) => prev.map((x) => (x.id === p.id ? { ...x, reactions: p.reactions } : x))),
    );

    socket.on("chat:typing", (p: { userId: string; typing: boolean }) =>
      setTypingUsers((prev) =>
        p.typing ? (prev.includes(p.userId) ? prev : [...prev, p.userId]) : prev.filter((u) => u !== p.userId),
      ),
    );

    socket.on("chat:presence", (p: { userId: string; online: boolean }) =>
      setOnline((prev) =>
        p.online ? (prev.includes(p.userId) ? prev : [...prev, p.userId]) : prev.filter((u) => u !== p.userId),
      ),
    );

    return () => { socket.close(); socketRef.current = null; };
  }, [token, conversationId]);

  // Joining is separate from connecting so switching conversation does not
  // tear the socket down.
  useEffect(() => {
    if (!conversationId || !socketRef.current) return;
    setMessages([]);
    setTypingUsers([]);
    socketRef.current.emit("chat:join", { conversationId });
  }, [conversationId, connected]);

  const send = useCallback((body: string) => {
    const text = body.trim();
    if (!text || !conversationId) return;
    socketRef.current?.emit("chat:message", { conversationId, body: text });
  }, [conversationId]);

  const setTyping = useCallback((typing: boolean) => {
    if (!conversationId) return;
    socketRef.current?.emit("chat:typing", { conversationId, typing });
  }, [conversationId]);

  const react = useCallback((id: string, emoji: string) => {
    if (!conversationId) return;
    socketRef.current?.emit("chat:react", { conversationId, id, emoji });
  }, [conversationId]);

  const remove = useCallback((id: string) => {
    if (!conversationId) return;
    socketRef.current?.emit("chat:delete", { conversationId, id });
  }, [conversationId]);

  const markRead = useCallback(() => {
    if (!conversationId) return;
    socketRef.current?.emit("chat:read", { conversationId });
  }, [conversationId]);

  return { connected, messages, typingUsers, online, me, send, setTyping, react, remove, markRead };
}
