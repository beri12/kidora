"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ClipboardList, FileText, Paperclip, Send } from "lucide-react";

import { TeacherShell } from "./TeacherShell";
import {
  useAssignmentSubmissions,
  useCreateAssignment,
  useGradeSubmission,
  useSetAssignmentStatus,
  useTeacherClasses,
  useTeacherCourses,
} from "@/lib/hooks/queries";
import {
  TopHeader, Card, CardBody, CardHeader, Pill, Avatar, EmptyState, ErrorState,
  Skeleton, Select, cn,
} from "@/components/dashboard";
import { apiErrorMessage } from "@/lib/api-error";
import { dueLabel, timeAgo } from "@/lib/format";
import type { AssignmentSubmissionRow } from "@/lib/api/teacher";

/* ------------------------------------------------------------------ new --- */

/**
 * "New assignment", the page behind the button on /teacher/assignments.
 *
 * An assignment belongs to a course — that is where the API files it and how
 * it finds the students to notify — so the course is asked for first and
 * nothing else can be filled in until one is chosen.
 */
export function NewAssignmentPage() {
  const router = useRouter();
  const courses = useTeacherCourses();
  const classes = useTeacherClasses();

  const [courseId, setCourseId] = useState("");
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [error, setError] = useState("");

  const create = useCreateAssignment(courseId);
  const setStatus = useSetAssignmentStatus(courseId);

  const score = Number(maxScore);
  const canSubmit =
    Boolean(courseId) && title.trim().length >= 2 && Number.isInteger(score) && score >= 1 && score <= 1000;

  // The API refuses to publish an assignment that says nothing about what to
  // do — "Add instructions before publishing this assignment." Enforcing the
  // same rule here means the teacher is told before the work is saved, rather
  // than by an error after it.
  const hasBrief = Boolean(description.trim() || instructions.trim());

  async function submit(publish: boolean) {
    if (!canSubmit || busy || (publish && !hasBrief)) return;
    setError("");

    let createdId: string;
    try {
      const created = await create.mutateAsync({
        title: title.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
        ...(classId ? { classId } : {}),
        // <input type="datetime-local"> has no zone; the API wants an ISO
        // instant, so it is read as the teacher's own local time.
        ...(dueAt ? { dueAt: new Date(dueAt).toISOString() } : {}),
        maxScore: score,
      });
      createdId = created.id;
    } catch (e) {
      setError(apiErrorMessage(e, "Could not create the assignment."));
      return;
    }

    // From here the assignment exists. If publishing it is refused, going back
    // to the form would strand that draft and a second attempt would make
    // another one, so the teacher is taken to the draft either way and told
    // there what publishing still needs.
    if (publish) {
      try {
        await setStatus.mutateAsync({ id: createdId, status: "PUBLISHED" });
      } catch (e) {
        router.replace(`/teacher/assignments/${createdId}?publish=${encodeURIComponent(apiErrorMessage(e, "Could not publish it."))}`);
        return;
      }
    }
    router.replace(`/teacher/assignments/${createdId}`);
  }

  const busy = create.isPending || setStatus.isPending;

  return (
    <TeacherShell
      header={({ onMenu }) => (
        <TopHeader
          onMenu={onMenu}
          title="New assignment"
          sub="Set it now, publish when you are ready"
          right={
            <Link href="/teacher/assignments" className="btn-ghost">
              <ArrowLeft size={16} /> Back
            </Link>
          }
        />
      )}
    >
      <Card className="mx-auto max-w-2xl">
        <CardHeader title="Details" sub="Only the course and a title are required." />
        <CardBody className="space-y-4">
          {courses.isError ? (
            <ErrorState error={courses.error} retry={() => courses.refetch()} />
          ) : courses.isPending ? (
            <Skeleton className="h-10" />
          ) : courses.data?.length ? (
            <Select
              label="Course"
              value={courseId}
              onChange={setCourseId}
              options={[
                { value: "", label: "Choose a course…" },
                ...courses.data.map((c) => ({ value: c.id, label: c.title })),
              ]}
            />
          ) : (
            <EmptyState
              icon={<FileText size={22} />}
              title="No courses yet"
              body="An assignment lives inside a course. Create one first."
              action={{ label: "Create a course", href: "/teacher/courses/new" }}
            />
          )}

          <fieldset disabled={!courseId || busy} className="space-y-4 disabled:opacity-50">
            <label className="block">
              <span className="text-xs font-medium text-muted">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={160}
                placeholder="Fractions worksheet 2"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-muted">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={4000}
                rows={2}
                placeholder="What this covers, in one line."
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-muted">Instructions for students</span>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                maxLength={20000}
                rows={4}
                placeholder="What to do, and what to hand in."
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-muted">Due</span>
                <input
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted">Marks out of</span>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring"
                />
              </label>
            </div>

            {Boolean(classes.data?.length) && (
              <Select
                label="Class (optional)"
                value={classId}
                onChange={setClassId}
                options={[
                  { value: "", label: "Everyone on the course" },
                  ...(classes.data ?? []).map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            )}
          </fieldset>

          {error && <p role="alert" className="text-sm text-danger-600">{error}</p>}

          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" className="btn-primary" disabled={!canSubmit || !hasBrief || busy} onClick={() => submit(true)}>
              <Send size={16} /> {busy ? "Saving…" : "Publish to students"}
            </button>
            <button type="button" className="btn-secondary" disabled={!canSubmit || busy} onClick={() => submit(false)}>
              Save as draft
            </button>
          </div>
          <p className="text-xs text-muted">
            {canSubmit && !hasBrief
              ? "Add a description or instructions before publishing — students need to know what to do. You can still save it as a draft."
              : "A draft is visible only to you. Publishing notifies the students it is set for."}
          </p>
        </CardBody>
      </Card>
    </TeacherShell>
  );
}

/* --------------------------------------------------------------- detail --- */

const STATUS_TONE = {
  GRADED: "success",
  SUBMITTED: "info",
  RETURNED: "neutral",
  LATE: "warning",
} as const;

/** One row of the marking list: the work, and a box to score it. */
function SubmissionRow({ s, maxScore, assignmentId }: { s: AssignmentSubmissionRow; maxScore: number; assignmentId: string }) {
  const grade = useGradeSubmission(assignmentId);
  const [score, setScore] = useState(s.score != null ? String(s.score) : "");
  const [feedback, setFeedback] = useState(s.feedback ?? "");
  const [error, setError] = useState("");

  const n = Number(score);
  const valid = score !== "" && Number.isFinite(n) && n >= 0 && n <= maxScore;

  async function save() {
    if (!valid || grade.isPending) return;
    setError("");
    try {
      await grade.mutateAsync({ submissionId: s.id, score: n, feedback: feedback.trim() || undefined });
    } catch (e) {
      setError(apiErrorMessage(e, "Could not save that mark."));
    }
  }

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={s.student.name} src={s.student.avatarUrl} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{s.student.name}</p>
          <p className="text-xs text-muted">Handed in {timeAgo(s.submittedAt)}</p>
        </div>
        <Pill tone={STATUS_TONE[s.status] ?? "neutral"}>{s.status === "GRADED" ? `${s.score}/${maxScore}` : s.status.toLowerCase()}</Pill>
      </div>

      {s.content && (
        <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-ink">{s.content}</p>
      )}

      {Boolean(s.attachments?.length) && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {s.attachments!.map((f) => (
            <li key={f.url}>
              <a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs hover:bg-slate-200">
                <Paperclip size={12} /> {f.name}
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="text-xs font-medium text-muted">Score</span>
          <div className="mt-1 flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={maxScore}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring"
            />
            <span className="text-sm text-muted">/ {maxScore}</span>
          </div>
        </label>
        <label className="block min-w-[12rem] flex-1">
          <span className="text-xs font-medium text-muted">Feedback</span>
          <input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            maxLength={4000}
            placeholder="Optional — the student sees this."
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus-ring"
          />
        </label>
        <button type="button" className="btn-secondary" disabled={!valid || grade.isPending} onClick={save}>
          {grade.isPending ? "Saving…" : s.status === "GRADED" ? "Update" : "Save mark"}
        </button>
      </div>

      {error && <p role="alert" className="mt-2 text-xs text-danger-600">{error}</p>}
    </li>
  );
}

const NO_SUBMISSIONS: AssignmentSubmissionRow[] = [];

/** One assignment: what was set, and everything handed in against it. */
export function AssignmentDetailPage({ id }: { id: string }) {
  const q = useAssignmentSubmissions(id);
  // Set when the create page saved the assignment but publishing it was
  // refused, so the reason arrives with the teacher instead of being lost.
  const publishError = useSearchParams().get("publish");
  const a = q.data?.assignment;
  // `?? []` would build a fresh array each render and defeat the memo below,
  // so the fallback is a module-level constant instead.
  const items = q.data?.items ?? NO_SUBMISSIONS;

  const ungraded = useMemo(() => items.filter((s) => s.status !== "GRADED").length, [items]);
  const due = a?.dueAt ? dueLabel(a.dueAt) : null;

  return (
    <TeacherShell
      header={({ onMenu }) => (
        <TopHeader
          onMenu={onMenu}
          title={a?.title ?? "Assignment"}
          sub={a ? [a.course?.title, a.class?.name].filter(Boolean).join(" · ") || undefined : undefined}
          right={
            <Link href="/teacher/assignments" className="btn-ghost">
              <ArrowLeft size={16} /> All assignments
            </Link>
          }
        />
      )}
    >
      {q.isPending ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : q.isError ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : a ? (
        <div className="space-y-4">
          {publishError && (
            <div role="alert" className="rounded-2xl bg-warning-50 px-4 py-3 text-sm text-warning-700">
              <b>Saved as a draft.</b> {publishError} Edit it in the course builder, then publish.
            </div>
          )}
          <Card>
            <CardBody className="flex flex-wrap items-center gap-3">
              <Pill tone={a.status === "PUBLISHED" ? "success" : a.status === "CLOSED" ? "neutral" : "warning"}>
                {a.status.toLowerCase()}
              </Pill>
              {due && <Pill tone={due.tone}>{due.text}</Pill>}
              <span className="text-sm text-muted">Marks out of {a.maxScore}</span>
              <span className={cn("text-sm", ungraded ? "font-semibold text-ink" : "text-muted")}>
                {items.length} handed in{ungraded ? ` · ${ungraded} to mark` : " · all marked"}
              </span>
            </CardBody>
          </Card>

          {(a.description || a.instructions) && (
            <Card>
              <CardHeader title="What was set" />
              <CardBody className="space-y-2 pt-2">
                {a.description && <p className="text-sm text-ink">{a.description}</p>}
                {a.instructions && <p className="whitespace-pre-wrap text-sm text-muted">{a.instructions}</p>}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Submissions" sub={a.status === "DRAFT" ? "This is still a draft, so no student can see it yet." : undefined} />
            <CardBody className="pt-2">
              {items.length ? (
                <ul className="divide-y divide-slate-100">
                  {items.map((s) => (
                    <SubmissionRow key={s.id} s={s} maxScore={a.maxScore} assignmentId={id} />
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={<ClipboardList size={22} />}
                  title="Nothing handed in yet"
                  body={a.status === "DRAFT" ? "Publish it and students will be able to submit." : "Students have not submitted anything against this."}
                />
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}
    </TeacherShell>
  );
}
