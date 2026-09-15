'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { makeQueryClient } from '@/lib/query-client';

// The role dashboards (parent / school / student / teacher layouts) mount
// this directly rather than the full <Providers> tree in providers/index.tsx,
// because they only need TanStack Query — i18n is already provided higher up
// by the root layout.
//
// makeQueryClient runs inside useState so each browser session gets exactly
// one client that survives re-renders, and the server never shares a cache
// between requests.
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export default QueryProvider;
