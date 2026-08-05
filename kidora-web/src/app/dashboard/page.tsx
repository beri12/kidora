'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { ROLE_HOME } from '@/constants';

// /dashboard → send each role to its own dashboard.
export default function DashboardRouter() {
  const router = useRouter();
  const { user, hydrated } = useAuthStore();
  useEffect(() => {
    if (!hydrated) return;
    router.replace(user ? ROLE_HOME[user.role] : '/login');
  }, [user, hydrated, router]);
  return <div className="min-h-screen grid place-items-center font-display text-brand-600">Loading your dashboard…</div>;
}
