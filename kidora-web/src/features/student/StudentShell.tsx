"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard";
import { studentNav } from "@/lib/nav";
import { useStudentDashboard } from "@/lib/hooks/queries";

/** Shared shell for every /student/* page. Reads unread counts from the dashboard query cache. */
export function StudentShell({ children, header }: { children: ReactNode; header?: (ctx: { onMenu: () => void }) => ReactNode }) {
  const { data } = useStudentDashboard();
  const promo = (
    <div className="rounded-2xl bg-gradient-to-b from-info-50 to-brand-50 p-4 text-center">
      <p className="text-sm font-semibold text-ink">Invite Friends</p>
      <p className="mt-1 text-xs text-muted">Learn together and earn rewards!</p>
      <Link href="/student/profile" className="btn-primary mt-3 w-full">Invite Now</Link>
    </div>
  );
  return <DashboardLayout nav={studentNav} badges={{ notifications: data?.unreadNotifications }} promo={promo} header={header}>{children}</DashboardLayout>;
}
