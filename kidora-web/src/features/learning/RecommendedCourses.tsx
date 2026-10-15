"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { learningApi } from "@/lib/api/learning";

/**
 * Popular published courses this student can open and has not joined yet.
 * The list comes from /learning/browse, which already hides courses the
 * student may not see (another school's, unpublished).
 */
export function RecommendedCourses() {
  const q = useQuery({
    queryKey: ["learning", "recommended"],
    queryFn: () => learningApi.browse({ sort: "popular", pageSize: 12 }),
    staleTime: 5 * 60_000,
  });
  const items = (q.data?.items ?? []).filter((c) => !c.enrolled).slice(0, 4);
  if (q.isPending || !items.length) return null;

  return (
    <section aria-labelledby="rec-title" className="rounded-2xl border border-line bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 id="rec-title" className="font-display text-lg font-extrabold text-ink">Recommended for you</h2>
        <Link href="/courses" className="text-sm font-bold text-iris-700 hover:underline">Browse all</Link>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((c) => (
          <li key={c.id}>
            <Link href={`/student/courses/${c.id}`} className="flex h-full gap-3 rounded-xl border border-line p-3 transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-lg font-extrabold text-white" style={{ background: c.subjectAccent || c.accent }} aria-hidden>
                {c.subject.slice(0, 1)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-bold text-ink">{c.title}</span>
                <span className="block text-xs font-semibold text-muted">
                  {c.subject}{c.grade ? ` · ${c.grade}` : ""} · {c.totalLessons} lessons{c.access === "PREMIUM" ? " · Premium" : ""}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
