import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useState, type PropsWithChildren } from 'react';

import { CACHE_BUSTER, createQueryClient, queryPersister, shouldPersistQuery } from '@/lib/query-client';

export function QueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(createQueryClient);
  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister: queryPersister,
        buster: CACHE_BUSTER,
        maxAge: 1000 * 60 * 60 * 24 * 3,
        dehydrateOptions: {
          shouldDehydrateQuery: (q) => q.state.status === 'success' && shouldPersistQuery(q.queryKey),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
