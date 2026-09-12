"use client";
import Link from "next/link";
import { Award, BookOpen, Check, ChevronLeft, Clock, FileCheck2, Lock, Users } from "lucide-react";
import { TeacherShell } from "@/features/teacher/TeacherShell";
import { TopHeader, Card, CardBody, ErrorState, Pill, Skeleton } from "@/components/dashboard";
import { RequireRole } from "@/components/shared/RequireRole";
import { useCoursePreview } from "@/lib/hooks/queries";

/**
 * The course exactly as a student first meets it, inside the teacher shell so
 * the teacher can step straight back into the studio.
 */
export function CoursePreviewPage({ courseId }: { courseId: string }) {
  return (
    <RequireRole allow={["TEACHER", "SCHOOL_ADMIN", "SCHOOL_LEADER", "DISTRICT_ADMIN", "ADMIN", "SUPER_ADMIN"]}>
      <Preview courseId={courseId} />
    </RequireRole>
  );
}

function Preview({ courseId }: { courseId: string }) {
  return (
    <TeacherShell
      header={({ onMenu }) => (
        <TopHeader
          onMenu={onMenu}
          title="Preview"
          sub="What a student sees before they enrol"
          right={
            <Link href={`/teacher/courses/${courseId}/build`} className="btn-ghost">
              <ChevronLeft size={15} aria-hidden /> Back to the studio
            </Link>
          }
        />
      )}
    >
      <CoursePreviewBody courseId={courseId} />
    </TeacherShell>
  );
}

/**
 * The preview itself, without any chrome, so the studio's Preview step and the
 * standalone preview page show the same thing rather than two drifting copies.
 */
export function CoursePreviewBody({ courseId }: { courseId: string }) {
  const q = useCoursePreview(courseId);

  if (q.isPending) return <Skeleton className="h-[70vh]" />;
  if (q.isError) return <ErrorState error={q.error} retry={() => q.refetch()} />;

  const p = q.data!;
  const totalLessons = p.sections.reduce((a, s) => a + s.lessons.length, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Card>
        {p.bannerUrl || p.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.bannerUrl ?? p.thumbnailUrl!} alt="" className="h-48 w-full rounded-t-2xl object-cover" />
        ) : null}
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {p.subject && <Pill tone="info">{p.subject.name}</Pill>}
            {p.grade && <Pill tone="neutral">{p.grade.name}</Pill>}
            <Pill tone="neutral">
              {p.difficulty === "EASY" ? "Beginner" : p.difficulty === "MEDIUM" ? "Intermediate" : "Advanced"}
            </Pill>
            {p.completionRules.issuesCertificate && <Pill tone="success">Certificate</Pill>}
          </div>
          <h1 className="text-2xl font-bold">{p.title}</h1>
          {p.shortDescription && <p className="text-muted">{p.shortDescription}</p>}
          <p className="flex flex-wrap items-center gap-4 text-sm text-muted">
            {p.teacher && <span className="inline-flex items-center gap-1.5"><Users size={14} aria-hidden />{p.teacher.name}</span>}
            <span className="inline-flex items-center gap-1.5"><BookOpen size={14} aria-hidden />{totalLessons} lessons</span>
            {p.totals.estimatedMinutes > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Clock size={14} aria-hidden />
                {Math.round((p.totals.estimatedMinutes / 60) * 10) / 10} hours
              </span>
            )}
          </p>
          <button type="button" className="btn-primary w-full sm:w-auto" disabled>
            Start Learning
            <span className="sr-only"> (disabled in preview)</span>
          </button>
          <p className="text-xs text-muted">This button is inert in preview.</p>
        </CardBody>
      </Card>

      {p.learningPoints.length > 0 && (
        <Card>
          <CardBody>
            <h2 className="mb-2 font-semibold">What you&rsquo;ll learn</h2>
            <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
              {p.learningPoints.map((l, i) => (
                <li key={i} className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-success-600" aria-hidden />{l}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {p.requirements.length > 0 && (
        <Card>
          <CardBody>
            <h2 className="mb-2 font-semibold">Before you start</h2>
            <ul className="space-y-1 text-sm text-muted">
              {p.requirements.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <h2 className="mb-3 font-semibold">Course content</h2>
          <ol className="space-y-2">
            {p.sections.map((s, si) => {
              const mins = s.lessons.reduce((a, l) => a + l.estimatedMin, 0);
              return (
                <li key={s.id} className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="flex items-baseline justify-between gap-2 bg-slate-50/70 px-4 py-2.5">
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted">
                      Module {s.weekNumber ?? si + 1}
                    </p>
                    <p className="text-xs text-muted">
                      {Math.floor(mins / 60) ? `${Math.floor(mins / 60)}h ` : ""}{mins % 60}m
                    </p>
                  </div>
                  <p className="px-4 pt-2 font-medium">{s.title}</p>
                  <ul className="px-4 pb-3 pt-1">
                    {s.lessons.map((l, li) => (
                      <li key={l.id} className="flex items-center gap-2 py-1 text-sm">
                        {si === 0 && li === 0
                          ? <Check size={14} className="shrink-0 text-slate-300" aria-hidden />
                          : <Lock size={12} className="shrink-0 text-slate-300" aria-hidden />}
                        <span className="min-w-0 flex-1 truncate">Lesson {li + 1} — {l.title}</span>
                        {l._count.contents === 0 && <Pill tone="warning">Empty</Pill>}
                        <span className="text-xs text-muted">{l.estimatedMin}m</span>
                      </li>
                    ))}
                    {p.exams.some((e) => e.id) && si === p.sections.length - 1 && (
                      <li className="flex items-center gap-2 py-1 text-sm">
                        <FileCheck2 size={13} className="shrink-0 text-slate-300" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-muted">Final assessment</span>
                      </li>
                    )}
                  </ul>
                </li>
              );
            })}
          </ol>
          {p.sections.length === 0 && <p className="text-sm text-muted">No modules yet.</p>}
        </CardBody>
      </Card>

      {p.completionRules.issuesCertificate && (
        <Card>
          <CardBody className="flex items-center gap-3">
            <Award size={22} className="shrink-0 text-success-600" aria-hidden />
            <p className="text-sm">
              Finish the course at {p.completionRules.passingScore}% or better and Kidora issues a
              certificate anyone can verify.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
