"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, PartyPopper } from "lucide-react";
import { serverMessage } from "@/lib/api/client";
import { courseAccessApi, type JoinByCodeResult } from "@/lib/api/learning";
import { emojiBurst } from "@/lib/motion";

/** Loose client-side shape check only; the server validates the code for real. */
const LOOKS_LIKE_CODE = /^[A-Za-z0-9]{2,4}-?[A-Za-z0-9]{6}$/;

/**
 * "Have a course code?" — a student types the code their teacher shared
 * (e.g. CPP-7K4M9X) and is enrolled. Enrolment, eligibility and rate limits
 * all happen on the server; this card only shows the answer.
 */
export function CourseCodeCard() {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState<JoinByCodeResult | null>(null);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim();
    if (!LOOKS_LIKE_CODE.test(c)) { setError("Course codes look like CPP-7K4M9X."); return; }
    setBusy(true);
    setError("");
    try {
      const res = await courseAccessApi.join(c);
      setJoined(res);
      setCode("");
      emojiBurst(document.getElementById("course-code"));
      void qc.invalidateQueries({ queryKey: ["student"] });
      void qc.invalidateQueries({ queryKey: ["learning"] });
    } catch (err) {
      setError(serverMessage(err) ?? "That code didn’t work. Check it with your teacher and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="course-code" aria-labelledby="course-code-title" className="scroll-mt-24 overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-iris-50 via-white to-sky-50 p-5 shadow-sm">
      {joined ? (
        <div className="text-center" role="status">
          <PartyPopper className="mx-auto h-9 w-9 text-iris-600" aria-hidden />
          <h2 className="mt-2 font-display text-xl font-extrabold text-ink">{joined.alreadyEnrolled ? "You're already in! 👍" : "You're enrolled! 🎉"}</h2>
          <p className="mt-1 text-sm font-semibold text-muted">{joined.course.title}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href={`/student/courses/${joined.course.id}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-iris-600 px-5 font-extrabold text-white hover:bg-iris-700">Start Learning</Link>
            <button type="button" onClick={() => setJoined(null)} className="min-h-11 rounded-xl px-4 font-bold text-iris-700 hover:bg-iris-50">Enter another code</button>
          </div>
        </div>
      ) : (
        <form onSubmit={join} noValidate>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-iris-100 text-iris-700" aria-hidden><KeyRound className="h-5 w-5" /></span>
            <div>
              <h2 id="course-code-title" className="font-display text-lg font-extrabold text-ink">Have a course code?</h2>
              <p className="text-xs font-semibold text-muted">Your teacher or school can give you one.</p>
            </div>
          </div>
          <label htmlFor="course-code-input" className="sr-only">Course code</label>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              id="course-code-input"
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
              placeholder="Enter course code"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={16}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "course-code-error" : undefined}
              className="min-h-12 flex-1 rounded-xl border border-line bg-white px-4 font-mono text-base font-bold tracking-widest text-ink outline-none placeholder:font-body placeholder:tracking-normal placeholder:text-slate-400 focus:border-iris-500 focus:ring-4 focus:ring-iris-100"
            />
            <button type="submit" disabled={busy || !code.trim()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-iris-600 px-5 font-extrabold text-white hover:bg-iris-700 disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Join Course
            </button>
          </div>
          {error && <p id="course-code-error" role="alert" className="mt-2 text-sm font-bold text-danger-600">{error}</p>}
        </form>
      )}
    </section>
  );
}
