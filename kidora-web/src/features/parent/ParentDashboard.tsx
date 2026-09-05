"use client";
import { useState } from "react";
import Link from "next/link";
import { Star, BookOpen, Target, Trophy, Coins, CheckCircle2, AlertCircle, Lightbulb, Heart, Calendar, Users2, Sparkles, Home } from "lucide-react";
import { ParentShell } from "./ParentShell";
import { useSelectedChild } from "./useSelectedChild";
import { useParentDashboard } from "@/lib/hooks/queries";
import { TopHeader, StatCard, Card, CardHeader, CardBody, ProgressBar, MinutesBarChart, Avatar, Pill, EmptyState, ErrorState, DashboardSkeleton, RangePicker, cn } from "@/components/dashboard";
import { dueLabel, fmtDate, fmtMinutes, timeAgo } from "@/lib/format";
import type { ParentDashboard as Data } from "@/types/lms";

export function ParentDashboardPage() {
  const sel = useSelectedChild();
  const [range, setRange] = useState("week");
  const q = useParentDashboard(sel.childId || undefined, range);
  const d = q.data;
  const first = (n: string) => n.split(" ")[0];
  return (
    <ParentShell header={({ onMenu }) => (
      <TopHeader onMenu={onMenu} title={d ? `Welcome back, ${first(d.parent.name)}! 👋` : "Welcome back!"}
        sub={sel.child ? `Here's how ${first(sel.child.name)} is learning and growing.` : undefined}
        right={<><span className="hidden text-xs text-muted md:inline">{d ? `${fmtDate(d.range.from)} – ${fmtDate(d.range.to)}` : ""}</span><RangePicker value={range} onChange={setRange} /></>}
        notifications={d?.unreadNotifications} notificationsHref="/parent/notifications"
        user={sel.child ? { name: sel.child.name, avatarUrl: sel.child.avatarUrl, avatarColor: sel.child.avatarColor, href: "/parent/overview" } : undefined} />
    )}>
      {sel.children.isSuccess && !sel.children.data.length
        ? <EmptyState icon={<Users2 size={22} />} title="No children linked yet" body="Ask your child's school for a link code, or add a child to get started." action={{ label: "Link a child", href: "/parent/children/link" }} />
        : q.isPending ? <DashboardSkeleton /> : q.isError ? <ErrorState error={q.error} retry={() => q.refetch()} /> : d && <Body d={d} childName={sel.child ? first(sel.child.name) : "your child"} />}
    </ParentShell>
  );
}

