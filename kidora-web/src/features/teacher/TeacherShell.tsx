"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { Bot } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";
import { teacherNav } from "@/lib/nav";
import { useTeacherDashboard } from "@/lib/hooks/queries";

export function TeacherShell({ children, header }: { children: ReactNode; header?: (ctx: { onMenu: () => void }) => ReactNode }) {
  const { data } = useTeacherDashboard();
  const promo = (
    <div className="rounded-2xl bg-brand-50/70 p-4">
      <div className="flex items-start gap-2"><Bot size={18} className="mt-0.5 text-brand-600" aria-hidden /><div><p className="text-sm font-semibold">Kidora AI Assistant</p><p className="mt-0.5 text-xs text-muted">Create lessons, quizzes and analyze student data.</p></div></div>
      <Link href="/teacher/ai" className="btn-primary mt-3 w-full">Ask Kidora AI</Link>
    </div>
  );
  return <DashboardLayout nav={teacherNav} badges={{ notifications: data?.unreadNotifications, messages: data?.unreadMessages }} promo={promo} header={header}>{children}</DashboardLayout>;
}
