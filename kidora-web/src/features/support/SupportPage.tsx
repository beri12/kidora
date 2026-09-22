"use client";
import { useState } from "react";
import { LifeBuoy, MessageSquare, Search, Send, CheckCircle2 } from "lucide-react";
import { Card, CardBody, CardHeader, EmptyState, ErrorState, Skeleton, Pill, Tabs } from "@/components/dashboard";
import { useCloseTicket, useCreateTicket, useReplyToTicket, useTicket, useTickets } from "@/hooks/useSupport";
import type { TicketCategory, TicketStatus } from "@/lib/api/support";

const STATUS_TONE: Record<TicketStatus, "brand" | "success" | "warning" | "neutral"> = {
  OPEN: "warning", IN_PROGRESS: "brand", RESOLVED: "success", CLOSED: "neutral",
};

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: "GENERAL", label: "General" },
  { value: "ACCOUNT", label: "Account" },
  { value: "BILLING", label: "Billing" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "COURSE", label: "Course content" },
  { value: "SAFETY", label: "Safety" },
];

/** Static help content — no backend needed, and useful while a ticket is open. */
const FAQ = [
  { q: "How do I add another child to my account?", a: "Ask your child's school for their join code, then enter it on the child's account. Children linked to you appear in the child selector on every parent page." },
  { q: "Why is my child's progress empty?", a: "Progress appears once your child completes their first lesson or quiz. If they have been working and it is still empty, open a ticket and include their name." },
  { q: "How do I change my language?", a: "Settings → Language & appearance. The choice is saved to your account, so it follows you to any device." },
  { q: "How do I sign in with a code instead of a password?", a: "On the login page choose the SMS code tab and enter the mobile number on your account. We text you a six-digit code that expires in five minutes." },
  { q: "Can I stop my child appearing on leaderboards?", a: "Yes — Settings → Privacy, turn off \"Show me on leaderboards\"." },
  { q: "How do certificates work?", a: "A certificate is issued automatically when a course is completed, and appears under Certificates. It carries a verification code anyone can check." },
];

