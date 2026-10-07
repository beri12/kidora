import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';

import { STORAGE_KEYS } from '@/constants/storage-keys';

import { isApiError } from './errors';

/**
 * Server-state cache.
 *  - offlineFirst: serve cached data immediately, refetch when possible
 *  - long gcTime so cached lessons/dashboards survive offline sessions
 *  - never retry 4xx (wasted data on metered connections)
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        networkMode: 'offlineFirst',
        staleTime: 60_000,
        gcTime: 1000 * 60 * 60 * 24 * 3,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (isApiError(error) && !error.retryable) return false;
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15_000),
      },
      mutations: {
        networkMode: 'offlineFirst',
        retry: false,
      },
    },
  });
}

/** Persist the query cache (non-sensitive server data) for offline launches. */
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: STORAGE_KEYS.queryCache,
  throttleTime: 2_000,
});

/** Only persist what's useful offline; never auth-adjacent or AI conversation data. */
const PERSISTED_ROOTS = new Set(['student', 'world', 'lesson', 'course', 'parent', 'teacher', 'school', 'notifications']);

export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  return typeof queryKey[0] === 'string' && PERSISTED_ROOTS.has(queryKey[0]);
}

/** Bump to discard all persisted caches after a breaking contract change. */
export const CACHE_BUSTER = 'v1';
