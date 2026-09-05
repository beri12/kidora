"use client";
import Link from "next/link";
import { BookOpen, CheckSquare, HelpCircle, Trophy, ChevronRight, Bot, Target, Flame, Star, Check } from "lucide-react";
import { StudentShell } from "./StudentShell";
import { useStudentDashboard, useClaimQuest } from "@/lib/hooks/queries";
import {
  TopHeader, Card, CardHeader, CardBody, ProgressBar, Avatar, XPIndicator, CoinIndicator, StreakIndicator,
  DashboardSkeleton, ErrorState, EmptyState, cn,
} from "@/components/dashboard";
import { fmtNumber } from "@/lib/format";
import type { StudentDashboard as Data, CourseCard as CourseCardT } from "@/types/lms";

export function StudentDashboardPage() {
  const q = useStudentDashboard();
  const d = q.data;

  return (
    <StudentShell header={({ onMenu }) => (
      <TopHeader onMenu={onMenu}
        title={d ? <span className="flex items-center gap-3"><Avatar name={d.profile.name} src={d.profile.avatarUrl} color={d.profile.avatarColor} size={44} className="hidden sm:inline-flex" />Hi, {d.profile.displayName ?? d.profile.name}! 👋</span> : "Hi there!"}
        sub="Keep learning, keep growing!"
        right={d && <div className="hidden items-center gap-2 md:flex"><XPIndicator xp={d.profile.xp} /><CoinIndicator coins={d.profile.coins} /><StreakIndicator days={d.profile.streak} /></div>}
        notifications={d?.unreadNotifications} notificationsHref="/student/notifications"
        user={d ? { name: d.profile.name, avatarUrl: d.profile.avatarUrl, avatarColor: d.profile.avatarColor, href: "/student/profile" } : undefined} />
    )}>
      {q.isPending ? <DashboardSkeleton kpis={4} /> : q.isError ? <ErrorState error={q.error} retry={() => q.refetch()} /> : d && <Body d={d} />}
    </StudentShell>
  );
}

