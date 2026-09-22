"use client";
import { useState } from "react";
import { Send } from "lucide-react";
import { Card, CardBody, CardHeader, Avatar, EmptyState, ErrorState, Skeleton, cn } from "@/components/dashboard";
import { useConversations, useMessages, useSendMessage } from "@/lib/hooks/queries";
import { timeAgo } from "@/lib/format";

/**
 * Conversation list + thread, shared by every role.
 *
 * The endpoints (/lms/messages/conversations) are role-agnostic: the backend
 * returns only the conversations the caller is a member of, so the same
 * component is correct for a parent, a teacher and school staff without any
 * client-side filtering to get wrong.
 */
export function MessagesView({ conversationId, emptyHint }: { conversationId?: string; emptyHint?: string }) {
  const convs = useConversations();
  const [active, setActive] = useState<string>(conversationId ?? "");
  const id = active || convs.data?.[0]?.id || "";
  const msgs = useMessages(id);
  const send = useSendMessage(id);
  const [text, setText] = useState("");

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="max-h-[70vh] overflow-y-auto">
        <CardHeader title="Conversations" />
        <CardBody className="pt-2">
          {convs.isPending ? <Skeleton className="h-40" />
            : convs.isError ? <ErrorState error={convs.error} retry={() => convs.refetch()} />
            : convs.data?.length ? (
              <ul className="space-y-1">
                {convs.data.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setActive(c.id)}
                      className={cn("focus-ring flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50", c.id === id && "bg-brand-50")}
                    >
                      <Avatar name={c.participant.name} src={c.participant.avatarUrl} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{c.participant.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {c.studentName ? `About ${c.studentName} · ` : ""}{c.lastMessage?.body ?? "No messages yet"}
                        </span>
                      </span>
                      {c.unread > 0 && <span className="rounded-full bg-danger-500 px-1.5 text-[10px] font-bold text-white">{c.unread}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="No conversations" body={emptyHint ?? "New conversations appear here."} />}
        </CardBody>
      </Card>

      <Card className="flex h-[70vh] flex-col">
        <div className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">
          {!id ? <EmptyState title="Select a conversation" />
            : msgs.isPending ? <Skeleton className="h-32" />
            : msgs.isError ? <ErrorState error={msgs.error} retry={() => msgs.refetch()} />
            : msgs.data?.length ? msgs.data.map((m) => (
              <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[75%] rounded-2xl px-4 py-2 text-sm", m.mine ? "bg-brand-600 text-white" : "bg-slate-100")}>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className={cn("mt-1 text-[10px]", m.mine ? "text-white/70" : "text-muted")}>{timeAgo(m.createdAt)}</p>
                </div>
              </div>
            )) : <EmptyState title="No messages yet" body="Say hello to start the conversation." />}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; send.mutate(text.trim(), { onSuccess: () => setText("") }); }}
          className="flex items-center gap-2 border-t border-slate-100 p-3"
        >
          <input value={text} onChange={(e) => setText(e.target.value)} className="input" placeholder="Write a message" aria-label="Message" disabled={!id} />
          <button type="submit" className="btn-primary" disabled={!id || send.isPending || !text.trim()} aria-label="Send"><Send size={16} /></button>
        </form>
      </Card>
    </div>
  );
}
