"use client";
import type { ReactNode } from "react";
import { DashboardLayout } from "@/components/dashboard";
import { schoolNav } from "@/lib/nav";
import { useSchoolDashboard } from "@/lib/hooks/queries";

export function SchoolShell({ children, header }: { children: ReactNode; header?: (ctx: { onMenu: () => void }) => ReactNode }) {
  const { data } = useSchoolDashboard();
  const promo = data ? (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="truncate text-sm font-semibold">{data.school.name}</p>
      <p className="mt-0.5 text-xs text-muted">{data.school.plan[0].toUpperCase() + data.school.plan.slice(1)} plan</p>
    </div>
  ) : null;
  return <DashboardLayout nav={schoolNav} badges={{ notifications: data?.unreadNotifications }} promo={promo} header={header}>{children}</DashboardLayout>;
}