function Body({ d, childName }: { d: Data; childName: string }) {
  const k = d.kpis;
  const tipIcon: Record<string, typeof Home> = { home: Home, trophy: Trophy, users: Users2, calendar: Calendar, sparkles: Sparkles };
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Overall Progress" kpi={k.overallProgress} icon={Star} color="#7C3AED" />
        <StatCard label="Lessons Completed" kpi={k.lessonsCompleted} icon={BookOpen} color="#3B82F6" />
        <StatCard label="Quizzes Average" kpi={k.quizAverage} icon={Target} color="#22C55E" />
        <StatCard label="Current Streak" kpi={k.streak} icon={Trophy} color="#F59E0B" caption={k.streak.value > 0 ? "Keep it up! 🔥" : "Start a streak today"} />
        <StatCard label="Kidora Coins" kpi={k.coins} icon={Coins} color="#7C3AED" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Learning Progress" action="View details" href="/parent/progress" />
          <CardBody className="space-y-3 pt-3">
            {d.subjectProgress.length ? d.subjectProgress.map((s) => (
              <div key={s.subject} className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white" style={{ background: s.accent }} aria-hidden><BookOpen size={14} /></span>
                <span className="w-24 truncate text-sm">{s.subject}</span>
                <ProgressBar value={s.percent} size="sm" color={s.accent} className="flex-1" label={`${s.subject} progress`} />
                <span className="w-10 text-right text-sm font-semibold">{s.percent}%</span>
              </div>
            )) : <EmptyState title="No subjects yet" body={`${childName} isn't enrolled in a course yet.`} />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Weekly Activity" action="View all" href="/parent/activity" />
          <CardBody>
            {d.weeklyActivity.minutes.some((m) => m > 0) ? (<>
              <MinutesBarChart labels={d.weeklyActivity.labels} values={d.weeklyActivity.minutes} />
              <p className="mt-2 flex items-center gap-2 rounded-xl bg-success-50 px-3 py-2 text-xs text-success-700"><CheckCircle2 size={14} /> Great job! {childName} spent {fmtMinutes(d.weeklyActivity.totalMinutes)} learning this week.</p>
            </>) : <EmptyState title="No learning time logged" body="Minutes are counted as lessons and quizzes are completed." />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Recent Achievements" action="View all" href="/parent/achievements" />
          <CardBody className="pt-2">
            {d.achievements.length ? d.achievements.slice(0, 4).map((a) => (
              <div key={a.id} className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600" aria-hidden><Star size={16} /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{a.title}</p><p className="truncate text-xs text-muted">{a.description}</p></div>
                <span className="text-xs font-bold text-brand-600">+{a.xpReward} XP</span>
              </div>
            )) : <EmptyState title="No achievements yet" body="They unlock as lessons and quizzes are completed." />}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Upcoming Assignments" action="View all" href="/parent/assignments" />
          <CardBody className="pt-2">
            {d.upcomingAssignments.length ? d.upcomingAssignments.slice(0, 4).map((a) => { const due = dueLabel(a.dueAt); return (
              <div key={a.id} className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: `${a.subjectAccent ?? "#7C3AED"}1A`, color: a.subjectAccent ?? "#7C3AED" }} aria-hidden><BookOpen size={16} /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{a.subject ?? a.course}</p><p className="truncate text-xs text-muted">{a.title}</p></div>
                <Pill tone={due.tone}>{due.text}</Pill>
              </div>
            ); }) : <EmptyState title="No upcoming assignments" body="Nothing is due right now." />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Strengths & Areas to Improve" action="View report" href="/parent/overview" />
          <CardBody className="pt-3">
            {d.insights.strengths.length || d.insights.needsPractice.length ? (<>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm font-semibold text-success-700">Strengths</p><ul className="mt-2 space-y-1.5 text-sm">{d.insights.strengths.map((s) => <li key={s} className="flex items-center gap-2"><CheckCircle2 size={15} className="text-success-500" aria-hidden />{s}</li>)}</ul></div>
                <div><p className="text-sm font-semibold text-danger-600">Needs more practice</p><ul className="mt-2 space-y-1.5 text-sm">{d.insights.needsPractice.map((s) => <li key={s} className="flex items-center gap-2"><AlertCircle size={15} className="text-warning-500" aria-hidden />{s}</li>)}</ul></div>
              </div>
              {d.insights.tip && <p className="mt-4 flex items-center gap-2 rounded-xl bg-warning-50 px-3 py-2 text-xs text-warning-700"><Lightbulb size={14} /> {d.insights.tip}</p>}
            </>) : <EmptyState title="Not enough data yet" body="Insights appear after a few quizzes and assignments." />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Messages from Teachers" action="View all" href="/parent/messages" />
          <CardBody className="space-y-2 pt-3">
            {d.messages.length ? d.messages.slice(0, 3).map((m) => (
              <Link key={m.id} href={`/parent/messages/${m.conversationId}`} className="focus-ring flex items-center gap-3 rounded-xl bg-slate-50 p-3 hover:bg-brand-50/60">
                <Avatar name={m.teacher.name} src={m.teacher.avatarUrl} size={36} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{m.teacher.name}</p><p className={cn("truncate text-xs", m.unread ? "font-medium text-ink" : "text-muted")}>{m.preview}</p></div>
                <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted">{timeAgo(m.createdAt)}{m.unread && <span className="h-2 w-2 rounded-full bg-danger-500" aria-label="unread" />}</span>
              </Link>
            )) : <EmptyState title="No messages" body="Teachers can message you here." action={{ label: "Start a conversation", href: "/parent/messages" }} />}
          </CardBody>
        </Card>
      </div>

      <section className="grid gap-3 rounded-3xl bg-gradient-to-r from-brand-600 to-brand-400 p-5 text-white lg:grid-cols-[minmax(0,1fr)_2fr] lg:items-center" aria-labelledby="tips">
        <div className="flex items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/15" aria-hidden><Heart size={22} /></span><div><p id="tips" className="text-lg font-bold">You're doing great, {childName}! 💜</p><p className="text-sm text-white/85">Learning a little every day leads to big achievements tomorrow.</p></div></div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {d.tips.map((t) => { const I = tipIcon[t.icon] ?? Sparkles; return (
            <div key={t.id} className="rounded-2xl bg-white p-3 text-ink"><I size={18} className="text-brand-600" aria-hidden /><p className="mt-2 text-sm font-semibold leading-tight">{t.title}</p><p className="mt-1 text-[11px] text-muted">{t.body}</p></div>
          ); })}
        </div>
      </section>
    </div>
  );
}
