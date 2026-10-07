import { isApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { networkState } from '@/lib/network-state';
import { lessonService } from '@/services/lesson.service';
import { notificationService } from '@/services/notification.service';
import { useOfflineStore, type QueuedAction, type QueueItem } from '@/store/offlineStore';

/** Execute one queued action against the API. */
export async function executeAction(action: QueuedAction): Promise<unknown> {
  switch (action.type) {
    case 'lesson.progress':
      return lessonService.saveProgress(action.lessonId, { percent: action.percent, timeSpentSec: action.timeSpentSec });
    case 'lesson.complete':
      return lessonService.complete(action.lessonId, action.timeSpentSec);
    case 'content.complete':
      return lessonService.completeContent(action.contentItemId);
    case 'notification.read':
      return notificationService.markRead(action.notificationId);
  }
}

type SyncListener = (item: QueueItem, result: unknown) => void;
const successListeners = new Set<SyncListener>();

/** Lets the query layer refresh caches / play rewards after a replayed action lands. */
export function onSyncSuccess(listener: SyncListener): () => void {
  successListeners.add(listener);
  return () => successListeners.delete(listener);
}

let running: Promise<number> | null = null;

/**
 * Drain the queue in FIFO order. Returns how many items were synced.
 *
 * - Retryable failures (network, timeout, 5xx, 429) stay queued with backoff.
 * - Permanent 4xx failures (e.g. the lesson was unpublished) are dropped —
 *   retrying can never succeed — except 401, which waits for re-login.
 */
export function flushQueue(now: () => number = Date.now): Promise<number> {
  if (running) return running;
  running = (async () => {
    const store = useOfflineStore.getState();
    if (!networkState.isOnline() || store.queue.length === 0) return 0;
    store.setSyncing(true);
    let synced = 0;
    try {
      for (const item of [...useOfflineStore.getState().queue]) {
        if (item.nextAttemptAt > now()) continue;
        if (!networkState.isOnline()) break;
        try {
          const result = await executeAction(item.action);
          useOfflineStore.getState().remove(item.id);
          synced += 1;
          successListeners.forEach((l) => l(item, result));
        } catch (e) {
          if (isApiError(e) && !e.retryable && e.kind !== 'unauthorized') {
            logger.warn('Dropping unreplayable queued action', { type: item.action.type, kind: e.kind });
            useOfflineStore.getState().remove(item.id);
          } else {
            useOfflineStore.getState().markFailed(item.id, isApiError(e) ? e.kind : 'unknown');
            if (isApiError(e) && (e.kind === 'offline' || e.kind === 'network')) break;
          }
        }
      }
    } finally {
      useOfflineStore.getState().setSyncing(false);
      running = null;
    }
    return synced;
  })();
  return running;
}

/**
 * Run an action now if possible; queue it if offline or the request fails
 * transiently. Resolves with the API result, or `{ queued: true }`.
 */
export async function runOrQueue<T>(action: QueuedAction): Promise<{ queued: false; result: T } | { queued: true }> {
  if (!networkState.isOnline()) {
    useOfflineStore.getState().enqueue(action);
    return { queued: true };
  }
  try {
    const result = (await executeAction(action)) as T;
    return { queued: false, result };
  } catch (e) {
    if (isApiError(e) && e.retryable) {
      useOfflineStore.getState().enqueue(action);
      return { queued: true };
    }
    throw e;
  }
}
