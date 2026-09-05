"use client";
import { cn } from "./cn";
import type { ReactNode } from "react";
import { Inbox, AlertTriangle, RefreshCw } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import Link from "next/link";

export function EmptyState({ title, body, action, icon, className }: { title: string; body?: string; action?: { label: string; href?: string; onClick?: () => void }; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center", className)}>
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">{icon ?? <Inbox size={22} />}</div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {body && <p className="mt-1 max-w-xs text-xs text-muted">{body}</p>}
      {action && (action.href
        ? <Link href={action.href} className="btn-primary mt-4">{action.label}</Link>
        : <button type="button" onClick={action.onClick} className="btn-primary mt-4">{action.label}</button>)}
    </div>
  );
}

export function ErrorState({ error, retry, className }: { error: unknown; retry?: () => void; className?: string }) {
  const msg = error instanceof ApiError ? error.message : "Something went wrong loading this.";
  const forbidden = error instanceof ApiError && error.isForbidden;
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center rounded-2xl bg-danger-50/60 px-6 py-10 text-center", className)}>
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white text-danger-600 shadow-sm"><AlertTriangle size={22} /></div>
      <p className="text-sm font-semibold text-ink">{forbidden ? "You don't have access to this" : "Couldn't load this"}</p>
      <p className="mt-1 max-w-xs text-xs text-muted">{msg}</p>
      {retry && !forbidden && <button type="button" onClick={retry} className="btn-secondary mt-4"><RefreshCw size={14} /> Try again</button>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xl bg-slate-100", className)} />;
}

export function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-white p-5 shadow-card ring-1 ring-black/[0.04]", className)}>
      <Skeleton className="h-4 w-1/3" />
      <div className="mt-4 space-y-3">{Array.from({ length: lines }).map((_, i) => <Skeleton key={i} className="h-3.5 w-full" />)}</div>
    </div>
  );
}

export function DashboardSkeleton({ kpis = 5 }: { kpis?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: kpis }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-72" /><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
      <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
    </div>
  );
}
