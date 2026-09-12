"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award, BookOpen, Check, ClipboardList, Clock, FileCheck2, Lock, PlayCircle, Users,
} from "lucide-react";
import { StudentShell } from "@/features/student/StudentShell";
import {
  TopHeader, Card, CardBody, CardHeader, EmptyState, ErrorState, Pill, ProgressBar, Skeleton, cn,
} from "@/components/dashboard";
import { RequireRole } from "@/components/shared/RequireRole";
import { useEnrollInCourse, useStudentCourse, useUnenrollFromCourse } from "@/lib/hooks/queries";
import { fmtDate } from "@/lib/format";

export function StudentCoursePage({ courseId }: { courseId: string }) {
  return (
    <RequireRole allow={["CHILD"]}>
      <Detail courseId={courseId} />
    </RequireRole>
  );
}

function Detail({ courseId }: { courseId: string }) {
  const router = useRouter();
  const q = useStudentCourse(courseId);
  const enroll = useEnrollInCourse();
  const unenroll = useUnenrollFromCourse();

  if (q.isPending) {
    return (
      <StudentShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title="Course" />}>
        <Skeleton className="h-96" />
      </StudentShell>
    );
  }
  if (q.isError) {
    return (
      <StudentShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title="Course" />}>
        <ErrorState error={q.error} retry={() => q.refetch()} />
      </StudentShell>
    );
  }

  const c = q.data!;
  const lessons = c.sections.flatMap((s) => s.lessons);
  const resumeId = c.enrollment?.lastLessonId ?? lessons.find((l) => !l.completed)?.id ?? lessons[0]?.id;
  const blocked = !c.accessDecision.allowed;

  return (
    <StudentShell
      header={({ onMenu }) => (
        <TopHeader onMenu={onMenu} title={c.title} sub={`${c.subject?.name ?? "General"}${c.grade ? ` · ${c.grade.name}` : ""}`} />
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card>
            {c.bannerUrl || c.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.bannerUrl ?? c.thumbnailUrl!} alt="" className="h-44 w-full rounded-t-2xl object-cover" />
            ) : null}
            <CardBody className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {c.subject && <Pill tone="info">{c.subject.name}</Pill>}
                {c.grade && <Pill tone="neutral">{c.grade.name}</Pill>}
                <Pill tone="neutral">{c.difficulty.toLowerCase()}</Pill>
                {c.issuesCertificate && <Pill tone="success">Certificate</Pill>}
              </div>
              <h1 className="text-2xl font-bold">{c.title}</h1>
              {c.shortDescription && <p className="text-sm text-muted">{c.shortDescription}</p>}
              <p className="flex flex-wrap items-center gap-3 text-xs text-muted">
                {c.teacher && <span className="inline-flex items-center gap-1"><Users size={13} aria-hidden />{c.teacher.name}</span>}
                <span className="inline-flex items-center gap-1"><BookOpen size={13} aria-hidden />{c.totals.lessons} lessons</span>
                {c.totals.estimatedMinutes > 0 && (
                  <span className="inline-flex items-center gap-1"><Clock size={13} aria-hidden />about {c.totals.estimatedMinutes} min</span>
                )}
              </p>
              {c.description && <p className="whitespace-pre-wrap text-sm">{c.description}</p>}
            </CardBody>
          </Card>

          {c.learningPoints.length > 0 && (
            <Card>
              <CardHeader title="What you will learn" />
              <CardBody>
                <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
                  {c.learningPoints.map((l, i) => (
                    <li key={i} className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-success-600" aria-hidden />{l}</li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          {c.requirements.length > 0 && (
            <Card>
              <CardHeader title="Before you start" />
              <CardBody><ul className="list-disc pl-5 text-sm text-muted">{c.requirements.map((r, i) => <li key={i}>{r}</li>)}</ul></CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Course content" sub={`${c.totals.modules} modules · ${c.totals.lessons} lessons`} />
            <CardBody className="p-0">
              {c.sections.length === 0 ? (
                <EmptyState title="Nothing here yet" body="Your teacher is still building this course." />
              ) : (
                <ol>
                  {c.sections.map((s) => (
                    <li key={s.id} className="border-b border-slate-100 last:border-0">
                      <div className="bg-slate-50/60 px-4 py-2">
                        <p className="text-sm font-semibold">{s.title}</p>
                        {s.description && <p className="text-xs text-muted">{s.description}</p>}
                      </div>
                      <ul className="divide-y divide-slate-50">
                        {s.lessons.map((l) => {
                          const body = (
                            <>
                              <span
                                className={cn(
                                  "grid size-6 shrink-0 place-items-center rounded-full",
                                  l.completed ? "bg-success-100 text-success-700"
                                  : l.locked ? "bg-slate-100 text-slate-400" : "bg-brand-50 text-brand-600",
                                )}
                                aria-hidden
                              >
                                {l.completed ? <Check size={13} /> : l.locked ? <Lock size={12} /> : <PlayCircle size={14} />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{l.title}</span>
                                {l.percent > 0 && !l.completed && (
                                  <span className="mt-1 block w-32"><ProgressBar value={l.percent} size="sm" /></span>
                                )}
                              </span>
                              {!l.isRequired && <Pill tone="neutral">Optional</Pill>}
                              {l.quiz && <Pill tone="info">Quiz</Pill>}
                              <span className="shrink-0 text-xs text-muted">{l.estimatedMin} min</span>
                            </>
                          );
                          return (
                            <li key={l.id}>
                              {l.locked ? (
                                <div className="flex items-center gap-3 px-4 py-2.5 opacity-60" title="Enrol to open this lesson">
                                  {body}
                                </div>
                              ) : (
                                <Link
                                  href={`/student/courses/${c.id}/learn/${l.id}`}
                                  className="focus-ring flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50"
                                >
                                  {body}
                                </Link>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>

          {c.exam && (
            <Card>
              <CardHeader title="Final exam" />
              <CardBody className="flex flex-wrap items-center gap-3">
                <FileCheck2 size={20} className="text-brand-600" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{c.exam.title}</p>
                  <p className="text-xs text-muted">
                    {c.exam.questionCount} questions
                    {c.exam.durationMin ? ` · ${c.exam.durationMin} min` : ""} · pass mark {c.exam.passingScore}%
                  </p>
                </div>
                {c.exam.result ? (
                  <Pill tone={c.exam.result.passed ? "success" : "danger"}>
                    {c.exam.result.passed ? "Passed" : "Not passed"} · {c.exam.result.percent}%
                  </Pill>
                ) : (
                  <Pill tone={c.exam.status === "OPEN" ? "info" : "neutral"}>{c.exam.status}</Pill>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        {/* ---------------------------------------------------------- rail */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardBody className="space-y-3">
              {c.enrolled && c.completion ? (
                <>
                  <div>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="text-sm font-semibold">Your progress</span>
                      <span className="text-sm font-bold">{c.completion.percent}%</span>
                    </div>
                    <ProgressBar value={c.completion.percent} />
                    <p className="mt-1 text-xs text-muted">
                      {c.completion.lessonsCompleted} of {c.completion.totalLessons} lessons complete
                    </p>
                  </div>

                  {resumeId && !c.completion.complete && (
                    <Link href={`/student/courses/${c.id}/learn/${resumeId}`} className="btn-primary w-full">
                      {c.completion.lessonsCompleted > 0 ? "Continue learning" : "Start the course"}
                    </Link>
                  )}

                  {c.completion.unmet.length > 0 && (
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold">Left to finish</p>
                      <ul className="mt-1 list-disc pl-4 text-xs text-muted">
                        {c.completion.unmet.map((u, i) => <li key={i}>{u}</li>)}
                      </ul>
                    </div>
                  )}

                  {c.completion.complete && (
                    <div className="rounded-2xl bg-success-50 p-3 text-center">
                      <Award size={22} className="mx-auto text-success-600" aria-hidden />
                      <p className="mt-1 text-sm font-semibold text-success-800">Course complete!</p>
                      {c.certificate ? (
                        <Link href="/student/certificates" className="btn-primary mt-2 w-full">See your certificate</Link>
                      ) : (
                        <p className="mt-1 text-xs text-success-700">Well done.</p>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn-ghost w-full text-xs"
                    disabled={unenroll.isPending}
                    onClick={() => {
                      if (confirm("Leave this course? Your progress is kept if you come back.")) {
                        unenroll.mutate(c.id, { onSuccess: () => router.push("/student/courses") });
                      }
                    }}
                  >
                    Leave this course
                  </button>
                </>
              ) : blocked ? (
                <div className="space-y-2 text-center">
                  <Lock size={22} className="mx-auto text-slate-400" aria-hidden />
                  <p className="text-sm font-semibold">{c.accessDecision.message ?? "You cannot open this course."}</p>
                  {c.accessDecision.missingPrerequisites?.length ? (
                    <ul className="text-xs text-muted">
                      {c.accessDecision.missingPrerequisites.map((p) => (
                        <li key={p.id}>
                          <Link href={`/student/courses/${p.id}`} className="underline">{p.title}</Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {c.accessDecision.reason === "PREMIUM" && (
                    <Link href="/pricing" className="btn-primary w-full">See Kidora Plus</Link>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-center text-sm font-semibold">
                    {c.access === "FREE" ? "Free to join" : "Join this course"}
                  </p>
                  {enroll.isError && <p className="text-xs text-danger-600" role="alert">{(enroll.error as Error).message}</p>}
                  <button
                    type="button" className="btn-primary w-full"
                    disabled={enroll.isPending}
                    onClick={() => enroll.mutate(c.id)}
                  >
                    {enroll.isPending ? "Enrolling…" : "Enrol now"}
                  </button>
                  <p className="text-center text-xs text-muted">
                    {c.totals.lessons} lessons{c.issuesCertificate ? " · certificate on completion" : ""}
                  </p>
                </>
              )}
            </CardBody>
          </Card>

          {c.enrolled && (
            <Card>
              <CardHeader title="To complete this course" />
              <CardBody className="space-y-1.5 text-sm">
                {c.completion && (
                  <>
                    <Requirement on={c.completion.requirements.lessons.required} ok={c.completion.requirements.lessons.ok}
                      label={`Lessons ${c.completion.requirements.lessons.done}/${c.completion.requirements.lessons.total}`} />
                    <Requirement on={c.completion.requirements.quizzes.required} ok={c.completion.requirements.quizzes.ok}
                      label={`Quizzes ${c.completion.requirements.quizzes.done}/${c.completion.requirements.quizzes.total}`} />
                    <Requirement on={c.completion.requirements.assignments.required} ok={c.completion.requirements.assignments.ok}
                      label={`Assignments ${c.completion.requirements.assignments.done}/${c.completion.requirements.assignments.total}`} />
                    <Requirement on={c.completion.requirements.exam.required} ok={c.completion.requirements.exam.ok} label="Final exam" />
                  </>
                )}
              </CardBody>
            </Card>
          )}

          {c.certificate && (
            <Card>
              <CardHeader title="Certificate" />
              <CardBody className="text-sm">
                <p className="font-mono text-xs">{c.certificate.code}</p>
                <p className="mt-1 text-xs text-muted">Issued {fmtDate(c.certificate.issuedAt)}</p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </StudentShell>
  );
}

function Requirement({ on, ok, label }: { on: boolean; ok: boolean; label: string }) {
  if (!on) return null;
  return (
    <p className={cn("flex items-center gap-2", ok ? "text-success-700" : "text-muted")}>
      <span
        className={cn("grid size-4 shrink-0 place-items-center rounded-full", ok ? "bg-success-100" : "bg-slate-100")}
        aria-hidden
      >
        {ok && <Check size={10} className="text-success-700" />}
      </span>
      {label}
    </p>
  );
}
