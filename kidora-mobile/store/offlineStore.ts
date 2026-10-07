import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { localId } from '@/utils/id';

import { asyncJSONStorage } from './storage';

/**
 * Offline action queue: LOCAL ACTION → QUEUE → NETWORK AVAILABLE → API →
 * SUCCESS → REMOVE FROM QUEUE. Only idempotent, replay-safe actions are
 * queued (the backend dedupes lesson rewards by lesson+student, and progress
 * only moves forward). Persisted so progress survives an app kill.
 */
export type QueuedAction =
  | { type: 'lesson.progress'; lessonId: string; percent: number; timeSpentSec: number }
  | { type: 'lesson.complete'; lessonId: string; courseId: string; timeSpentSec: number }
  | { type: 'content.complete'; contentItemId: string }
  | { type: 'notification.read'; notificationId: string };

export interface QueueItem {
  id: string;
  action: QueuedAction;
  createdAt: number;
  attempts: number;
  lastError?: string;
  /** epoch ms before which the item must not be retried (backoff) */
  nextAttemptAt: number;
}

export const MAX_ATTEMPTS = 8;

interface OfflineState {
  queue: QueueItem[];
  isOnline: boolean;
  isSyncing: boolean;
  enqueue: (action: QueuedAction) => QueueItem;
  remove: (id: string) => void;
  markFailed: (id: string, error: string) => void;
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  clear: () => void;
}

/** Coalescing key: a newer progress save for the same lesson replaces the older one. */
function coalesceKey(a: QueuedAction): string | null {
  if (a.type === 'lesson.progress') return `progress:${a.lessonId}`;
  if (a.type === 'lesson.complete') return `complete:${a.lessonId}`;
  if (a.type === 'content.complete') return `content:${a.contentItemId}`;
  if (a.type === 'notification.read') return `read:${a.notificationId}`;
  return null;
}

export function backoffMs(attempts: number): number {
  return Math.min(5 * 60_000, 2_000 * 2 ** attempts);
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      queue: [],
      isOnline: true,
      isSyncing: false,
      enqueue: (action) => {
        const key = coalesceKey(action);
        const item: QueueItem = { id: localId('q'), action, createdAt: Date.now(), attempts: 0, nextAttemptAt: 0 };
        set((s) => {
          let queue = s.queue;
          if (key) {
            const existing = queue.find((q) => coalesceKey(q.action) === key);
            if (existing && action.type === 'lesson.progress' && existing.action.type === 'lesson.progress') {
              // Merge: keep the furthest percent, sum the time.
              item.action = {
                ...action,
                percent: Math.max(action.percent, existing.action.percent),
                timeSpentSec: action.timeSpentSec + existing.action.timeSpentSec,
              };
            }
            queue = queue.filter((q) => coalesceKey(q.action) !== key);
          }
          return { queue: [...queue, item] };
        });
        return get().queue.find((q) => q.id === item.id) ?? item;
      },
      remove: (id) => set((s) => ({ queue: s.queue.filter((q) => q.id !== id) })),
      markFailed: (id, error) =>
        set((s) => ({
          queue: s.queue
            .map((q) =>
              q.id === id
                ? { ...q, attempts: q.attempts + 1, lastError: error, nextAttemptAt: Date.now() + backoffMs(q.attempts + 1) }
                : q,
            )
            // Give up only after many attempts — but never silently for lesson completions.
            .filter((q) => q.attempts < MAX_ATTEMPTS || q.action.type === 'lesson.complete'),
        })),
      setOnline: (isOnline) => set({ isOnline }),
      setSyncing: (isSyncing) => set({ isSyncing }),
      clear: () => set({ queue: [] }),
    }),
    {
      name: STORAGE_KEYS.offlineQueue,
      storage: asyncJSONStorage,
      partialize: (s) => ({ queue: s.queue }),
    },
  ),
);
