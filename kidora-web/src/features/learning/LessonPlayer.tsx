"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award, Check, ChevronLeft, ChevronRight, ClipboardList, Clock, Download, ListChecks, Menu, X,
} from "lucide-react";
import {
  Card, CardBody, CardHeader, ErrorState, Pill, ProgressBar, Skeleton, cn,
} from "@/components/dashboard";
import { RequireRole } from "@/components/shared/RequireRole";
import { useCompleteLesson, useLessonPlayer, useSaveLessonProgress } from "@/lib/hooks/queries";
import { ContentBlockView } from "@/features/course-builder/StepsCurriculum";
import type { CurriculumEntry } from "@/lib/api/learning";
import { dueLabel } from "@/lib/format";

export function LessonPlayerPage({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  return (
    <RequireRole allow={["CHILD"]}>
      <Player courseId={courseId} lessonId={lessonId} />
    </RequireRole>
  );
}

function Player({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const router = useRouter();
  const q = useLessonPlayer(courseId, lessonId);
  const saveProgress = useSaveLessonProgress();
  const complete = useCompleteLesson(courseId);
  const [railOpen, setRailOpen] = useState(false);
  const [justEarned, setJustEarned] = useState<{ xp: number; certificate: boolean } | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);
  const openedAt = useRef(Date.now());
  const lastSaved = useRef(0);

  // A fresh lesson restarts the clock, otherwise time from the previous one
  // would be added to this one's total.
  useEffect(() => { openedAt.current = Date.now(); lastSaved.current = 0; setJustEarned(null); }, [lessonId]);

  // Autosave how far they have scrolled and how long they have been reading.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const flush = () => {
      const scrollable = el.scrollHeight - el.clientHeight;
      const percent = scrollable > 20 ? Math.min(100, Math.round((el.scrollTop / scrollable) * 100)) : 100;
      const seconds = Math.round((Date.now() - openedAt.current) / 1000) - lastSaved.current;
      if (seconds < 5 && percent <= 0) return;
      lastSaved.current += seconds;
      saveProgress.mutate({ lessonId, percent, timeSpentSec: Math.max(0, seconds) });
    };
    const timer = setInterval(flush, 20_000);
    window.addEventListener("beforeunload", flush);
    return () => { clearInterval(timer); window.removeEventListener("beforeunload", flush); flush(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  if (q.isPending) return <div className="p-6"><Skeleton className="h-96" /></div>;
  if (q.isError) {
    return (
      <div className="p-6">
        <ErrorState error={q.error} retry={() => q.refetch()} />
        <Link href={`/student/courses/${courseId}`} className="btn-ghost mt-3 inline-flex">Back to the course</Link>
      </div>
    );
  }

  const { lesson, curriculum, nav, completion } = q.data!;
  const done = lesson.progress?.completed ?? false;

  const finish = () => {
    const seconds = Math.round((Date.now() - openedAt.current) / 1000);
    complete.mutate(
      { lessonId, timeSpentSec: seconds },
      {
        onSuccess: (r) => {
          setJustEarned({ xp: r.rewards.xp, certificate: Boolean(r.certificate) });
          if (nav.next) router.push(`/student/courses/${courseId}/learn/${nav.next.id}`);
        },
      },
    );
  };

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-2 sm:px-4">
        <Link href={`/student/courses/${courseId}`} className="btn-ghost shrink-0" aria-label="Back to the course">
          <ChevronLeft size={16} aria-hidden /> <span className="hidden sm:inline">Course</span>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{lesson.title}</p>
          <p className="text-xs text-muted">Lesson {nav.index + 1} of {nav.total}</p>
        </div>
        <div className="hidden w-32 sm:block">
          <ProgressBar value={completion.percent} size="sm" />
        </div>
        <button
          type="button"
          className="btn-ghost shrink-0 lg:hidden"
          onClick={() => setRailOpen(true)}
          aria-label="Open the lesson list"
        >
          <Menu size={16} aria-hidden />
        </button>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-4 p-3 sm:p-4 lg:grid-cols-[280px_minmax(0,1fr)_300px]">
        {/* LEFT: curriculum */}
        <Curriculum
          entries={curriculum}
          courseId={courseId}
          currentId={lessonId}
          open={railOpen}
          onClose={() => setRailOpen(false)}
        />

        {/* CENTRE: the lesson */}
        <main className="min-w-0">
          <Card>
            <CardBody>
              <div
                ref={bodyRef}
                className="max-h-[calc(100dvh-16rem)] space-y-4 overflow-y-auto pr-1"
                tabIndex={0}
                aria-label="Lesson content"
              >
                <h1 className="text-2xl font-bold">{lesson.title}</h1>
                {lesson.description && <p className="text-sm text-muted">{lesson.description}</p>}

                {lesson.objectives.length > 0 && (
                  <div className="rounded-2xl bg-brand-50/60 p-4">
                    <p className="text-sm font-semibold">By the end of this lesson you will be able to:</p>
                    <ul className="mt-1 list-disc pl-5 text-sm">{lesson.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul>
                  </div>
                )}

                {lesson.videoUrl && (
                  <video src={lesson.videoUrl} controls className="w-full rounded-2xl" aria-label={`${lesson.title} video`} />
                )}

                {lesson.contents.length === 0 && !lesson.videoUrl && (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">
                    This lesson has no written content. Ask your teacher if you think something is missing.
                  </p>
                )}

                {lesson.contents.map((b) => <ContentBlockView key={b.id} block={b} />)}
              </div>
            </CardBody>
          </Card>

          {/* Bottom navigation */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {nav.previous ? (
              <Link href={`/student/courses/${courseId}/learn/${nav.previous.id}`} className="btn-ghost">
                <ChevronLeft size={16} aria-hidden /> Previous
              </Link>
            ) : <span />}

            <div className="flex items-center gap-2">
              {done ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-3 py-1.5 text-sm font-medium text-success-700">
                  <Check size={14} aria-hidden /> Completed
                </span>
              ) : (
                <button type="button" className="btn-primary" onClick={finish} disabled={complete.isPending}>
                  {complete.isPending ? "Saving…" : "Mark complete"}
                </button>
              )}
              {nav.next ? (
                <Link href={`/student/courses/${courseId}/learn/${nav.next.id}`} className="btn-secondary">
                  Next <ChevronRight size={16} aria-hidden />
                </Link>
              ) : (
                <Link href={`/student/courses/${courseId}`} className="btn-secondary">Finish</Link>
              )}
            </div>
          </div>

          {complete.isError && (
            <p className="mt-2 text-sm text-danger-600" role="alert">{(complete.error as Error).message}</p>
          )}
          {justEarned && (
            <p className="mt-2 rounded-2xl bg-success-50 p-3 text-sm text-success-800" role="status">
              +{justEarned.xp} XP
              {justEarned.certificate && " · you earned your certificate!"}
            </p>
          )}
        </main>

        {/* RIGHT: lesson extras */}
        <aside className="space-y-3">
          <Card>
            <CardHeader title="This lesson" />
            <CardBody className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-muted">
                <Clock size={14} aria-hidden /> about {lesson.estimatedMin} min
              </p>
              {lesson.progress && lesson.progress.timeSpentSec > 0 && (
                <p className="text-xs text-muted">
                  You have spent {Math.max(1, Math.round(lesson.progress.timeSpentSec / 60))} min here.
                </p>
              )}
              <div className="pt-1">
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="font-medium">Course progress</span>
                  <span>{completion.percent}%</span>
                </div>
                <ProgressBar value={completion.percent} size="sm" />
                <p className="mt-1 text-xs text-muted">
                  {completion.lessonsCompleted} of {completion.totalLessons} lessons
                </p>
              </div>
            </CardBody>
          </Card>

          {lesson.quiz && (
            <Card>
              <CardHeader title="Quiz" />
              <CardBody className="space-y-2">
                <p className="text-sm font-medium">{lesson.quiz.title}</p>
                <p className="text-xs text-muted">
                  {lesson.quiz._count.questions} questions · pass mark {lesson.quiz.passingScore}%
                </p>
                {lesson.quiz.attempts.length > 0 && (
                  <p className="text-xs">
                    Best so far:{" "}
                    <strong>{Math.max(...lesson.quiz.attempts.map((a) => a.percent))}%</strong>
                  </p>
                )}
                <Link href={`/student/quizzes?quiz=${lesson.quiz.id}`} className="btn-primary w-full">
                  <ListChecks size={15} aria-hidden /> {lesson.quiz.attempts.length ? "Try again" : "Take the quiz"}
                </Link>
              </CardBody>
            </Card>
          )}

          {lesson.assignments.length > 0 && (
            <Card>
              <CardHeader title="Assignment" />
              <CardBody className="space-y-3">
                {lesson.assignments.map((a) => {
                  const sub = a.submissions[0];
                  return (
                    <div key={a.id} className="space-y-1">
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-muted">
                        Out of {a.maxScore}
                        {a.dueAt ? ` · due ${dueLabel(a.dueAt)}` : ""}
                      </p>
                      {sub ? (
                        <Pill tone={sub.status === "GRADED" ? "success" : "info"}>
                          {sub.status === "GRADED" ? `Graded ${sub.score}/${a.maxScore}` : "Handed in"}
                        </Pill>
                      ) : (
                        <Link href="/student/assignments" className="btn-secondary w-full">
                          <ClipboardList size={15} aria-hidden /> Hand it in
                        </Link>
                      )}
                      {sub?.feedback && <p className="rounded-xl bg-slate-50 p-2 text-xs">{sub.feedback}</p>}
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          )}

          {lesson.resources.length > 0 && (
            <Card>
              <CardHeader title="Resources" />
              <CardBody>
                <ul className="space-y-1.5">
                  {lesson.resources.map((r) => (
                    <li key={r.id}>
                      <a
                        href={r.url} target="_blank" rel="noreferrer"
                        className="focus-ring flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-slate-50"
                      >
                        <Download size={14} className="shrink-0 text-brand-600" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{r.name}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          {completion.complete && (
            <Card>
              <CardBody className="text-center">
                <Award size={24} className="mx-auto text-success-600" aria-hidden />
                <p className="mt-1 text-sm font-semibold text-success-800">Course complete!</p>
                <Link href="/student/certificates" className="btn-primary mt-2 w-full">See your certificate</Link>
              </CardBody>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function Curriculum({
  entries, courseId, currentId, open, onClose,
}: { entries: CurriculumEntry[]; courseId: string; currentId: string; open: boolean; onClose: () => void }) {
  // Grouped back into modules for display; the API sends one flat ordered walk
  // so the rail and the next/previous buttons cannot disagree.
  const groups: { id: string; title: string; lessons: CurriculumEntry[] }[] = [];
  for (const e of entries) {
    const last = groups[groups.length - 1];
    if (last && last.id === e.sectionId) last.lessons.push(e);
    else groups.push({ id: e.sectionId, title: e.sectionTitle, lessons: [e] });
  }

  const list = (
    <ol className="space-y-2">
      {groups.map((g) => (
        <li key={g.id}>
          <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">{g.title}</p>
          <ul>
            {g.lessons.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/student/courses/${courseId}/learn/${l.id}`}
                  onClick={onClose}
                  aria-current={l.id === currentId ? "page" : undefined}
                  className={cn(
                    "focus-ring flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm",
                    l.id === currentId ? "bg-brand-50 font-semibold text-brand-700" : "hover:bg-slate-50",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full text-[10px]",
                      l.completed ? "bg-success-500 text-white" : "bg-slate-100 text-slate-400",
                    )}
                    aria-hidden
                  >
                    {l.completed ? <Check size={11} /> : ""}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{l.title}</span>
                  <span className="shrink-0 text-[11px] text-muted">{l.estimatedMin}m</span>
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <nav aria-label="Course lessons" className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
        <Card><CardBody className="max-h-[calc(100dvh-8rem)] overflow-y-auto p-2">{list}</CardBody></Card>
      </nav>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button" className="absolute inset-0 bg-black/40"
            onClick={onClose} aria-label="Close the lesson list"
          />
          <nav aria-label="Course lessons" className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto bg-white p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold">Lessons</p>
              <button type="button" className="btn-ghost" onClick={onClose} aria-label="Close">
                <X size={16} aria-hidden />
              </button>
            </div>
            {list}
          </nav>
        </div>
      )}
    </>
  );
}
