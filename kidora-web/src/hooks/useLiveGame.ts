'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';
import { API_URL } from '@/lib/axios';

export interface Player { id: string; name: string; score: number; avatarColor: string; }
export interface GameState { players: Player[]; round: number; prompt?: string; status: 'lobby' | 'playing' | 'over'; }

const WS_URL = API_URL.replace(/\/api$/, '');

// Connects to a live multiplayer game room over socket.io.
// The NestJS gateway namespaces rooms by game slug and syncs state via Redis.
export function useLiveGame(gameSlug: string, roomId: string) {
  const token = useAuthStore((s) => s.accessToken);
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<GameState>({ players: [], round: 0, status: 'lobby' });

  useEffect(() => {
    const socket = io(`${WS_URL}/games`, {
      auth: { token },
      transports: ['websocket'],
      query: { game: gameSlug, room: roomId },
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('game:state', (s: GameState) => setState(s));
    socket.emit('game:join', { game: gameSlug, room: roomId });

    return () => { socket.emit('game:leave', { room: roomId }); socket.disconnect(); };
  }, [gameSlug, roomId, token]);

  const answer = useCallback((payload: unknown) => socketRef.current?.emit('game:answer', { room: roomId, payload }), [roomId]);
  const ready = useCallback(() => socketRef.current?.emit('game:ready', { room: roomId }), [roomId]);

  return { connected, state, answer, ready };
}
