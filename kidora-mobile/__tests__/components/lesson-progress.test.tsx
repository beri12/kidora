import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useCompleteLesson } from '@/hooks/lms';
import { networkState } from '@/lib/network-state';
import { lessonService } from '@/services/lesson.service';
import { useGameStore } from '@/store/gameStore';
import { useOfflineStore } from '@/store/offlineStore';

jest.mock('@/services/lesson.service', () => ({ lessonService: { complete: jest.fn(), saveProgress: jest.fn() } }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('lesson completion → XP → celebration', () => {
  beforeEach(() => {
    networkState.set(true);
    useGameStore.getState().reset();
    useOfflineStore.setState({ queue: [] });
  });

  it('online: awards XP and queues level-up + achievement celebrations', async () => {
    jest.mocked(lessonService.complete).mockResolvedValue({
      rewards: { xp: 20, coins: 5, leveledUp: true, newLevel: 8, unlockedAchievements: ['Quarter Master'], completedQuests: [] },
      completion: { complete: false },
      certificate: null,
    });
    const { result } = await renderHook(() => useCompleteLesson(), { wrapper });
    await act(() => result.current.mutate({ lessonId: 'l4', courseId: 'c1', timeSpentSec: 300 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(lessonService.complete).toHaveBeenCalledWith('l4', 300);
    expect(useGameStore.getState().celebrations.map((c) => c.kind)).toEqual(['xp', 'level_up', 'achievement']);
  });

  it('offline: queues the completion instead of losing it', async () => {
    networkState.set(false);
    const { result } = await renderHook(() => useCompleteLesson(), { wrapper });
    await act(() => result.current.mutate({ lessonId: 'l4', courseId: 'c1', timeSpentSec: 300 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ queued: true });
    expect(useOfflineStore.getState().queue[0]?.action).toMatchObject({ type: 'lesson.complete', lessonId: 'l4' });
    expect(lessonService.complete).not.toHaveBeenCalled();
  });
});
