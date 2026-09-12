"use client";
import Link from "next/link";
import { Award, Check, Clock, Rocket, X } from "lucide-react";
import { Card, CardBody, CardHeader, ErrorState, Pill, Skeleton, cn } from "@/components/dashboard";
import { useCoursePreview, usePublishChecklist, usePublishAuthoredCourse } from "@/lib/hooks/queries";
import type { CourseTree } from "@/lib/api/authoring";

/* ------------------------------------------------------------ 10. Preview */

export function PreviewStep({ course }: { course: CourseTree }) {
  const q = useCoursePreview(course.id);
  if (q.isPending) return <Skeleton className="h-96" />;
  if (q.isError) return <ErrorState error={q.error} retry={() => q.refetch()} />;
  const p = q.data!;

  return (
    <Card>
      <CardHeader title="Preview" sub="Exactly what a student sees before enrolling" />
      <CardBody className="space-y-5">
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          {p.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.thumbnailUrl} alt="" className="h-44 w-full object-cover" />
          ) : (
            <div className="grid h-44 place-items-center bg-slate-100 text-sm text-muted">No thumbnail set</div>
          )}
          <div className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {p.subject && <Pill tone="info">{p.subject.name}</Pill>}
              {p.grade && <Pill tone="neutral">{p.grade.name}</Pill>}
              <Pill tone="neutral">{p.difficulty.toLowerCase()}</Pill>
              {p.completionRules.issuesCertificate && <Pill tone="success">Certificate</Pill>}
            </div>
            <h2 className="text-xl font-bold">{p.title}</h2>
            {p.shortDescription && <p className="text-sm text-muted">{p.shortDescription}</p>}
            <p className="text-xs text-muted">
              {p.teacher?.name ? `Taught by ${p.teacher.name} · ` : ""}
              {p.totals.modules} module{p.totals.modules === 1 ? "" : "s"} · {p.totals.lessons} lesson{p.totals.lessons === 1 ? "" : "s"}
              {p.totals.estimatedMinutes ? ` · about ${p.totals.estimatedMinutes} min` : ""}
            </p>
          </div>
        </div>

        {p.description && (
          <section>
            <h3 className="mb-1 font-semibold">About this course</h3>
            <p className="whitespace-pre-wrap text-sm text-muted">{p.description}</p>
          </section>
        )}

        {p.learningPoints.length > 0 && (
          <section>
            <h3 className="mb-1 font-semibold">What you will learn</h3>
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {p.learningPoints.map((l, i) => (
                <li key={i} className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-success-600" aria-hidden />{l}</li>
              ))}
            </ul>
          </section>
        )}

        {p.requirements.length > 0 && (
          <section>
            <h3 className="mb-1 font-semibold">Before you start</h3>
            <ul className="list-disc pl-5 text-sm text-muted">{p.requirements.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </section>
        )}

        <section>
          <h3 className="mb-2 font-semibold">Course content</h3>
          <ol className="space-y-2">
            {p.sections.map((s) => (
              <li key={s.id} className="rounded-2xl border border-slate-200">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="text-xs text-muted">{s.lessons.length} lesson{s.lessons.length === 1 ? "" : "s"}</p>
                </div>
                <ul className="divide-y divide-slate-50">
                  {s.lessons.map((l) => (
                    <li key={l.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <Clock size={13} className="shrink-0 text-slate-300" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{l.title}</span>
                      {!l.isRequired && <Pill tone="neutral">Optional</Pill>}
                      {l._count.contents === 0 && <Pill tone="warning">Empty</Pill>}
                      <span className="text-xs text-muted">{l.estimatedMin} min</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          {p.sections.length === 0 && <p className="text-sm text-muted">No modules yet.</p>}
        </section>

        <section className="rounded-2xl bg-slate-50 p-4">
          <h3 className="mb-2 font-semibold">To complete this course</h3>
          <ul className="space-y-1 text-sm">
            <Rule on={p.completionRules.requireAllLessons} label={`Finish all ${p.totals.lessons} lessons`} />
            <Rule on={p.completionRules.requireAllQuizzes} label={`Pass every required quiz (${p.totals.quizzes})`} />
            <Rule on={p.completionRules.requireAllAssignments} label={`Hand in every required assignment (${p.totals.assignments})`} />
            <Rule on={p.completionRules.requireFinalExam} label="Pass the final exam" />
          </ul>
          {p.completionRules.issuesCertificate && (
            <p className="mt-3 flex items-center gap-2 text-sm text-success-700">
              <Award size={16} aria-hidden /> A verifiable certificate is issued on completion.
            </p>
          )}
        </section>
      </CardBody>
    </Card>
  );
}

function Rule({ on, label }: { on: boolean; label: string }) {
  return (
    <li className={cn("flex items-center gap-2", !on && "text-muted line-through")}>
      {on ? <Check size={14} className="text-success-600" aria-hidden /> : <X size={14} className="text-slate-300" aria-hidden />}
      {label}
    </li>
  );
}

/* ------------------------------------------------------------ 11. Publish */

export function PublishStep({ course, onPublished }: { course: CourseTree; onPublished: () => void }) {
  const q = usePublishChecklist(course.id);
  const publish = usePublishAuthoredCourse(course.id);

  if (q.isPending) return <Skeleton className="h-80" />;
  if (q.isError) return <ErrorState error={q.error} retry={() => q.refetch()} />;
  const list = q.data!;
  const live = course.status === "PUBLISHED";

  return (
    <Card>
      <CardHeader
        title="Publish"
        sub={live ? "This course is live" : "Everything below must pass before students can see this course"}
      />
      <CardBody className="space-y-4">
        <ul className="space-y-1.5">
          {list.items.map((item) => (
            <li key={item.key} className="flex items-start gap-2 text-sm">
              <span
                className={cn(
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                  item.ok ? "bg-success-100 text-success-700"
                  : item.required ? "bg-danger-100 text-danger-700" : "bg-slate-100 text-slate-400",
                )}
                aria-hidden
              >
                {item.ok ? <Check size={12} /> : <X size={12} />}
              </span>
              <span className="min-w-0">
                <span className={cn("font-medium", !item.required && "text-muted")}>
                  {item.label}
                  {!item.required && <span className="ml-1 text-xs font-normal">(optional)</span>}
                </span>
                {item.detail && <span className="block text-xs text-muted">{item.detail}</span>}
              </span>
            </li>
          ))}
        </ul>

        {live ? (
          <div className="rounded-2xl bg-success-50 p-4">
            <p className="text-sm font-semibold text-success-800">This course is published.</p>
            <p className="mt-1 text-xs text-success-700">
              {course._count.enrollments} student{course._count.enrollments === 1 ? "" : "s"} enrolled.
            </p>
            <Link href="/teacher/courses" className="btn-ghost mt-2 inline-flex">Back to my courses</Link>
          </div>
        ) : (
          <>
            {!list.ready && (
              <div className="rounded-2xl bg-warning-50 p-3" role="alert">
                <p className="text-sm font-semibold text-warning-800">Not ready yet</p>
                <ul className="mt-1 list-disc pl-5 text-xs text-warning-700">
                  {list.blockers.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>
            )}
            {publish.isError && (
              <p className="text-sm text-danger-600" role="alert">{(publish.error as Error).message}</p>
            )}
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
              disabled={!list.ready || publish.isPending}
              onClick={() => publish.mutate(undefined, { onSuccess: onPublished })}
            >
              <Rocket size={16} aria-hidden /> {publish.isPending ? "Publishing…" : "Publish course"}
            </button>
            <p className="text-xs text-muted">
              Publishing makes the course visible to every student your access setting allows, and publishes
              its draft lessons with it.
            </p>
          </>
        )}
      </CardBody>
    </Card>
  );
}
