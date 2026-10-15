"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, KeyRound, RefreshCw, UserPlus } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/dashboard";
import { serverMessage } from "@/lib/api/client";
import { courseAccessApi, type AssignResult } from "@/lib/api/learning";

/**
 * On a course's Publish step: its access code (create, copy, replace, switch
 * off) and "Assign to students". Everything is checked again on the server —
 * who may manage the code, and which students this person may enrol.
 */
export function CourseAccessPanel({ courseId, live }: { courseId: string; live: boolean }) {
  const qc = useQueryClient();
  const key = ["course-access", courseId];
  const code = useQuery({ queryKey: key, queryFn: () => courseAccessApi.get(courseId) });
  const set = (d: Awaited<ReturnType<typeof courseAccessApi.get>>) => qc.setQueryData(key, d);
  const rotate = useMutation({ mutationFn: () => courseAccessApi.rotate(courseId), onSuccess: set });
  const toggle = useMutation({ mutationFn: (on: boolean) => courseAccessApi.setEnabled(courseId, on), onSuccess: set });
  const [copied, setCopied] = useState(false);

  const c = code.data;
  const copy = async () => {
    if (!c?.code) return;
    try { await navigator.clipboard.writeText(c.code); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked */ }
  };

  return (
    <Card>
      <CardHeader title="Course code" sub="Students enter it on their dashboard to join." />
      <CardBody className="space-y-3">
        {code.isPending ? (
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
        ) : !c?.code ? (
          <button type="button" className="btn-primary w-full" disabled={rotate.isPending} onClick={() => rotate.mutate()}>
            <KeyRound size={15} aria-hidden /> {rotate.isPending ? "Creating…" : "Create a course code"}
          </button>
        ) : (
          <>
            <div className={`flex items-center gap-2 rounded-2xl border p-3 ${c.enabled ? "border-brand-300 bg-brand-50/60" : "border-slate-200 bg-slate-50 opacity-70"}`}>
              <span className="flex-1 font-mono text-xl font-bold tracking-widest text-ink" aria-label={`Course code ${c.code.split("").join(" ")}`}>{c.code}</span>
              <button type="button" onClick={copy} className="btn-ghost px-3" aria-label="Copy course code">
                {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
                <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
              <span>
                <span className="font-medium">Code is {c.enabled ? "on" : "off"}</span>
                <span className="block text-xs text-muted">{c.enabled ? "Anyone with it can join." : "Nobody can join with it right now."}</span>
              </span>
              <input type="checkbox" role="switch" checked={c.enabled} disabled={toggle.isPending}
                onChange={(e) => toggle.mutate(e.target.checked)} className="size-5 accent-brand-700" />
            </label>
            <button type="button" className="btn-ghost w-full text-xs" disabled={rotate.isPending}
              onClick={() => { if (confirm("Replace this code? The old one stops working immediately; students already enrolled stay enrolled.")) rotate.mutate(); }}>
              <RefreshCw size={13} aria-hidden /> Replace code
            </button>
            {!live && <p className="text-xs text-warning-700">Students can join once the course is published.</p>}
          </>
        )}
        {(rotate.isError || toggle.isError) && (
          <p className="text-sm text-danger-600" role="alert">{serverMessage(rotate.error ?? toggle.error) ?? "That didn't work. Please try again."}</p>
        )}
      </CardBody>
      {live && <AssignStudents courseId={courseId} />}
    </Card>
  );
}

function AssignStudents({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<AssignResult | null>(null);
  const list = useQuery({ queryKey: ["assignable", courseId], queryFn: () => courseAccessApi.assignable(courseId), enabled: open });
  const assign = useMutation({
    mutationFn: () => courseAccessApi.assign(courseId, [...picked]),
    onSuccess: (r) => { setResult(r); setPicked(new Set()); void list.refetch(); },
  });

  if (!open) {
    return (
      <div className="border-t border-line p-4">
        <button type="button" className="btn-ghost w-full" onClick={() => setOpen(true)}><UserPlus size={15} aria-hidden /> Assign to students</button>
      </div>
    );
  }
  const students = list.data ?? [];
  return (
    <div className="space-y-3 border-t border-line p-4">
      <p className="text-sm font-semibold">Assign to students</p>
      {list.isPending ? <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        : list.isError ? <p className="text-sm text-danger-600" role="alert">{serverMessage(list.error) ?? "Couldn't load your students."}</p>
        : students.length === 0 ? <p className="text-sm text-muted">No students yet. Students in your classes appear here.</p>
        : (
          <ul className="max-h-64 space-y-1 overflow-auto">
            {students.map((s) => (
              <li key={s.id}>
                <label className={`flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm ${s.enrolled ? "opacity-60" : "cursor-pointer hover:bg-slate-50"}`}>
                  <input type="checkbox" disabled={s.enrolled} checked={s.enrolled || picked.has(s.id)} className="size-4 accent-brand-700"
                    onChange={(e) => setPicked((p) => { const n = new Set(p); if (e.target.checked) n.add(s.id); else n.delete(s.id); return n; })} />
                  <span className="grid size-7 place-items-center rounded-full text-xs font-bold text-white" style={{ background: s.avatarColor }} aria-hidden>{s.name.slice(0, 1)}</span>
                  <span className="flex-1">{s.name}{s.grade && <span className="text-xs text-muted"> · {s.grade}</span>}</span>
                  {s.enrolled && <span className="text-xs text-muted">Enrolled</span>}
                </label>
              </li>
            ))}
          </ul>
        )}
      {result && (
        <p className="rounded-xl bg-success-50 p-2 text-xs text-success-800" role="status">
          {result.enrolled} enrolled{result.alreadyEnrolled ? `, ${result.alreadyEnrolled} already in` : ""}
          {result.notAllowed ? `, ${result.notAllowed} can't take this course (${result.results.find((r) => r.message)?.message ?? "not eligible"})` : ""}.
        </p>
      )}
      {assign.isError && <p className="text-sm text-danger-600" role="alert">{serverMessage(assign.error) ?? "Couldn't assign the course."}</p>}
      <button type="button" className="btn-primary w-full" disabled={!picked.size || assign.isPending} onClick={() => assign.mutate()}>
        {assign.isPending ? "Assigning…" : `Assign${picked.size ? ` to ${picked.size}` : ""}`}
      </button>
    </div>
  );
}
