"use client";
import { useState } from "react";
import Link from "next/link";
import { Users, BookOpen, ClipboardList, BarChart3, Award, Plus, MessageSquare, Bell, TrendingUp, BadgeCheck, Bot, ListChecks, FileText, PieChart, Lightbulb } from "lucide-react";
import { TeacherShell } from "./TeacherShell";
import { useTeacherDashboard } from "@/lib/hooks/queries";
import { TopHeader, StatCard, Card, CardHeader, CardBody, ProgressBar, ProgressLineChart, ActivityList, Pill, EmptyState, ErrorState, DashboardSkeleton, RangePicker, Avatar, cn } from "@/components/dashboard";
import { dueLabel, fmtDate, fmtTime } from "@/lib/format";
import type { TeacherDashboard as Data } from "@/types/lms";

export function TeacherDashboardPage() {
  const [range, setRange] = useState("week");
  const q = useTeacherDashboard(range);
  const d = q.data;
  return (
    <TeacherShell header={({ onMenu }) => (
      <TopHeader onMenu={onMenu} title={d ? `Welcome back, ${d.profile.name}! 👋` : "Welcome back!"} sub="Here's what's happening in your classes today."
        right={<>
          <RangePicker value={range} onChange={setRange} className="hidden sm:block" />
          <Link href="/teacher/messages" className="btn-icon relative bg-white shadow-card ring-1 ring-black/[0.04]" aria-label={`${d?.unreadMessages ?? 0} unread messages`}><MessageSquare size={18} />{!!d?.unreadMessages && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">{d.unreadMessages}</span>}</Link>
          <Link href="/teacher/courses/new" className="btn-primary"><Plus size={16} /> <span className="hidden sm:inline">Create New</span></Link>
        </>}
        notifications={d?.unreadNotifications} notificationsHref="/teacher/notifications" />
    )}>
      {q.isPending ? <DashboardSkeleton /> : q.isError ? <ErrorState error={q.error} retry={() => q.refetch()} /> : d && <Body d={d} />}
    </TeacherShell>
  );
}

function Body({ d }: { d: Data }) {
  const k = d.kpis;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="My Students" kpi={k.students} icon={Users} color="#7C3AED" />
        <StatCard label="Courses Teaching" kpi={k.coursesTeaching} icon={BookOpen} color="#22C55E" />
        <StatCard label="Assignments" kpi={k.pendingAssignments} icon={ClipboardList} color="#3B82F6" caption={k.pendingAssignments.caption ?? "Pending to grade"} />
        <StatCard label="Avg Class Progress" kpi={k.averageClassProgress} icon={BarChart3} color="#F59E0B" />
        <StatCard label="Badges Awarded" kpi={k.badgesAwarded} icon={Award} color="#EC4899" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Class Overview" action="View all" href="/teacher/classes" />
          <CardBody className="pt-3">
            {d.classes.length ? d.classes.slice(0, 4).map((c) => (
              <Link key={c.id} href={`/teacher/classes/${c.id}`} className="focus-ring -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-brand-50/50">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white" style={{ background: c.subjectAccent ?? "#7C3AED" }} aria-hidden><BookOpen size={16} /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{c.name}{c.subject ? ` - ${c.subject}` : ""}</p><p className="text-xs text-muted">{c.studentCount} students{c.atRiskCount ? ` · ${c.atRiskCount} at risk` : ""}</p></div>
                <div className="w-24"><div className="mb-1 text-right text-xs font-semibold">{c.completionPercent}%</div><ProgressBar value={c.completionPercent} size="sm" /></div>
              </Link>
            )) : <EmptyState title="No classes yet" body="Ask your school admin to assign you a class." />}
            {d.classes.length > 0 && <Link href="/teacher/classes" className="btn-block mt-3"><Users size={14} /> Manage My Classes</Link>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Class Progress Overview" action="View analytics" href="/teacher/analytics" />
          <CardBody>
            {d.classProgress.series.length ? <ProgressLineChart data={d.classProgress} /> : <EmptyState title="No progress data yet" body="Progress appears once students start lessons." />}
            {d.classProgress.summary && <p className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600"><TrendingUp size={14} className="text-success-600" /> {d.classProgress.summary}</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="To Do List" action="View all" href="/teacher/tasks" />
          <CardBody className="pt-3">
            {d.tasks.length ? d.tasks.slice(0, 4).map((t) => { const due = dueLabel(t.dueAt); return (
              <Link key={t.id} href={t.href ?? "/teacher/tasks"} className="focus-ring -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-brand-50/50">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600" aria-hidden>{t.type === "QUIZ" ? <ListChecks size={16} /> : t.type === "EXAM" ? <FileText size={16} /> : <ClipboardList size={16} />}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{t.title}</p><p className="text-xs text-muted">{t.className}</p></div>
                <Pill tone={due.tone}>{due.text}</Pill>
              </Link>
            ); }) : <EmptyState title="All caught up" body="Nothing waiting for you right now." />}
            <Link href="/teacher/tasks" className="btn-block mt-3">View All Tasks</Link>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Recent Student Activity" action="View all" href="/teacher/activity" />
          <CardBody className="pt-1"><ActivityList items={d.activity.slice(0, 5)} /><Link href="/teacher/activity" className="btn-block mt-3">View All Activity</Link></CardBody>
        </Card>
        <Card>
          <CardHeader title="Performance by Topic" sub="Students mastered" action="View report" href="/teacher/analytics" />
          <CardBody className="pt-3">
            {d.topics.length ? d.topics.slice(0, 5).map((t) => (
              <div key={t.topic} className="grid grid-cols-[minmax(0,1fr)_auto_96px_auto] items-center gap-3 py-2 text-sm">
                <span className="truncate">{t.topic}</span><span className="text-xs text-muted">{t.mastered}/{t.total}</span>
                <ProgressBar value={t.masteryPercent} size="sm" /><span className="w-9 text-right text-xs font-semibold">{t.masteryPercent}%</span>
              </div>
            )) : <EmptyState title="No topic data" body="Mastery is calculated from quiz and assignment results." />}
            <Link href="/teacher/analytics" className="btn-block mt-3">View Detailed Report</Link>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Upcoming Schedule" action="View calendar" href="/teacher/calendar" />
          <CardBody className="pt-3">
            {d.schedule.length ? d.schedule.slice(0, 4).map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-2">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-100 text-center leading-none"><span className="text-[9px] uppercase text-muted">{fmtDate(s.date, { month: "short" })}</span><span className="text-base font-bold">{new Date(s.date).getDate()}</span></div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{s.className}</p><p className="truncate text-xs text-muted">{s.title}</p></div>
                <span className="shrink-0 text-xs text-muted">{fmtTime(s.startsAt)} – {fmtTime(s.endsAt)}</span>
              </div>
            )) : <EmptyState title="Nothing scheduled" body="Your timetable will appear here." />}
            <Link href="/teacher/calendar" className="btn-block mt-3">View Full Calendar</Link>
          </CardBody>
        </Card>
      </div>

      <Card className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3 lg:w-80"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-info-50 text-info-600" aria-hidden><Bot size={28} /></span><div><p className="font-semibold">AI Teaching Assistant</p><p className="text-xs text-muted">Generate lessons, quizzes, worksheets and analyze performance.</p></div></div>
        <Link href="/teacher/ai" className="btn-primary lg:ml-2">Ask Kidora AI</Link>
        <div className="grid flex-1 grid-cols-2 gap-2 md:grid-cols-4">
          {[["Generate Quiz", ListChecks, "/teacher/ai?tool=quiz", "#22C55E"], ["Create Worksheet", FileText, "/teacher/ai?tool=worksheet", "#7C3AED"], ["Analyze Class", PieChart, "/teacher/ai?tool=analyze", "#EF4444"], ["Lesson Ideas", Lightbulb, "/teacher/ai?tool=ideas", "#3B82F6"]].map(([l, I, h, c]) => {
            const Icon = I as typeof Bot;
            return <Link key={l as string} href={h as string} className="focus-ring flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-semibold hover:bg-brand-50"><span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `${c}1A`, color: c as string }}><Icon size={14} /></span>{l as string}</Link>;
          })}
        </div>
      </Card>
    </div>
  );
}
