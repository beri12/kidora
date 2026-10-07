import { onlineManager, useQueryClient } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useEffect, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { flushAnalytics } from '@/features/analytics/track';
import { flushQueue, onSyncSuccess } from '@/features/offline/sync';
import { networkState } from '@/lib/network-state';
import { qk } from '@/lib/query-keys';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { useOfflineStore } from '@/store/offlineStore';
import type { LessonCompleteResponse } from '@/types';

function isReachable(s: Network.NetworkState): boolean {
  // isInternetReachable is null while unknown: treat unknown as online.
  return !!s.isConnected && s.isInternetReachable !== false;
}

/**
 * Connectivity → TanStack onlineManager, offline store and the sync engine.
 * When the device comes back online the offline queue drains automatically.
 */
export function NetworkProvider({ children }: PropsWithChildren) {
  const qc = useQueryClient();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    const apply = (online: boolean) => {
      networkState.set(online);
      useOfflineStore.getState().setOnline(online);
      onlineManager.setOnline(online);
      if (online && useAuthStore.getState().status === 'authenticated') {
        void flushQueue();
        void flushAnalytics();
      }
    };
    Network.getNetworkStateAsync()
      .then((s) => apply(isReachable(s)))
      .catch(() => undefined);
    const sub = Network.addNetworkStateListener((s) => apply(isReachable(s)));
    const app = AppState.addEventListener('change', (s) => {
      if (s === 'active' && networkState.isOnline() && useAuthStore.getState().status === 'authenticated') void flushQueue();
      if (s === 'background') void flushAnalytics();
    });
    return () => {
      sub.remove();
      app.remove();
    };
  }, []);

  // Drain anything left from a previous session once signed in.
  useEffect(() => {
    if (status === 'authenticated') void flushQueue();
  }, [status]);

  // Replayed lesson completions: play the rewards the student earned offline.
  useEffect(
    () =>
      onSyncSuccess((item, result) => {
        if (item.action.type === 'lesson.complete') {
          const res = result as LessonCompleteResponse | undefined;
          if (res?.rewards) useGameStore.getState().celebrate(res.rewards);
          useGameStore.getState().clearPendingXp();
          void qc.invalidateQueries({ queryKey: qk.student.all });
          void qc.invalidateQueries({ queryKey: qk.world });
        }
      }),
    [qc],
  );

  return <>{children}</>;
}
