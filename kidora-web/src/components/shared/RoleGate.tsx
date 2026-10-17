'use client';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { usePremiumAccess } from '@/features/pricing/usePremiumAccess';
import type { Role } from '@/types';

// Renders children only if the current user's role is allowed.
export function RoleGate({ allow, children, fallback = null }: { allow: Role[]; children: ReactNode; fallback?: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user || !allow.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
}

// Gates premium content behind an active subscription, or the open pilot.
export function PremiumGate({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const hasAccess = usePremiumAccess();
  return <>{hasAccess ? children : fallback}</>;
}