function Body({ d }: { d: Data }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      {/* Mobile indicators */}
      <div className="flex gap-2 overflow-x-auto md:hidden"><XPIndicator xp={d.profile.xp} /><CoinIndicator coins={d.profile.coins} /><StreakIndicator days={d.profile.streak} /></div>

      <div className="space-y-4">
        <Adventure d={d} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MiniStat icon={BookOpen} color="#22C55E" label="Courses Enrolled" value={d.stats.coursesEnrolled} href="/student/courses" />
          <MiniStat icon={CheckSquare} color="#7C3AED" label="Lessons Completed" value={d.stats.lessonsCompleted} href="/student/courses" />
          <MiniStat icon={HelpCircle} color="#3B82F6" label="Quizzes Completed" value={d.stats.quizzesCompleted} href="/student/quizzes" />
          <MiniStat icon={Trophy} color="#EF4444" label="Average Score" value={`${Math.round(d.stats.averageScore)}%`} href="/student/quizzes" hrefLabel="View details" />
        </div>
        <Card>
          <CardHeader title="My Courses" action="See all" href="/student/courses" />
          <CardBody>
            {d.courses.length ? (
              <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
                {d.courses.map((c) => <CourseTile key={c.id} c={c} />)}
              </div>
            ) : <EmptyState title="No courses yet" body="Your teacher or school will enroll you, or browse the library." action={{ label: "Browse courses", href: "/courses" }} />}
          </CardBody>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader title="Continue Learning" />
            <CardBody>
              {d.adventure?.lesson && d.adventure.course ? (
                <div className="flex items-center gap-4">
                  <div className="grid h-16 w-24 shrink-0 place-items-center rounded-xl bg-brand-600 text-xs font-bold text-white" aria-hidden>{d.adventure.course.subject.slice(0, 3)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{d.adventure.lesson.title}</p>
                    <p className="text-xs text-muted">{d.adventure.course.title} • Lesson {d.adventure.lesson.order} of {d.adventure.lesson.total}</p>
                    <div className="mt-2 flex items-center gap-2"><ProgressBar value={d.adventure.progressPercent} size="sm" color="#22C55E" /><span className="text-xs font-semibold">{d.adventure.progressPercent}%</span></div>
                  </div>
                  <Link href={`/learn/${d.adventure.course.slug}/${d.adventure.lesson.id}`} className="btn-primary shrink-0">Continue</Link>
                </div>
              ) : <EmptyState title="Nothing in progress" body="Pick a course to start your first lesson." action={{ label: "My courses", href: "/student/courses" }} />}
            </CardBody>
          </Card>
          <Card className="flex items-center gap-4 p-5">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-info-50 text-info-600" aria-hidden><Bot size={40} /></div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">Kidora AI Tutor</p>
              <p className="mt-0.5 text-xs text-muted">Need help with a lesson? I'm here to help you!</p>
              <Link href="/student/ai-tutor" className="btn-primary mt-3">Ask Kidora</Link>
            </div>
          </Card>
        </div>
      </div>

      <aside className="space-y-4">
        <DailyQuest d={d} />
        <Card>
          <CardHeader title={<>Learning Streak <Flame size={16} className="inline text-danger-500" aria-hidden /></>} />
          <CardBody>
            <p className="text-lg font-bold">{d.profile.streak} {d.profile.streak === 1 ? "Day" : "Days"}</p>
            <ul className="mt-3 flex justify-between" aria-label="This week">
              {d.streakWeek.map((s) => (
                <li key={s.date} className="flex flex-col items-center gap-1 text-[11px] text-muted">
                  <span className={cn("grid h-7 w-7 place-items-center rounded-full", s.done ? "bg-success-500 text-white" : s.isToday ? "ring-2 ring-brand-300 bg-white" : "bg-slate-200")} aria-label={`${s.day}: ${s.done ? "learned" : "not yet"}`}>{s.done && <Check size={14} />}</span>
                  {s.day}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Recent Achievements" action="See all" href="/student/badges" />
          <CardBody className="pt-2">
            {d.achievements.length ? d.achievements.slice(0, 4).map((a) => (
              <div key={a.id} className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600" aria-hidden><Star size={16} /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{a.title}</p><p className="truncate text-xs text-muted">{a.description}</p></div>
                <span className="text-xs font-bold text-brand-600">+{a.xpReward} XP</span>
              </div>
            )) : <EmptyState title="No achievements yet" body="Complete lessons and quizzes to unlock your first one." />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Leaderboard" action={d.leaderboard.period === "week" ? "This Week" : "This Month"} href="/student/leaderboard" />
          <CardBody className="pt-2">
            {d.leaderboard.entries.length ? d.leaderboard.entries.slice(0, 5).map((e) => (
              <div key={e.userId} className={cn("flex items-center gap-2.5 rounded-xl px-2 py-2", e.isMe && "bg-success-50 ring-1 ring-success-100")}>
                <span className="w-5 text-center text-xs font-bold text-muted">{e.rank <= 3 ? ["🥇", "🥈", "🥉"][e.rank - 1] : e.rank}</span>
                <Avatar name={e.displayName} src={e.avatarUrl} color={e.avatarColor} size={28} />
                <span className="flex-1 truncate text-sm">{e.displayName}{e.isMe && " (You)"}</span>
                <span className="text-xs font-semibold text-muted">{fmtNumber(e.xp)} XP</span>
              </div>
            )) : <EmptyState title="Leaderboard is empty" body="Earn XP this week to appear here." />}
          </CardBody>
        </Card>
      </aside>
    </div>
  );
}

function Adventure({ d }: { d: Data }) {
  const a = d.adventure;
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 p-5 text-white sm:p-6" aria-labelledby="adventure">
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div>
          <p id="adventure" className="text-lg font-bold">Your Learning Adventure</p>
          <p className="text-sm text-white/85">{a?.course ? `Keep going! You are doing great in ${a.course.title}.` : "Start your first lesson to begin the journey."}</p>
          <div className="mt-4 flex items-center justify-between text-sm font-semibold"><span>Level {d.profile.level}</span><span>Level {d.profile.level + 1}</span></div>
          <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-warning-500 transition-[width] duration-700" style={{ width: `${Math.min(100, (d.profile.xp / Math.max(1, d.profile.xpForNextLevel)) * 100)}%` }} /></div>
          <p className="mt-1.5 text-xs"><span className="font-bold text-warning-200">{fmtNumber(d.profile.xp)}</span> / {fmtNumber(d.profile.xpForNextLevel)} XP</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 sm:border-l sm:border-white/20 sm:bg-transparent sm:pl-6">
          <div>
            <p className="text-xs text-white/80">Next Reward</p>
            <p className="text-sm font-semibold">Open at <span className="text-warning-200">Level {d.profile.level + 1}</span></p>
            {a?.lesson && <Link href={`/learn/${a.course?.slug}/${a.lesson.id}`} className="mt-2 inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 focus-ring">Continue Learning <ChevronRight size={14} /></Link>}
          </div>
        </div>
      </div>
      <span className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" aria-hidden />
    </section>
  );
}

function DailyQuest({ d }: { d: Data }) {
  const claim = useClaimQuest();
  const qst = d.dailyQuest;
  return (
    <Card>
      <CardHeader title="Daily Quest" action="All quests" href="/student/quests" />
      <CardBody>
        {qst ? (
          <>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-danger-50 text-danger-500" aria-hidden><Target size={20} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{qst.title}</p>
                <div className="mt-1.5 flex items-center gap-2"><ProgressBar value={(qst.progress / qst.target) * 100} size="sm" color="#22C55E" /><span className="text-xs font-semibold">{qst.progress} / {qst.target}</span></div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-muted">Reward: <span className="font-semibold text-warning-600">{qst.rewardCoins} Coins</span>{qst.rewardXP ? <span> · {qst.rewardXP} XP</span> : null}</p>
              {qst.completed && !qst.claimed && <button type="button" className="btn-primary py-1.5" onClick={() => claim.mutate(qst.id)} disabled={claim.isPending}>{claim.isPending ? "Claiming…" : "Claim"}</button>}
              {qst.claimed && <span className="text-xs font-semibold text-success-600">Claimed ✓</span>}
            </div>
          </>
        ) : <EmptyState title="No quest today" body="Check back tomorrow for a new challenge." />}
      </CardBody>
    </Card>
  );
}

function MiniStat({ icon: Icon, color, label, value, href, hrefLabel = "View all" }: { icon: typeof BookOpen; color: string; label: string; value: number | string; href: string; hrefLabel?: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: `${color}1A`, color }} aria-hidden><Icon size={20} /></span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted">{label}</p>
        <p className="text-xl font-bold leading-tight">{typeof value === "number" ? fmtNumber(value) : value}</p>
        <Link href={href} className="text-[11px] font-medium text-brand-600 focus-ring rounded">{hrefLabel}</Link>
      </div>
    </Card>
  );
}

export function CourseTile({ c }: { c: CourseCardT }) {
  return (
    <article className="w-[180px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.04]">
      <div className="grid aspect-[16/10] place-items-center text-3xl font-black text-white/90" style={{ background: c.subjectAccent }}>
        {c.thumbnailUrl ? <img src={c.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <span aria-hidden>{c.subject.slice(0, 1)}</span>}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold">{c.title}</p>
        <p className="text-xs text-muted">{c.grade ?? c.subject}</p>
        <div className="mt-2 flex items-center gap-2"><ProgressBar value={c.progressPercent} size="sm" /><span className="text-[11px] font-semibold">{c.progressPercent}%</span></div>
        <Link href={c.currentLesson ? `/learn/${c.slug}/${c.currentLesson.id}` : `/learn/${c.slug}`} className="btn-primary mt-3 w-full py-1.5 text-xs">{c.status === "NOT_STARTED" ? "Start" : c.status === "COMPLETED" ? "Review" : "Continue"}</Link>
      </div>
    </article>
  );
}
