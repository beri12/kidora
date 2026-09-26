"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookPlus, Search } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/dashboard";
import { coursesApi } from "@/lib/api/courses";
import { serverMessage } from "@/lib/api/client";
import { courseAccessApi } from "@/lib/api/learning";

/**
 * A parent adds a course to their child's list. Only open or premium courses
 * are offered (the public catalogue), and the server still checks the child
 * may take it — a parent cannot use this to skip a paywall or an invitation.
 */
export function AssignCourseCard({ childId, childName }: { childId: string; childName: string }) {
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const catalogue = useQuery({ queryKey: ["courses", "catalogue"], queryFn: coursesApi.catalogue, staleTime: 5 * 60_000 });
  const assign = useMutation({
    mutationFn: (courseId: string) => courseAccessApi.assign(courseId, [childId]),
    onSuccess: (r, courseId) => {
      const title = catalogue.data?.find((c) => c.id === courseId)?.title ?? "the course";
      const row = r.results[0];
      setMsg(row?.status === "ENROLLED" ? { ok: true, text: `${childName} now has “${title}”.` }
        : row?.status === "ALREADY_ENROLLED" ? { ok: true, text: `${childName} already has “${title}”.` }
        : { ok: false, text: row?.message ?? `${childName} can't take “${title}” yet.` });
    },
    onError: (e) => setMsg({ ok: false, text: serverMessage(e) ?? "Couldn't add the course." }),
  });

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (catalogue.data ?? []).filter((c) => !term || c.title.toLowerCase().includes(term)).slice(0, 6);
  }, [catalogue.data, q]);

  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><BookPlus size={18} aria-hidden /> Add a course for {childName}</span>} sub="It appears on their dashboard straight away." />
      <CardBody className="space-y-3">
        <label className="relative block">
          <span className="sr-only">Search courses</span>
          <Search size={16} className="absolute left-3 top-3 text-slate-400" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses" className="min-h-10 w-full rounded-xl border border-line py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500" />
        </label>
        {catalogue.isPending ? <div className="h-24 animate-pulse rounded-xl bg-slate-100" /> : list.length === 0 ? (
          <p className="text-sm text-muted">No courses found.</p>
        ) : (
          <ul className="divide-y divide-line">
            {list.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{c.title}</span>
                  <span className="text-xs text-muted">{c.subject?.name ?? "Course"}{c.isPremium ? " · Premium" : ""}</span>
                </span>
                <button type="button" className="btn-ghost px-3 text-xs" disabled={assign.isPending} onClick={() => { setMsg(null); assign.mutate(c.id); }}>Add</button>
              </li>
            ))}
          </ul>
        )}
        {msg && <p role="status" className={`rounded-xl p-2 text-xs ${msg.ok ? "bg-success-50 text-success-800" : "bg-warning-50 text-warning-800"}`}>{msg.text}</p>}
      </CardBody>
    </Card>
  );
}
