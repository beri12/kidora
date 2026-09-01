'use client';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

/** Skeleton block. aria-hidden so a screen reader announces the live region instead. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-2xl bg-brand-100/70', className)} />;
}

export function LoadingState({ label = 'Loading…', rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon = '📭',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-brand-200 bg-white/60 p-10 text-center">
      <div className="text-4xl" aria-hidden>{icon}</div>
      <h3 className="font-display font-extrabold text-lg text-brand-900 mt-3">{title}</h3>
      {description && <p className="font-body font-bold text-brand-500 text-sm mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * Error state. Deliberately shows a short human message and never a stack
 * trace or raw server payload.
 */
export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this right now. Please try again.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-3xl border-2 border-rose-200 bg-rose-50/70 p-8 text-center">
      <div className="text-3xl" aria-hidden>⚠️</div>
      <h3 className="font-display font-extrabold text-lg text-rose-700 mt-2">{title}</h3>
      <p className="font-body font-bold text-rose-500 text-sm mt-1">{description}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function PermissionDenied({ what = 'this page' }: { what?: string }) {
  return (
    <EmptyState
      icon="🔒"
      title="You do not have access"
      description={`Your account is not allowed to view ${what}. If you think that is wrong, ask your school administrator.`}
    />
  );
}
