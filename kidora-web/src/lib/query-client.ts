import { QueryClient } from '@tanstack/react-query';

// Single shared client. TanStack Query caches server state so the UI
// stays fast and offline-friendly.
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
      mutations: { retry: 0 },
    },
  });
}
