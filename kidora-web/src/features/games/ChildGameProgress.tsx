"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { gamesApi } from "@/lib/api/games";
import { SUBJECT_LABEL } from "@/lib/games/worlds";

/**
 * Learning-game progress for one child, for the parent dashboard: mastery by
 * subject, recent levels and one suggestion. Aggregates only — the API never
 * returns raw attempts or timings.
 */
export function ChildGameProgress({ childId, childName }: { childId: string; childName: string }) {
  const q = useQuery({ queryKey: ["games", "student", childId], queryFn: () => gamesApi.studentProgress(childId), enabled: Boolean(childId) });
  const d = q.data;

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm" aria-labelledby="games-progress">
      <div className="flex items-center justify-between">
        <h2 id="games-progress" className="text-lg font-bold text-slate-900">🎮 Learning games</h2>
        {d && <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-bold text-orange-700">🔥 {d.student.streak}-day streak</span>}
      </div>
      {q.isLoading && <div className="mt-4 h-24 animate-pulse rounded-2xl bg-slate-50" />}
      {q.isError && <p className="mt-3 text-sm text-slate-500">Game progress isn&apos;t available right now.</p>}
      {d && d.subjects.length === 0 && (
        <p className="mt-3 text-sm text-slate-500">{childName} hasn&apos;t played a learning game yet. <Link href="/games" className="font-bold text-brand-700 underline">See the worlds</Link></p>
      )}
      {d && d.subjects.length > 0 && (
        <>
          <ul className="mt-4 space-y-2">
            {d.subjects.map((s) => (
              <li key={s.subject}>
                <div className="flex justify-between text-sm font-bold text-slate-700">
                  <span>{SUBJECT_LABEL[s.subject] ?? s.subject}</span><span>{s.mastery}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={s.mastery} aria-valuemin={0} aria-valuemax={100} aria-label={`${s.subject} mastery`}>
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${s.mastery}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-slate-500">{d.levelsCompleted} level{d.levelsCompleted === 1 ? "" : "s"} completed</p>
          {d.recommendation && (
            <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900">
              💡 Suggested: {d.recommendation.gameName} — {d.recommendation.levelName} ({d.recommendation.minutes} min). {d.recommendation.reason}
            </p>
          )}
        </>
      )}
    </section>
  );
}
