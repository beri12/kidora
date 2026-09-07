"use client";
import Link from "next/link";
import { Award, BookOpen, CalendarDays, Flame, MessageSquare, Sparkles, TrendingUp } from "lucide-react";
import { ParentShell } from "./ParentShell";
import { useSelectedChild } from "./useSelectedChild";
import { useParentDashboard } from "@/lib/hooks/queries";
import { useUpcoming } from "@/hooks/useCalendar";
import { TopHeader, Card, CardBody, CardHeader, Pill, ProgressBar, Avatar, EmptyState, ErrorState, Skeleton } from "@/components/dashboard";
import { fmtNumber, timeAgo } from "@/lib/format";

/**
 * The parent's single summary screen: who their children are, how each is
 * doing, what is coming up, and anything waiting on them. Every number comes
 * from /parent/dashboard and /calendar/upcoming — nothing is invented here.
 */
export function ParentOverviewPage() {
  const sel = useSelectedChild();
  const q = useParentDashboard(sel.childId || undefined);
  const upcoming = useUpcoming(14, sel.childId || undefined);

  return (
    <ParentShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title="Overview" sub="How your family is doing" />}>
      {q.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : q.isError ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : !q.data ? null : !q.data.children.length ? (
        <EmptyState
          title="No children linked yet"
          body="Ask your child's school for a join code, or link an existing account, and their progress will appear here."
        />
      ) : (
        <div className="grid gap-4">
          {/* KPI row */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["Overall progress", `${q.data.kpis.overallProgress.value}%`, TrendingUp, "brand"],
              ["Lessons done", fmtNumber(q.data.kpis.lessonsCompleted.value), BookOpen, "info"],
              ["Quiz average", `${q.data.kpis.quizAverage.value}%`, Award, "success"],
              ["Day streak", fmtNumber(q.data.kpis.streak.value), Flame, "warning"],
              ["Coins", fmtNumber(q.data.kpis.coins.value), Sparkles, "brand"],
            ].map(([label, value, Icon, tone]) => {
              const I = Icon as typeof TrendingUp;
              return (
                <Card key={label as string}>
                  <CardBody className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50"><I size={18} className="text-brand-600" aria-hidden /></span>
                    <span className="min-w-0">
                      <span className="block text-lg font-bold text-ink">{value as string}</span>
                      <span className="block truncate text-xs text-muted">{label as string}</span>
                    </span>
                  </CardBody>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="grid gap-4 lg:col-span-2">
              {/* children */}
              <Card>
                <CardHeader title="Children" action="Progress" href="/parent/progress" />
                <CardBody>
                  <ul className="grid gap-2">
                    {q.data.children.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => sel.select(c.id)}
                          className={"flex w-full items-center gap-3 rounded-xl border p-3 text-left transition " +
                            (c.id === sel.childId ? "border-brand-400 bg-brand-50" : "border-line hover:bg-brand-50")}
                        >
                          <Avatar name={c.name} src={c.avatarUrl} color={c.avatarColor} size={40} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-ink">{c.name}</span>
                            <span className="block text-xs text-muted">{c.grade ?? "No grade"}{c.className ? ` · ${c.className}` : ""}{c.schoolName ? ` · ${c.schoolName}` : ""}</span>
                          </span>
                          {/* Per-child progress is only returned for the selected child, so
                              the bar is shown for that one rather than guessed for the rest. */}
                          {c.id === sel.childId && (
                            <span className="w-28 shrink-0"><ProgressBar value={q.data.kpis.overallProgress.value} size="sm" /></span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>

              {/* subjects */}
              <Card>
                <CardHeader title="Progress by subject" />
                <CardBody>
                  {q.data.subjectProgress.length ? (
                    <ul className="grid gap-3">
                      {q.data.subjectProgress.map((s) => (
                        <li key={s.subject}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-semibold text-ink">{s.subject}</span>
                            <span className="text-muted">{s.percent}%</span>
                          </div>
                          <ProgressBar value={s.percent} />
                        </li>
                      ))}
                    </ul>
                  ) : <EmptyState title="No subject data yet" body="It appears once your child starts a course." />}
                </CardBody>
              </Card>

              {/* insights */}
              <Card>
                <CardHeader title="What we're seeing" sub="Based on recent lessons and quizzes" />
                <CardBody>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase text-muted">Strengths</p>
                      {q.data.insights.strengths.length
                        ? <div className="flex flex-wrap gap-1.5">{q.data.insights.strengths.map((s) => <Pill key={s} tone="success">{s}</Pill>)}</div>
                        : <p className="text-sm text-muted">Not enough data yet.</p>}
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase text-muted">Needs practice</p>
                      {q.data.insights.needsPractice.length
                        ? <div className="flex flex-wrap gap-1.5">{q.data.insights.needsPractice.map((s) => <Pill key={s} tone="warning">{s}</Pill>)}</div>
                        : <p className="text-sm text-muted">Nothing flagged.</p>}
                    </div>
                  </div>
                  {q.data.insights.tip && <p className="mt-3 rounded-xl bg-brand-50 p-3 text-sm text-ink">💡 {q.data.insights.tip}</p>}
                </CardBody>
              </Card>
            </div>

            <div className="grid gap-4">
              {/* upcoming */}
              <Card>
                <CardHeader title="Coming up" action="Calendar" href="/parent/calendar" />
                <CardBody>
                  {upcoming.isPending ? <Skeleton className="h-24" />
                    : upcoming.data?.length ? (
                      <ul className="grid gap-2">
                        {upcoming.data.slice(0, 6).map((i) => (
                          <li key={`${i.source}-${i.id}`} className="flex items-center gap-2">
                            <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: i.color ?? "#8B5CF6" }} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-ink">{i.title}</span>
                              <span className="block text-xs text-muted">{new Date(i.startsAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : <EmptyState title="Nothing scheduled" body="The next two weeks are clear." />}
                </CardBody>
              </Card>

              {/* messages */}
              <Card>
                <CardHeader title="Messages" action="Open" href="/parent/messages" />
                <CardBody>
                  {q.data.messages.length ? (
                    <ul className="grid gap-2">
                      {q.data.messages.slice(0, 4).map((m) => (
                        <li key={m.id}>
                          <Link href={`/parent/messages/${m.conversationId}`} className="flex items-center gap-2 rounded-xl p-2 hover:bg-brand-50">
                            <Avatar name={m.teacher.name} src={m.teacher.avatarUrl} size={32} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-ink">{m.teacher.name}</span>
                              <span className="block truncate text-xs text-muted">{m.preview}</span>
                            </span>
                            {m.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : <EmptyState title="No messages" body="Teachers will appear here when they write." />}
                </CardBody>
              </Card>

              {/* achievements */}
              <Card>
                <CardHeader title="Recent achievements" action="All" href="/parent/achievements" />
                <CardBody>
                  {q.data.achievements.length ? (
                    <ul className="grid gap-2">
                      {q.data.achievements.slice(0, 4).map((a) => (
                        <li key={a.id} className="flex items-center gap-2 text-sm">
                          <Award size={16} className="shrink-0 text-brand-600" aria-hidden />
                          <span className="min-w-0 flex-1 truncate font-semibold text-ink">{a.title}</span>
                          {a.unlockedAt && <span className="shrink-0 text-xs text-muted">{timeAgo(a.unlockedAt)}</span>}
                        </li>
                      ))}
                    </ul>
                  ) : <EmptyState title="None yet" body="Badges appear as your child learns." />}
                </CardBody>
              </Card>

              {/* quick actions */}
              <Card>
                <CardHeader title="Quick actions" />
                <CardBody className="grid gap-2">
                  <Link href="/parent/assignments" className="btn-secondary w-full justify-center">📝 Assignments</Link>
                  <Link href="/parent/calendar" className="btn-secondary w-full justify-center"><CalendarDays size={16} /> Calendar</Link>
                  <Link href="/parent/messages" className="btn-secondary w-full justify-center"><MessageSquare size={16} /> Message a teacher</Link>
                  <Link href="/parent/support" className="btn-secondary w-full justify-center">🛟 Get help</Link>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      )}
    </ParentShell>
  );
}
