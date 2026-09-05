"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { DashboardLayout, ChildSelector, Skeleton } from "@/components/dashboard";
import { parentNav } from "@/lib/nav";
import { useSelectedChild } from "./useSelectedChild";
import { useParentDashboard } from "@/lib/hooks/queries";

export function ParentShell({ children, header }: { children: ReactNode; header?: (ctx: { onMenu: () => void }) => ReactNode }) {
  const sel = useSelectedChild();
  const dash = useParentDashboard(sel.childId || undefined);
  const promo = (
    <div className="space-y-3">
      {sel.children.isPending ? <Skeleton className="h-16" /> : sel.children.data?.length ? <ChildSelector children={sel.children.data} value={sel.childId} onChange={sel.select} /> : null}
      <div className="rounded-2xl bg-gradient-to-b from-brand-50 to-pink-50 p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold"><Lightbulb size={14} className="text-brand-600" aria-hidden /> Parent Tips</p>
        <p className="mt-1 text-xs text-muted">Encourage daily practice. 10–20 minutes every day makes a big difference.</p>
        <Link href="/parent/support#tips" className="btn-secondary mt-3 w-full bg-white">View Tips</Link>
      </div>
    </div>
  );
  return <DashboardLayout nav={parentNav} badges={{ notifications: dash.data?.unreadNotifications, messages: dash.data?.messages.filter((m) => m.unread).length }} promo={promo} header={header}>{children}</DashboardLayout>;
}
