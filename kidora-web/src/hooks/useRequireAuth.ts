'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import type { Role } from '@/types';

// Client-side route guard. Redirects unauthenticated users to /login and
// (optionally) enforces a role. Pair with backend guards — never trust the client alone.
export function useRequireAuth(allow?: Role[]) {
  const router = useRouter();
  const { user, hydrated } = useAuthStore();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.replace('/login'); return; }
    if (allow && !allow.includes(user.role)) router.replace('/dashboard');
  }, [user, hydrated, allow, router]);

  return user;
}
