'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { makeQueryClient } from '@/lib/query-client';
import { I18nProvider } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth.store';
import {
  setAuthTokenGetter,
  setAuthTokenRefresher,
  setSessionExpiredHandler,
} from '@/lib/api/client';

/**
 * Connects the fetch client in lib/api to the auth store.
 *
 * lib/api/client.ts ships with a no-op token getter, and nothing used to
 * replace it — so every /student, /teacher, /school and /parent request went
 * out with no Authorization header and came back 401 while the user was
 * plainly signed in. Installed at module scope rather than in an effect so the
 * first render's queries already carry the token.
 */
setAuthTokenGetter(() => useAuthStore.getState().accessToken);
setAuthTokenRefresher(() => useAuthStore.getState().refresh());

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);

  useEffect(() => {
    setSessionExpiredHandler(() => useAuthStore.getState().logout());

    // Any transition to signed-out — an explicit logout or a refresh that
    // failed — drops the cached server state, so the next user on this browser
    // can never be shown the previous user's dashboard from the query cache.
    let wasSignedIn = Boolean(useAuthStore.getState().accessToken);
    return useAuthStore.subscribe((state) => {
      const signedIn = Boolean(state.accessToken);
      if (wasSignedIn && !signedIn) client.clear();
      wasSignedIn = signedIn;
    });
  }, [client]);

  return (
    <QueryClientProvider client={client}>
      <I18nProvider>{children}</I18nProvider>
    </QueryClientProvider>
  );
}
