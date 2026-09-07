"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Lock, Check, Award, Trophy, Medal, Bot, Send, ExternalLink, Clock } from "lucide-react";
import { StudentShell } from "./StudentShell";
import { CourseTile } from "./StudentDashboard";
import {
  useStudentCourses, useStudentQuests, useClaimQuest, useStudentAssignments, useStudentQuizzes, useStudentExams,
  useStudentCertificates, useStudentBadges, useLeaderboard, useWorldMap, useAiHistory, useAiAsk, useSubmitAssignment,
  useStudentDashboard,
} from "@/lib/hooks/queries";
import { TopHeader, Card, CardBody, CardHeader, Pill, ProgressBar, Avatar, EmptyState, ErrorState, Skeleton, Tabs, cn } from "@/components/dashboard";
import { dueLabel, fmtDate, fmtNumber, timeAgo } from "@/lib/format";
import type { WorldNode } from "@/types/lms";

/** Page wrapper: header + loading/error/data switch. */
function Page<T>({ title, sub, q, children, actions }: { title: string; sub?: string; q: { isPending: boolean; isError: boolean; error: unknown; data?: T; refetch: () => unknown }; children: (d: T) => ReactNode; actions?: ReactNode }) {
  return (
    <StudentShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title={title} sub={sub} right={actions} />}>
      {q.isPending ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
        : q.isError ? <ErrorState error={q.error} retry={() => q.refetch()} /> : q.data !== undefined ? children(q.data) : null}
    </StudentShell>
  );
}

