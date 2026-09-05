"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Send, Star } from "lucide-react";
import { ParentShell } from "./ParentShell";
import { useSelectedChild } from "./useSelectedChild";
import { useChildAssignments, useChildActivity, useChildAchievements, useChildAssessments, useConversations, useMessages, useSendMessage, useParentDashboard } from "@/lib/hooks/queries";
import { TopHeader, Card, CardHeader, CardBody, Pill, ProgressBar, Avatar, EmptyState, ErrorState, Skeleton, Tabs, ActivityList, cn } from "@/components/dashboard";
import { dueLabel, fmtDate, timeAgo } from "@/lib/format";

function Page<T>({ title, sub, q, children, actions }: { title: string; sub?: string; q: { isPending: boolean; isError: boolean; error: unknown; data?: T; refetch: () => unknown }; children: (d: T) => ReactNode; actions?: ReactNode }) {
  return (
    <ParentShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title={title} sub={sub} right={actions} />}>
      {q.isPending ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div> : q.isError ? <ErrorState error={q.error} retry={() => q.refetch()} /> : q.data !== undefined ? children(q.data) : null}
    </ParentShell>
  );
}

export function ParentProgressPage() {
  const sel = useSelectedChild();
  const q = useParentDashboard(sel.childId || undefined);
  return (
    <Page title="Courses & Progress" sub={sel.child?.name} q={q}>
      {(d) => d.subjectProgress.length ? <Card><CardBody className="space-y-4 pt-4">{d.subjectProgress.map((s) => <div key={s.subject}><div className="mb-1 flex justify-between text-sm"><span className="font-medium">{s.subject}</span><span className="font-semibold">{s.percent}%</span></div><ProgressBar value={s.percent} color={s.accent} /></div>)}</CardBody></Card> : <EmptyState title="No courses yet" body="Progress shows once your child is enrolled." />}
    </Page>
  );
}

