"use client";
import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Archive, Check, Eye, History, Rocket, X } from "lucide-react";
import { Card, CardBody, CardHeader, ErrorState, Pill, Skeleton, cn } from "@/components/dashboard";
import {
  useArchiveCourse, useCourseVersions, usePublishAuthoredCourse, useReadiness,
  useUpdateAuthoredCourse,
} from "@/lib/hooks/queries";
import type { CourseAccess, CourseTree } from "@/lib/api/authoring";
import { fmtDate } from "@/lib/format";

const VISIBILITY: { value: CourseAccess; label: string; body: string }[] = [
  { value: "INVITE_ONLY", label: "Private", body: "Hidden from browsing. You add students yourself." },
  { value: "FREE", label: "Published to Kidora", body: "Any student on Kidora can find and join it." },
  { value: "SCHOOL_ONLY", label: "My school only", body: "Only students at your school can see it." },
  { value: "PREMIUM", label: "Kidora Plus", body: "Only students with a subscription can join." },
];

/**
 * Step 5. The readiness list is computed on the server and is the same thing
 * `publish` enforces, so a teacher cannot talk their way past it from here.
 */
export function PublishStep({ course, onDone }: { course: CourseTree; onDone: () => void }) {
  const q = useReadiness(course.id);
  const versions = useCourseVersions(course.id);
  const publish = usePublishAuthoredCourse(course.id);
  const archive = useArchiveCourse(course.id);
  const update = useUpdateAuthoredCourse(course.id);
  const [access, setAccess] = useState<CourseAccess>(course.access);
  const [confirming, setConfirming] = useState(false);

  if (q.isPending) return <Skeleton className="h-96" />;
  if (q.isError) return <ErrorState error={q.error} retry={() => q.refetch()} />;
  const r = q.data!;
  const live = course.status === "PUBLISHED";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card>
        <CardHeader
          title="Course readiness"
          sub={live ? "This course is live." : "Everything required must pass before students can see it."}
        />
        <CardBody>
          <ul className="space-y-1.5">
            {r.lines.map((line) => (
              <li key={line.key} className="flex items-start gap-2.5 text-sm">
                <span
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                    line.ok ? "bg-success-100 text-success-700"
                    : line.required ? "bg-danger-100 text-danger-700"
                    : "bg-slate-100 text-slate-400",
                  )}
                  aria-hidden
                >
                  {line.ok ? <Check size={12} /> : line.required ? <X size={12} /> : <AlertTriangle size={11} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("font-medium", !line.required && !line.ok && "text-muted")}>
                    {line.count > 0 && <span className="mr-1 tabular-nums">{line.count}</span>}
                    {line.label}
                    {!line.required && <span className="ml-1 text-xs font-normal text-muted">(optional)</span>}
                  </span>
                  {line.detail && <span className="block text-xs text-muted">{line.detail}</span>}
                </span>
              </li>
            ))}
          </ul>

          {!r.ready && !live && (
            <div className="mt-4 rounded-2xl bg-warning-50 p-3" role="alert">
              <p className="text-sm font-semibold text-warning-800">Not ready yet</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-warning-700">
                {r.blockers.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="min-w-0 space-y-4">
        <Card>
          <CardHeader title="Visibility" />
          <CardBody className="space-y-2">
            <fieldset className="space-y-2">
              <legend className="sr-only">Who can see this course</legend>
              {VISIBILITY.map((v) => (
                <label
                  key={v.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-2xl border p-2.5",
                    access === v.value ? "border-brand-400 bg-brand-50/60" : "border-slate-200",
                  )}
                >
                  <input
                    type="radio" name="visibility" value={v.value} checked={access === v.value}
                    onChange={() => { setAccess(v.value); update.mutate({ access: v.value }); }}
                    className="mt-0.5 size-4 text-brand-700 focus-ring"
                  />
                  <span className="text-sm">
                    <span className="font-medium">{v.label}</span>
                    <span className="block text-xs text-muted">{v.body}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <p className="text-xs text-muted">Enforced on the server for every request, not hidden in the browser.</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Certificate" />
          <CardBody className="text-sm">
            {course.issuesCertificate ? (
              <p className="flex items-center gap-2">
                <Pill tone="success">On</Pill>
                Issued at {course.passingScore}%.
              </p>
            ) : (
              <p className="text-muted">No certificate. Turn it on in Assessment → Completion.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-2">
            {live ? (
              <>
                <div className="rounded-2xl bg-success-50 p-3">
                  <p className="text-sm font-semibold text-success-800">This course is published.</p>
                  <p className="mt-0.5 text-xs text-success-700">
                    {course._count.enrollments} student{course._count.enrollments === 1 ? "" : "s"} enrolled.
                  </p>
                </div>
                <Link href={`/teacher/courses/${course.id}/preview`} className="btn-ghost w-full">
                  <Eye size={15} aria-hidden /> Preview as a student
                </Link>
                <button type="button" className="btn-ghost w-full" onClick={onDone}>Back to my courses</button>
              </>
            ) : (
              <>
                <Link href={`/teacher/courses/${course.id}/preview`} className="btn-ghost w-full">
                  <Eye size={15} aria-hidden /> Preview course
                </Link>

                {/* Never publish on a single click. */}
                {confirming ? (
                  <div className="rounded-2xl bg-brand-50 p-3">
                    <p className="text-sm font-semibold">Publish this course?</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {access === "FREE" ? "Every student on Kidora will be able to find it."
                        : access === "SCHOOL_ONLY" ? "Students at your school will be able to find it."
                        : access === "PREMIUM" ? "Students with Kidora Plus will be able to find it."
                        : "It stays hidden — you add students yourself."}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" className="btn-ghost flex-1" onClick={() => setConfirming(false)}>Cancel</button>
                      <button
                        type="button" className="btn-primary flex-1" disabled={publish.isPending}
                        onClick={() => publish.mutate(undefined, { onSuccess: () => setConfirming(false) })}
                      >
                        {publish.isPending ? "Publishing…" : "Yes, publish"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button" className="btn-primary w-full"
                    disabled={!r.ready}
                    onClick={() => setConfirming(true)}
                  >
                    <Rocket size={16} aria-hidden /> Publish course
                  </button>
                )}
                {publish.isError && <p className="text-sm text-danger-600" role="alert">{(publish.error as Error).message}</p>}
              </>
            )}

            {course.status !== "ARCHIVED" && (
              <button
                type="button" className="btn-ghost w-full text-xs text-muted"
                onClick={() => { if (confirm("Archive this course? Students already enrolled keep their access.")) archive.mutate(); }}
              >
                <Archive size={13} aria-hidden /> Archive
              </button>
            )}
          </CardBody>
        </Card>

        {(versions.data?.length ?? 0) > 0 && (
          <Card>
            <CardHeader title="Published versions" />
            <CardBody className="space-y-1.5 text-sm">
              {versions.data!.map((v) => (
                <p key={v.id} className="flex items-center gap-2">
                  <History size={13} className="shrink-0 text-slate-400" aria-hidden />
                  <span className="font-medium">v{v.version}</span>
                  <span className="text-xs text-muted">{fmtDate(v.createdAt)}</span>
                  {v.publishedBy && <span className="truncate text-xs text-muted">· {v.publishedBy.name}</span>}
                </p>
              ))}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