// ---------------------------------------------------------------- Courses
export function StudentCoursesPage() {
  const [tab, setTab] = useState<"all" | "IN_PROGRESS" | "COMPLETED" | "NOT_STARTED">("all");
  const q = useStudentCourses(tab === "all" ? undefined : tab);
  return (
    <Page title="My Courses" sub="Everything you're enrolled in" q={q} actions={<Tabs value={tab} onChange={setTab} options={[{ value: "all", label: "All" }, { value: "IN_PROGRESS", label: "In Progress" }, { value: "COMPLETED", label: "Completed" }, { value: "NOT_STARTED", label: "Not Started" }]} />}>
      {(courses) => courses.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map((c) => (
            <Card key={c.id} as="article" className="overflow-hidden">
              <div className="grid aspect-[16/9] place-items-center text-4xl font-black text-white/90" style={{ background: c.subjectAccent }}>{c.thumbnailUrl ? <img src={c.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : c.subject.slice(0, 1)}</div>
              <div className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted"><Pill tone="brand">{c.subject}</Pill>{c.grade && <span>{c.grade}</span>}</div>
                <p className="mt-2 font-semibold">{c.title}</p>
                {c.teacher && <p className="text-xs text-muted">{c.teacher}</p>}
                <div className="mt-3 flex items-center gap-2"><ProgressBar value={c.progressPercent} size="sm" /><span className="text-xs font-semibold">{c.progressPercent}%</span></div>
                <p className="mt-1 text-[11px] text-muted">{c.lessonsCompleted} of {c.totalLessons} lessons{c.currentLesson ? ` · Next: ${c.currentLesson.title}` : ""}{c.lastActivityAt ? ` · ${timeAgo(c.lastActivityAt)}` : ""}</p>
                <Link href={c.currentLesson ? `/learn/${c.slug}/${c.currentLesson.id}` : `/learn/${c.slug}`} className="btn-primary mt-3 w-full">{c.status === "NOT_STARTED" ? "Start" : c.status === "COMPLETED" ? "Review" : "Continue"}</Link>
              </div>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="No courses here" body={tab === "all" ? "You're not enrolled in any course yet." : "Nothing matches this filter."} action={{ label: "Browse courses", href: "/courses" }} />}
    </Page>
  );
}

// ---------------------------------------------------------------- Quests
export function StudentQuestsPage() {
  const q = useStudentQuests();
  const claim = useClaimQuest();
  const groups: { key: "DAILY" | "WEEKLY" | "MISSION" | "STREAK"; label: string }[] = [{ key: "DAILY", label: "Daily quests" }, { key: "WEEKLY", label: "Weekly quests" }, { key: "MISSION", label: "Learning missions" }, { key: "STREAK", label: "Streak challenges" }];
  return (
    <Page title="Quests" sub="Small goals, real rewards" q={q}>
      {(quests) => quests.length ? groups.map((g) => {
        const list = quests.filter((x) => x.kind === g.key);
        if (!list.length) return null;
        return (
          <section key={g.key} className="mb-6" aria-labelledby={`g-${g.key}`}>
            <h2 id={`g-${g.key}`} className="mb-2 text-sm font-semibold text-muted">{g.label}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.map((x) => (
                <Card key={x.id} className="p-4">
                  <div className="flex items-start justify-between gap-2"><p className="font-semibold">{x.title}</p>{x.claimed ? <Pill tone="success"><Check size={12} /> Done</Pill> : x.completed ? <Pill tone="warning">Ready</Pill> : x.endsAt ? <Pill tone="neutral"><Clock size={12} /> {fmtDate(x.endsAt)}</Pill> : null}</div>
                  <p className="mt-1 text-xs text-muted">{x.description}</p>
                  <div className="mt-3 flex items-center gap-2"><ProgressBar value={(x.progress / Math.max(1, x.target)) * 100} size="sm" color="#22C55E" /><span className="text-xs font-semibold">{x.progress}/{x.target}</span></div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-muted">+{x.rewardXP} XP · <span className="font-semibold text-warning-600">{x.rewardCoins} coins</span></span>
                    {x.completed && !x.claimed && <button type="button" className="btn-primary py-1.5" disabled={claim.isPending} onClick={() => claim.mutate(x.id)}>Claim</button>}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        );
      }) : <EmptyState title="No quests right now" body="New quests appear every day. Come back tomorrow." />}
    </Page>
  );
}

// ---------------------------------------------------------------- Assignments
export function StudentAssignmentsPage() {
  const [tab, setTab] = useState<"all" | "UPCOMING" | "PENDING" | "SUBMITTED" | "GRADED" | "OVERDUE">("all");
  const q = useStudentAssignments(tab === "all" ? undefined : tab);
  const submit = useSubmitAssignment();
  const tone = (s: string) => s === "GRADED" ? "success" : s === "SUBMITTED" ? "info" : s === "OVERDUE" ? "danger" : s === "PENDING" ? "warning" : "neutral";
  return (
    <Page title="Assignments" q={q} actions={<Tabs value={tab} onChange={setTab} options={["all", "UPCOMING", "PENDING", "SUBMITTED", "GRADED", "OVERDUE"].map((v) => ({ value: v as typeof tab, label: v === "all" ? "All" : v[0] + v.slice(1).toLowerCase() }))} />}>
      {(list) => list.length ? (
        <ul className="space-y-3">
          {list.map((a) => {
            const due = dueLabel(a.dueAt);
            return (
              <Card key={a.id} as="article" className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{a.title}</p><Pill tone={tone(a.status)}>{a.status[0] + a.status.slice(1).toLowerCase()}</Pill></div>
                    <p className="mt-0.5 text-xs text-muted">{[a.course, a.teacher].filter(Boolean).join(" · ")}</p>
                    {a.description && <p className="mt-2 text-sm text-slate-600">{a.description}</p>}
                    {a.status === "GRADED" && <p className="mt-2 text-sm"><span className="font-semibold text-success-700">{a.score}/{a.maxScore}</span>{a.feedback && <span className="text-muted"> · {a.feedback}</span>}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Pill tone={due.tone}>{due.text}</Pill>
                    {(a.status === "PENDING" || a.status === "UPCOMING" || a.status === "OVERDUE") && (
                      <form onSubmit={(e) => { e.preventDefault(); submit.mutate({ id: a.id, form: new FormData(e.currentTarget) }); }} className="flex items-center gap-2">
                        <input type="file" name="file" className="text-xs" aria-label="Attach your work" />
                        <button type="submit" className="btn-primary py-1.5" disabled={submit.isPending}>Submit</button>
                      </form>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </ul>
      ) : <EmptyState title="No assignments" body="When your teacher posts an assignment it will show up here." />}
    </Page>
  );
}

// ---------------------------------------------------------------- Quizzes
export function StudentQuizzesPage() {
  const [tab, setTab] = useState<"all" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED">("all");
  const q = useStudentQuizzes(tab === "all" ? undefined : tab);
  return (
    <Page title="Quizzes" q={q} actions={<Tabs value={tab} onChange={setTab} options={[{ value: "all", label: "All" }, { value: "AVAILABLE", label: "Available" }, { value: "IN_PROGRESS", label: "In progress" }, { value: "COMPLETED", label: "Completed" }]} />}>
      {(list) => list.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((z) => (
            <Card key={z.id} className="p-4">
              <p className="font-semibold">{z.title}</p>
              <p className="text-xs text-muted">{z.course} · {z.questionCount} questions{z.timeLimitSec ? ` · ${Math.round(z.timeLimitSec / 60)} min` : ""}</p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted">Attempts {z.attemptsUsed}/{z.maxAttempts}{z.bestPercent != null ? ` · Best ${z.bestPercent}%` : ""}</span>
                <Link href={`/quiz/${z.id}`} className="btn-primary py-1.5">{z.status === "IN_PROGRESS" ? "Resume" : z.status === "COMPLETED" ? "Review" : "Start"}</Link>
              </div>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="No quizzes" body="Quizzes unlock as you move through lessons." />}
    </Page>
  );
}

// ---------------------------------------------------------------- Exams
export function StudentExamsPage() {
  const q = useStudentExams();
  return (
    <Page title="Exams" q={q}>
      {(list) => list.length ? (
        <ul className="space-y-3">
          {list.map((e) => (
            <Card key={e.id} as="article" className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1"><p className="font-semibold">{e.title}</p><p className="text-xs text-muted">{e.course}{e.scheduledAt ? ` · ${fmtDate(e.scheduledAt, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}{e.durationMin ? ` · ${e.durationMin} min` : ""}</p></div>
              {e.result ? <Pill tone={e.result.passed ? "success" : "danger"}>{e.result.percent}% · {e.result.passed ? "Passed" : "Not passed"}</Pill> : <Pill tone={e.status === "OPEN" ? "success" : "info"}>{e.status[0] + e.status.slice(1).toLowerCase()}</Pill>}
              {e.status === "OPEN" && !e.result && <Link href={`/exam/${e.id}`} className="btn-primary">Start exam</Link>}
              {e.result?.certificateId && <Link href="/student/certificates" className="btn-secondary"><Award size={14} /> Certificate</Link>}
            </Card>
          ))}
        </ul>
      ) : <EmptyState title="No exams scheduled" body="Your teacher will schedule the final exam when the course is ready." />}
    </Page>
  );
}

// ---------------------------------------------------------------- Certificates
export function StudentCertificatesPage() {
  const q = useStudentCertificates();
  return (
    <Page title="Certificates" q={q}>
      {(list) => list.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((c) => (
            <Card key={c.id} as="article" className="relative overflow-hidden p-5">
              <span className="absolute right-4 top-4 text-brand-100" aria-hidden><Award size={64} /></span>
              <p className="text-xs text-muted">{c.schoolName}</p>
              <p className="mt-1 text-lg font-bold">{c.courseName}</p>
              <p className="text-sm">{c.studentName}{c.gradeName ? ` · ${c.gradeName}` : ""}</p>
              <p className="mt-3 text-xs text-muted">Completed {fmtDate(c.issuedAt, { year: "numeric", month: "long", day: "numeric" })} · ID <span className="font-mono">{c.code}</span></p>
              <div className="mt-4 flex gap-2">
                {c.pdfUrl && <a href={c.pdfUrl} className="btn-primary">Download</a>}
                <Link href={`/verify/${c.code}`} className="btn-secondary"><ExternalLink size={14} /> Verify</Link>
              </div>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="No certificates yet" body="Pass a course's final exam to earn your first certificate." action={{ label: "See exams", href: "/student/exams" }} />}
    </Page>
  );
}

// ---------------------------------------------------------------- Leaderboard
export function StudentLeaderboardPage() {
  const [scope, setScope] = useState<"school" | "class">("class");
  const [period, setPeriod] = useState<"week" | "month">("week");
  const q = useLeaderboard(scope, period);
  return (
    <Page title="Leaderboard" sub="Ranked by XP earned. Only display names are shown." q={q}
      actions={<><Tabs value={scope} onChange={setScope} options={[{ value: "class", label: "My class" }, { value: "school", label: "School" }]} /><Tabs value={period} onChange={setPeriod} options={[{ value: "week", label: "Weekly" }, { value: "month", label: "Monthly" }]} /></>}>
      {(rows) => rows.length ? (
        <Card><CardBody className="pt-3">
          <ol>{rows.map((e) => (
            <li key={e.userId} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5", e.isMe && "bg-success-50 ring-1 ring-success-100")}>
              <span className="w-8 text-center font-bold text-muted">{e.rank <= 3 ? <Trophy size={18} className={["text-warning-500", "text-slate-400", "text-amber-700"][e.rank - 1]} /> : e.rank}</span>
              <Avatar name={e.displayName} src={e.avatarUrl} color={e.avatarColor} size={34} />
              <span className="flex-1 truncate font-medium">{e.displayName}{e.isMe && " (You)"}</span>
              <span className="text-sm font-semibold">{fmtNumber(e.xp)} XP</span>
            </li>
          ))}</ol>
        </CardBody></Card>
      ) : <EmptyState title="Nobody on the board yet" body="Earn XP by completing lessons and quizzes." />}
    </Page>
  );
}

// ---------------------------------------------------------------- Badges
export function StudentBadgesPage() {
  const q = useStudentBadges();
  return (
    <Page title="Badges" q={q}>
      {(list) => list.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.map((b) => (
            <Card key={b.id} as="article" className={cn("p-4 text-center", !b.earnedAt && "opacity-70")}>
              <div className={cn("mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br text-3xl", b.earnedAt ? b.gradient : "from-slate-200 to-slate-300 grayscale")} aria-hidden>{b.earnedAt ? b.glyph : <Lock size={22} className="text-slate-500" />}</div>
              <p className="mt-3 text-sm font-semibold">{b.name}</p>
              <p className="text-xs text-muted">{b.earnedAt ? `Earned ${fmtDate(b.earnedAt)}` : b.requirementText ?? b.desc}</p>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="No badges available" body="Badges are on the way." icon={<Medal size={22} />} />}
    </Page>
  );
}

// ---------------------------------------------------------------- World map
function Node({ n, depth = 0 }: { n: WorldNode; depth?: number }) {
  const cls = n.status === "COMPLETED" ? "bg-success-500 text-white" : n.status === "AVAILABLE" ? "bg-white text-brand-700 ring-2 ring-brand-400" : "bg-slate-200 text-slate-400";
  const inner = (
    <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold", cls, n.type === "BOSS" && "ring-2 ring-danger-400")}>
      {n.status === "COMPLETED" ? <Check size={12} /> : n.status === "LOCKED" ? <Lock size={12} /> : null}{n.title}
    </span>
  );
  return (
    <li className={cn(depth > 0 && "ml-6 border-l border-dashed border-slate-200 pl-4")}>
      <div className="py-1">{n.href && n.status !== "LOCKED" ? <Link href={n.href} className="focus-ring rounded-full">{inner}</Link> : inner}</div>
      {n.children?.length ? <ul>{n.children.map((c) => <Node key={c.id} n={c} depth={depth + 1} />)}</ul> : null}
    </li>
  );
}
export function StudentWorldPage() {
  const q = useWorldMap();
  return (
    <Page title="World Map" sub="Your learning journey, one world at a time" q={q}>
      {(m) => m.worlds.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {m.worlds.map((w) => (
            <Card key={w.key} as="article">
              <div className="rounded-t-2xl p-5 text-white" style={{ background: w.accent }}>
                <p className="text-lg font-bold">{w.name}</p>
                <div className="mt-2 flex items-center gap-2"><div className="h-2 flex-1 rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${w.progress}%` }} /></div><span className="text-xs font-semibold">{w.progress}%</span></div>
              </div>
              <CardBody><ul>{w.nodes.map((n) => <Node key={n.id} n={n} />)}</ul></CardBody>
            </Card>
          ))}
        </div>
      ) : <EmptyState title="No worlds unlocked" body="Enroll in a course to open your first world." action={{ label: "My courses", href: "/student/courses" }} />}
    </Page>
  );
}

// ---------------------------------------------------------------- AI tutor
export function StudentAiTutorPage() {
  const hist = useAiHistory();
  const ask = useAiAsk();
  const [text, setText] = useState("");
  const msgs = hist.data?.items ?? [];
  const send = () => { const t = text.trim(); if (!t) return; ask.mutate({ message: t, kind: "TUTOR" }); setText(""); };
  return (
    <StudentShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title="Kidora AI Tutor" sub="Ask about a lesson, get a hint, or practice with new questions." />}>
      <Card className="flex h-[calc(100vh-14rem)] min-h-[420px] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
          {hist.isPending ? <Skeleton className="h-24" /> : hist.isError ? <ErrorState error={hist.error} retry={() => hist.refetch()} /> : msgs.length ? msgs.map((m) => (
            <div key={m.id} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "assistant" && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-info-50 text-info-600" aria-hidden><Bot size={16} /></span>}
              <p className={cn("max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm", m.role === "user" ? "bg-brand-600 text-white" : "bg-slate-100 text-ink")}>{m.content}</p>
            </div>
          )) : <EmptyState icon={<Bot size={22} />} title="Say hi to your tutor" body="Try: “Explain fractions with pizza” or “Give me 3 practice questions on decimals”." />}
          {ask.isPending && <p className="text-xs text-muted">Kidora is thinking…</p>}
          {ask.isError && <p className="text-xs text-danger-600">{(ask.error as Error).message}</p>}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-slate-100 p-3">
          <input value={text} onChange={(e) => setText(e.target.value)} className="input" placeholder="Ask a question about your lesson" aria-label="Message" />
          <button type="submit" className="btn-primary" disabled={ask.isPending || !text.trim()} aria-label="Send"><Send size={16} /></button>
        </form>
        {ask.data && <p className="px-4 pb-2 text-[11px] text-muted">{ask.data.remainingToday} questions left today</p>}
      </Card>
    </StudentShell>
  );
}

// ---------------------------------------------------------------- Profile
/**
 * The student's own profile. Everything shown comes from /student/dashboard,
 * /student/certificates and /student/badges — no separate profile endpoint is
 * needed, and nothing here is editable that the backend treats as protected
 * (role, school and grade are set by the school, not the student).
 */
export function StudentProfilePage() {
  const q = useStudentDashboard();
  const certs = useStudentCertificates();
  const badges = useStudentBadges();

  return (
    <Page title="Profile" sub="Your learning journey so far" q={q}>
      {(d) => (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardBody className="text-center">
              <div className="mx-auto w-fit"><Avatar name={d.profile.name} src={d.profile.avatarUrl} color={d.profile.avatarColor} size={72} /></div>
              <p className="mt-3 text-lg font-semibold">{d.profile.displayName || d.profile.name}</p>
              {d.profile.schoolName && <p className="text-sm text-muted">{d.profile.schoolName}</p>}
              <div className="mt-3 flex justify-center gap-2">
                <Pill tone="brand">Level {d.profile.level}</Pill>
                <Pill tone="warning">{fmtNumber(d.profile.xp)} XP</Pill>
              </div>
              <div className="mt-4">
                <ProgressBar value={Math.round((d.profile.xp / Math.max(1, d.profile.xpForNextLevel)) * 100)} />
                <p className="mt-1 text-xs text-muted">{fmtNumber(d.profile.xpForNextLevel - d.profile.xp)} XP to level {d.profile.level + 1}</p>
              </div>
              <Link href="/student/settings" className="btn-secondary mt-4 w-full">Edit settings</Link>
            </CardBody>
          </Card>

          <div className="grid gap-4 lg:col-span-2">
            <Card>
              <CardHeader title="Learning statistics" />
              <CardBody>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Courses", d.stats.coursesEnrolled],
                    ["Lessons", d.stats.lessonsCompleted],
                    ["Quizzes", d.stats.quizzesCompleted],
                    ["Avg score", `${d.stats.averageScore}%`],
                  ].map(([label, value]) => (
                    <div key={label as string} className="rounded-2xl bg-brand-50 p-3 text-center">
                      <p className="text-xl font-bold text-ink">{value as ReactNode}</p>
                      <p className="text-xs text-muted">{label as string}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-brand-50 p-3">
                  <Trophy className="h-5 w-5 text-brand-600" />
                  <p className="text-sm font-semibold">{d.profile.streak} day streak · {fmtNumber(d.profile.coins)} coins</p>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Certificates" action="See all" href="/student/certificates" />
              <CardBody>
                {certs.isPending ? <Skeleton className="h-16" />
                  : certs.data?.length ? (
                    <ul className="grid gap-2">
                      {certs.data.slice(0, 3).map((c) => (
                        <li key={c.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                          <Award className="h-5 w-5 text-brand-600" />
                          <span className="flex-1 text-sm font-semibold">{c.courseName}</span>
                          <span className="text-xs text-muted">{fmtDate(c.issuedAt)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <EmptyState title="No certificates yet" body="Finish a course to earn your first one." />}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Badges" action="See all" href="/student/badges" />
              <CardBody>
                {badges.isPending ? <Skeleton className="h-16" />
                  : badges.data?.filter((b) => b.earnedAt).length ? (
                    <div className="flex flex-wrap gap-2">
                      {badges.data.filter((b) => b.earnedAt).slice(0, 8).map((b) => (
                        <span key={b.id} className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-semibold">{b.glyph} {b.name}</span>
                      ))}
                    </div>
                  ) : <EmptyState title="No badges yet" body="Complete lessons and quizzes to unlock them." />}
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </Page>
  );
}