export function ParentActivityPage() {
  const sel = useSelectedChild(); const [page, setPage] = useState(1);
  const q = useChildActivity(sel.childId, page);
  const pages = Math.max(1, Math.ceil((q.data?.total ?? 0) / 20));
  return (
    <Page title="Activity" sub={sel.child?.name} q={q}>
      {(d) => <Card><CardBody className="pt-2"><ActivityList items={d.items} emptyBody="Lessons, quizzes and achievements will show here." />
        {pages > 1 && <div className="mt-4 flex justify-between text-xs text-muted"><span>Page {page} of {pages}</span><div className="flex gap-2"><button type="button" className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button type="button" className="btn-ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div></div>}
      </CardBody></Card>}
    </Page>
  );
}

export function ParentAssignmentsPage() {
  const sel = useSelectedChild();
  const [tab, setTab] = useState<"all" | "UPCOMING" | "PENDING" | "GRADED" | "OVERDUE">("all");
  const q = useChildAssignments(sel.childId, tab === "all" ? undefined : tab);
  const tone = (s: string) => s === "GRADED" ? "success" : s === "SUBMITTED" ? "info" : s === "OVERDUE" ? "danger" : s === "PENDING" ? "warning" : "neutral";
  return (
    <Page title="Assignments" sub={sel.child?.name} q={q} actions={<Tabs value={tab} onChange={setTab} options={[{ value: "all", label: "All" }, { value: "UPCOMING", label: "Upcoming" }, { value: "PENDING", label: "Pending" }, { value: "GRADED", label: "Completed" }, { value: "OVERDUE", label: "Overdue" }]} />}>
      {(list) => list.length ? <ul className="space-y-2">{list.map((a) => { const due = dueLabel(a.dueAt); return (
        <Card key={a.id} as="li" className="flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1"><p className="font-semibold">{a.title}</p><p className="text-xs text-muted">{[a.subject, a.teacher].filter(Boolean).join(" · ")}</p>{a.status === "GRADED" && a.score != null && <p className="mt-1 text-sm text-success-700">Score {a.score}/{a.maxScore}</p>}</div>
          <Pill tone={tone(a.status)}>{a.status[0] + a.status.slice(1).toLowerCase()}</Pill><Pill tone={due.tone}>{due.text}</Pill>
        </Card>
      ); })}</ul> : <EmptyState title="No assignments" body="Nothing here for this filter." />}
    </Page>
  );
}

export function ParentAssessmentsPage() {
  const sel = useSelectedChild();
  const q = useChildAssessments(sel.childId);
  return (
    <Page title="Quizzes & Exams" sub={sel.child?.name} q={q}>
      {(d) => (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader title="Quizzes" /><CardBody className="pt-2">{d.quizzes.length ? <ul className="divide-y divide-slate-100">{d.quizzes.map((z) => <li key={z.id} className="flex items-center gap-3 py-2.5"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{z.title}</p><p className="text-xs text-muted">{z.course} · {z.attemptsUsed}/{z.maxAttempts} attempts</p></div>{z.bestPercent != null ? <span className={cn("text-sm font-semibold", z.bestPercent >= 80 ? "text-success-700" : z.bestPercent >= 60 ? "text-ink" : "text-danger-600")}>{z.bestPercent}%</span> : <Pill tone="neutral">Not taken</Pill>}</li>)}</ul> : <EmptyState title="No quizzes yet" />}</CardBody></Card>
          <Card><CardHeader title="Exams" /><CardBody className="pt-2">{d.exams.length ? <ul className="divide-y divide-slate-100">{d.exams.map((e) => <li key={e.id} className="flex items-center gap-3 py-2.5"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{e.title}</p><p className="text-xs text-muted">{e.course}{e.scheduledAt ? ` · ${fmtDate(e.scheduledAt)}` : ""}</p></div>{e.result ? <Pill tone={e.result.passed ? "success" : "danger"}>{e.result.percent}% · {e.result.passed ? "Passed" : "Not passed"}</Pill> : <Pill tone="info">{e.status[0] + e.status.slice(1).toLowerCase()}</Pill>}</li>)}</ul> : <EmptyState title="No exams scheduled" />}</CardBody></Card>
        </div>
      )}
    </Page>
  );
}

export function ParentAchievementsPage() {
  const sel = useSelectedChild();
  const q = useChildAchievements(sel.childId);
  return (
    <Page title="Achievements" sub={sel.child?.name} q={q}>
      {(list) => list.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{list.map((a) => (
        <Card key={a.id} className={cn("flex items-start gap-3 p-4", !a.unlockedAt && "opacity-70")}>
          <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", a.unlockedAt ? "bg-brand-50 text-brand-600" : "bg-slate-100 text-slate-400")} aria-hidden><Star size={20} /></span>
          <div className="min-w-0 flex-1"><p className="font-semibold">{a.title}</p><p className="text-xs text-muted">{a.description}</p>
            {a.unlockedAt ? <p className="mt-1 text-xs text-success-700">Unlocked {fmtDate(a.unlockedAt)} · +{a.xpReward} XP</p> : <div className="mt-2 flex items-center gap-2"><ProgressBar value={(a.progress / Math.max(1, a.requirement)) * 100} size="sm" /><span className="text-[11px] text-muted">{a.progress}/{a.requirement}</span></div>}
          </div>
        </Card>
      ))}</div> : <EmptyState title="No achievements yet" body="They unlock as lessons and quizzes are completed." />}
    </Page>
  );
}

export function ParentMessagesPage({ conversationId }: { conversationId?: string }) {
  const convs = useConversations();
  const [active, setActive] = useState<string>(conversationId ?? "");
  const id = active || convs.data?.[0]?.id || "";
  const msgs = useMessages(id);
  const send = useSendMessage(id);
  const [text, setText] = useState("");
  return (
    <ParentShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title="Messages" sub="Talk with your child's teachers" />}>
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="max-h-[70vh] overflow-y-auto">
          <CardHeader title="Conversations" />
          <CardBody className="pt-2">
            {convs.isPending ? <Skeleton className="h-40" /> : convs.isError ? <ErrorState error={convs.error} retry={() => convs.refetch()} /> : convs.data?.length ? <ul className="space-y-1">{convs.data.map((c) => (
              <li key={c.id}><button type="button" onClick={() => setActive(c.id)} className={cn("focus-ring flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50", c.id === id && "bg-brand-50")}>
                <Avatar name={c.participant.name} src={c.participant.avatarUrl} size={36} />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{c.participant.name}</span><span className="block truncate text-xs text-muted">{c.studentName ? `About ${c.studentName} · ` : ""}{c.lastMessage?.body ?? "No messages yet"}</span></span>
                {c.unread > 0 && <span className="rounded-full bg-danger-500 px-1.5 text-[10px] font-bold text-white">{c.unread}</span>}
              </button></li>
            ))}</ul> : <EmptyState title="No conversations" body="Teachers of your linked children can be messaged from their class page." />}
          </CardBody>
        </Card>
        <Card className="flex h-[70vh] flex-col">
          <div className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">
            {!id ? <EmptyState title="Select a conversation" /> : msgs.isPending ? <Skeleton className="h-32" /> : msgs.isError ? <ErrorState error={msgs.error} retry={() => msgs.refetch()} /> : msgs.data?.length ? msgs.data.map((m) => (
              <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}><div className={cn("max-w-[75%] rounded-2xl px-4 py-2 text-sm", m.mine ? "bg-brand-600 text-white" : "bg-slate-100")}><p className="whitespace-pre-wrap">{m.body}</p><p className={cn("mt-1 text-[10px]", m.mine ? "text-white/70" : "text-muted")}>{timeAgo(m.createdAt)}</p></div></div>
            )) : <EmptyState title="No messages yet" body="Say hello to start the conversation." />}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; send.mutate(text.trim(), { onSuccess: () => setText("") }); }} className="flex items-center gap-2 border-t border-slate-100 p-3">
            <input value={text} onChange={(e) => setText(e.target.value)} className="input" placeholder="Write a message" aria-label="Message" disabled={!id} />
            <button type="submit" className="btn-primary" disabled={!id || send.isPending || !text.trim()} aria-label="Send"><Send size={16} /></button>
          </form>
        </Card>
      </div>
      <p className="mt-2 text-[11px] text-muted"><Link href="/parent/support" className="underline">Need help?</Link> Messages are private between you and your child's teacher.</p>
    </ParentShell>
  );
}
