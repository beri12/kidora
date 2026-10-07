import { flushQueue, onSyncSuccess, runOrQueue } from '@/features/offline/sync';
import { networkState } from '@/lib/network-state';
import { tokenStorage } from '@/lib/secure-storage';
import { useOfflineStore } from '@/store/offlineStore';

import { mockBackend } from '@/test-utils/mockBackend';

describe('offline sync: LOCAL ACTION → QUEUE → NETWORK → API → SUCCESS → REMOVE', () => {
  beforeEach(async () => {
    useOfflineStore.setState({ queue: [], isSyncing: false, isOnline: true });
    networkState.set(true);
    await tokenStorage.setTokens({ accessToken: 'A', refreshToken: 'R' });
  });

  it('queues a lesson completion while offline and never loses it', async () => {
    networkState.set(false);
    const res = await runOrQueue({ type: 'lesson.complete', lessonId: 'l1', courseId: 'c1', timeSpentSec: 120 });
    expect(res).toEqual({ queued: true });
    expect(useOfflineStore.getState().queue).toHaveLength(1);
  });

  it('flushes the queue when the network returns and removes synced items', async () => {
    networkState.set(false);
    await runOrQueue({ type: 'lesson.complete', lessonId: 'l1', courseId: 'c1', timeSpentSec: 120 });
    await runOrQueue({ type: 'lesson.progress', lessonId: 'l2', percent: 40, timeSpentSec: 30 });
    const calls = mockBackend(() => ({ status: 201, data: { rewards: { xp: 20, coins: 5, leveledUp: false, newLevel: 2, unlockedAchievements: [], completedQuests: [] } } }));
    const seen = jest.fn();
    const off = onSyncSuccess(seen);
    networkState.set(true);
    await expect(flushQueue()).resolves.toBe(2);
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(['POST /learning/lessons/l1/complete', 'POST /learning/lessons/l2/progress']);
    expect(useOfflineStore.getState().queue).toHaveLength(0);
    expect(seen).toHaveBeenCalledTimes(2);
    off();
  });

  it('coalesces progress saves for the same lesson (furthest percent, summed time)', () => {
    const s = useOfflineStore.getState();
    s.enqueue({ type: 'lesson.progress', lessonId: 'l1', percent: 30, timeSpentSec: 20 });
    s.enqueue({ type: 'lesson.progress', lessonId: 'l1', percent: 20, timeSpentSec: 15 });
    const q = useOfflineStore.getState().queue;
    expect(q).toHaveLength(1);
    expect(q[0]?.action).toEqual({ type: 'lesson.progress', lessonId: 'l1', percent: 30, timeSpentSec: 35 });
  });

  it('keeps items with backoff on transient errors', async () => {
    useOfflineStore.getState().enqueue({ type: 'lesson.complete', lessonId: 'l1', courseId: 'c1', timeSpentSec: 1 });
    mockBackend(() => ({ status: 503, data: {} }));
    await expect(flushQueue()).resolves.toBe(0);
    const [item] = useOfflineStore.getState().queue;
    expect(item?.attempts).toBe(1);
    expect(item?.nextAttemptAt).toBeGreaterThan(Date.now());
  });

  it('drops actions the server permanently rejects (e.g. lesson unpublished)', async () => {
    useOfflineStore.getState().enqueue({ type: 'content.complete', contentItemId: 'gone' });
    mockBackend(() => ({ status: 404, data: {} }));
    await flushQueue();
    expect(useOfflineStore.getState().queue).toHaveLength(0);
  });

  it('runs immediately when online and queues on a transient failure', async () => {
    mockBackend(() => 'network');
    await expect(runOrQueue({ type: 'notification.read', notificationId: 'n1' })).resolves.toEqual({ queued: true });
    mockBackend(() => ({ status: 200, data: { ok: true } }));
    await expect(runOrQueue({ type: 'notification.read', notificationId: 'n2' })).resolves.toEqual({ queued: false, result: { ok: true } });
  });
});