export function SupportPage() {
  const [tab, setTab] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [search, setSearch] = useState("");

  const tickets = useTickets(tab === "all" ? undefined : tab);
  const faq = FAQ.filter((f) => !search.trim() || (f.q + f.a).toLowerCase().includes(search.toLowerCase()));

  if (openId) return <TicketThread id={openId} onBack={() => setOpenId(null)} />;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="grid gap-4 lg:col-span-2">
        <Card>
          <CardHeader title="My tickets" action={undefined} />
          <CardBody>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <Tabs
                value={tab}
                onChange={setTab}
                options={[{ value: "all", label: "All" }, { value: "OPEN", label: "Open" }, { value: "IN_PROGRESS", label: "In progress" }, { value: "RESOLVED", label: "Resolved" }, { value: "CLOSED", label: "Closed" }]}
              />
              <button type="button" className="btn-primary" onClick={() => setComposing(true)}>
                <MessageSquare size={16} /> Contact support
              </button>
            </div>

            {tickets.isPending ? <div className="grid gap-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
              : tickets.isError ? <ErrorState error={tickets.error} retry={() => tickets.refetch()} />
              : tickets.data?.length ? (
                <ul className="grid gap-2">
                  {tickets.data.map((t) => (
                    <li key={t.id}>
                      <button type="button" onClick={() => setOpenId(t.id)}
                        className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left hover:bg-brand-50">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">{t.subject}</span>
                          <span className="block text-xs text-muted">
                            {t.reference} · {t._count.messages} message{t._count.messages === 1 ? "" : "s"} · updated {new Date(t.updatedAt).toLocaleDateString()}
                          </span>
                        </span>
                        <Pill tone={STATUS_TONE[t.status]}>{t.status.replace("_", " ")}</Pill>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="No tickets yet"
                  body="If something is not working, tell us and we will look into it."
                  action={{ label: "Contact support", onClick: () => setComposing(true) }}
                />
              )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader title="Help centre" sub="Answers to the most common questions" />
          <CardBody>
            <label className="mb-3 flex items-center gap-2 rounded-xl border border-line px-3 py-2">
              <Search size={16} className="text-muted" aria-hidden />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search help"
                aria-label="Search help" className="w-full bg-transparent text-sm outline-none" />
            </label>
            {faq.length ? (
              <ul className="grid gap-2">
                {faq.map((f) => (
                  <li key={f.q}>
                    <details className="rounded-xl border border-line p-3">
                      <summary className="cursor-pointer text-sm font-semibold text-ink">{f.q}</summary>
                      <p className="mt-2 text-sm text-muted">{f.a}</p>
                    </details>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="No matches" body="Try different words, or open a ticket." />}
          </CardBody>
        </Card>
      </div>

      {composing && <NewTicketModal onClose={() => setComposing(false)} onCreated={(id) => { setComposing(false); setOpenId(id); }} />}
    </div>
  );
}

function NewTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const create = useCreateTicket();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<TicketCategory>("GENERAL");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim().length < 4) return setError("Give your ticket a short subject.");
    if (message.trim().length < 10) return setError("Please describe the problem in a little more detail.");
    setError("");
    create.mutate({ subject: subject.trim(), message: message.trim(), category },
      { onSuccess: (t) => onCreated(t.id), onError: (err) => setError(err instanceof Error ? err.message : "Could not send. Try again.") });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Contact support" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="grid w-full max-w-md gap-3 rounded-3xl bg-white p-5 shadow-xl">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ink"><LifeBuoy size={18} /> Contact support</h2>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Subject</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={160}
            className="rounded-xl border border-line px-3 py-2" placeholder="Cannot see my child's progress" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)} className="rounded-xl border border-line px-3 py-2">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">What happened?</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={4000}
            className="rounded-xl border border-line px-3 py-2" placeholder="Tell us what you expected and what you saw instead." />
        </label>
        {error && <p className="text-sm font-semibold text-danger-600">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={create.isPending}>{create.isPending ? "Sending…" : "Send"}</button>
        </div>
      </form>
    </div>
  );
}

function TicketThread({ id, onBack }: { id: string; onBack: () => void }) {
  const q = useTicket(id);
  const reply = useReplyToTicket(id);
  const close = useCloseTicket();
  const [body, setBody] = useState("");

  if (q.isPending) return <Skeleton className="h-96" />;
  if (q.isError) return <ErrorState error={q.error} retry={() => q.refetch()} />;
  const t = q.data!;
  const closed = t.status === "CLOSED";

  return (
    <Card>
      <CardHeader title={t.subject} sub={`${t.reference} · ${t.category.toLowerCase()}`} />
      <CardBody>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={onBack} className="btn-secondary">← All tickets</button>
          <Pill tone={STATUS_TONE[t.status]}>{t.status.replace("_", " ")}</Pill>
          {!closed && (
            <button type="button" className="btn-secondary ml-auto" disabled={close.isPending}
              onClick={() => close.mutate(t.id, { onSuccess: () => q.refetch() })}>
              <CheckCircle2 size={16} /> {close.isPending ? "Closing…" : "Close ticket"}
            </button>
          )}
        </div>

        <ul className="grid gap-3">
          {t.messages.map((m) => (
            <li key={m.id} className="rounded-2xl border border-line p-3">
              <p className="text-xs font-semibold text-muted">
                {m.author.name} · {m.author.role} · {new Date(m.createdAt).toLocaleString()}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{m.body}</p>
            </li>
          ))}
        </ul>

        {closed ? (
          <p className="mt-4 rounded-xl bg-brand-50 p-3 text-sm text-muted">
            This ticket is closed. Open a new one if you need more help.
          </p>
        ) : (
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!body.trim()) return;
              reply.mutate(body.trim(), { onSuccess: () => setBody("") });
            }}
          >
            <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply…"
              aria-label="Reply" className="flex-1 rounded-xl border border-line px-3 py-2 text-sm" maxLength={4000} />
            <button type="submit" className="btn-primary" disabled={reply.isPending || !body.trim()}>
              <Send size={16} /> {reply.isPending ? "Sending…" : "Send"}
            </button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
