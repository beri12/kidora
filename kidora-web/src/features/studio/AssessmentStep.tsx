"use client";
import { useState } from "react";
import { ClipboardList, FileCheck2, ListChecks, Plus, Trash2, Users } from "lucide-react";
import { Card, CardBody, CardHeader, EmptyState, Pill, Tabs, cn } from "@/components/dashboard";
import {
  useCourseExams, useCreateAssignment, useCreateQuiz, useDeleteAssignment, useDeleteModuleExam,
  useDeleteQuiz, useSetAssignmentStatus, useSetCompletionRules, useUpsertExam, useUpsertModuleExam,
} from "@/lib/hooks/queries";
import type { CourseTree } from "@/lib/api/authoring";
import { SaveIndicator, SelectField, TextArea, TextField, Toggle, moved, useAutosave } from "@/features/course-builder/parts";
import { QuestionEditor, toApiQuestion } from "@/features/course-builder/StepsAssessments";
import { questionSchema, type QuestionValues } from "@/features/course-builder/schema";

const blank = (): QuestionValues => ({
  prompt: "", type: "MULTIPLE_CHOICE", options: ["", ""], correct: 0,
  correctOptions: [], correctOrder: [], pairs: [], points: 1,
  answerText: "", explanation: "", hint: "",
});

type Tab = "quizzes" | "assignments" | "exams" | "completion";

/** Step 4: everything that is marked. */
export function AssessmentStep({ course }: { course: CourseTree }) {
  const [tab, setTab] = useState<Tab>("quizzes");
  return (
    <div className="space-y-4">
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "quizzes", label: "Quizzes", count: course.quizzes.length },
          { value: "assignments", label: "Assignments", count: course.assignments.length },
          { value: "exams", label: "Exams", count: course.exams.length },
          { value: "completion", label: "Completion" },
        ]}
      />
      {tab === "quizzes" && <QuizzesTab course={course} />}
      {tab === "assignments" && <AssignmentsTab course={course} />}
      {tab === "exams" && <ExamsTab course={course} />}
      {tab === "completion" && <CompletionTab course={course} />}
    </div>
  );
}

/* ------------------------------------------------------------------ quizzes */

function QuizzesTab({ course }: { course: CourseTree }) {
  const create = useCreateQuiz(course.id);
  const remove = useDeleteQuiz(course.id);
  const [draft, setDraft] = useState<null | {
    title: string; lessonId: string; grading: "FORMATIVE" | "SUMMATIVE";
    passingScore: number; maxAttempts: number; shuffle: boolean;
    questions: QuestionValues[];
  }>(null);

  const lessons = course.sections.flatMap((s) => s.lessons.map((l) => ({ ...l, sectionTitle: s.title })));
  const taken = new Set(lessons.filter((l) => l.quiz).map((l) => l.id));
  const valid = draft && draft.title.trim().length >= 2 && draft.questions.length > 0
    && draft.questions.every((q) => questionSchema.safeParse(q).success);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Quizzes" sub="Formative quizzes are practice; summative ones are marked." />
        <CardBody>
          {course.quizzes.length === 0 && lessons.every((l) => !l.quiz) ? (
            <EmptyState icon={<ListChecks size={22} />} title="No quizzes yet" body="Add one to check what students took in." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {lessons.filter((l) => l.quiz).map((l) => (
                <li key={l.quiz!.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.quiz!.title}</p>
                    <p className="truncate text-xs text-muted">{l.sectionTitle} · {l.title}</p>
                  </div>
                  <Pill tone={(l.quiz!._count?.questions ?? 0) > 0 ? "success" : "warning"}>
                    {l.quiz!._count?.questions ?? 0} question{(l.quiz!._count?.questions ?? 0) === 1 ? "" : "s"}
                  </Pill>
                  <button
                    type="button" className="btn-ghost text-danger-600"
                    onClick={() => { if (confirm(`Delete quiz "${l.quiz!.title}"?`)) remove.mutate(l.quiz!.id); }}
                    aria-label={`Delete ${l.quiz!.title}`}
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!draft && (
            <button
              type="button" className="btn-primary mt-3" disabled={lessons.length === 0}
              onClick={() => setDraft({
                title: "", lessonId: "", grading: "FORMATIVE",
                passingScore: 80, maxAttempts: 0, shuffle: true, questions: [blank()],
              })}
            >
              <Plus size={16} aria-hidden /> Add a quiz
            </button>
          )}
          {lessons.length === 0 && <p className="mt-3 text-xs text-muted">Add a lesson first — a quiz attaches to one.</p>}
        </CardBody>
      </Card>

      {draft && (
        <Card>
          <CardHeader title="New quiz" />
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Title" required value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} />
              <SelectField
                label="Attach to lesson" value={draft.lessonId} onChange={(v) => setDraft({ ...draft, lessonId: v })}
                options={[
                  { value: "", label: "Standalone practice quiz" },
                  ...lessons.filter((l) => !taken.has(l.id)).map((l) => ({ value: l.id, label: `${l.sectionTitle} · ${l.title}` })),
                ]}
              />
            </div>

            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="mb-2 text-sm font-semibold">Settings</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Type" value={draft.grading}
                  onChange={(v) => setDraft({
                    ...draft,
                    grading: v as typeof draft.grading,
                    // Practice means retry freely; a marked quiz defaults to
                    // a small number of attempts.
                    maxAttempts: v === "FORMATIVE" ? 0 : 2,
                  })}
                  options={[{ value: "FORMATIVE", label: "Formative — practice" }, { value: "SUMMATIVE", label: "Summative — marked" }]}
                />
                <TextField
                  label="Passing score (%)" type="number" value={String(draft.passingScore)}
                  onChange={(v) => setDraft({ ...draft, passingScore: Math.max(0, Math.min(100, Number(v) || 0)) })}
                />
                <SelectField
                  label="Attempts" value={String(draft.maxAttempts)}
                  onChange={(v) => setDraft({ ...draft, maxAttempts: Number(v) })}
                  options={[
                    { value: "0", label: "Unlimited" },
                    ...[1, 2, 3, 5].map((n) => ({ value: String(n), label: `${n}` })),
                  ]}
                />
                <div className="flex items-end pb-1">
                  <Toggle label="Randomise questions" checked={draft.shuffle} onChange={(v) => setDraft({ ...draft, shuffle: v })} />
                </div>
              </div>
            </div>

            <ol className="space-y-3">
              {draft.questions.map((q, i) => (
                <QuestionEditor
                  key={i} question={q} index={i} total={draft.questions.length}
                  onChange={(next) => setDraft({ ...draft, questions: draft.questions.map((x, j) => (j === i ? next : x)) })}
                  onRemove={() => setDraft({ ...draft, questions: draft.questions.filter((_, j) => j !== i) })}
                  onMove={(from, to) => setDraft({ ...draft, questions: moved(draft.questions, from, to) })}
                />
              ))}
            </ol>
            <button type="button" className="btn-ghost" onClick={() => setDraft({ ...draft, questions: [...draft.questions, blank()] })}>
              <Plus size={15} aria-hidden /> Add question
            </button>

            {create.isError && <p className="text-sm text-danger-600" role="alert">{(create.error as Error).message}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button type="button" className="btn-ghost" onClick={() => setDraft(null)}>Cancel</button>
              <button
                type="button" className="btn-primary" disabled={!valid || create.isPending}
                onClick={() => create.mutate(
                  {
                    title: draft.title.trim(),
                    lessonId: draft.lessonId || undefined,
                    grading: draft.grading,
                    passingScore: draft.passingScore,
                    // 0 in the picker means unlimited; the API wants a real number.
                    maxAttempts: draft.maxAttempts === 0 ? 20 : draft.maxAttempts,
                    shuffle: draft.shuffle,
                    published: true,
                    isRequired: draft.grading === "SUMMATIVE",
                    questions: draft.questions.map(toApiQuestion),
                  },
                  { onSuccess: () => setDraft(null) },
                )}
              >
                {create.isPending ? "Saving…" : "Save quiz"}
              </button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- assignments */

function AssignmentsTab({ course }: { course: CourseTree }) {
  const create = useCreateAssignment(course.id);
  const setStatus = useSetAssignmentStatus(course.id);
  const remove = useDeleteAssignment(course.id);
  const [draft, setDraft] = useState<null | {
    title: string; instructions: string; maxScore: number; isRequired: boolean;
    peerReviewCount: number; peerReviewsDue: number;
    rubric: { criterion: string; points: number }[];
  }>(null);
  const valid = draft && draft.title.trim().length >= 2 && draft.instructions.trim().length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Assignments" sub="Work students hand in — graded by you, or by their classmates." />
        <CardBody>
          {course.assignments.length === 0 ? (
            <EmptyState icon={<ClipboardList size={22} />} title="No assignments yet" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {course.assignments.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted">Out of {a.maxScore}{a.isRequired ? " · required" : ""}</p>
                  </div>
                  <Pill tone={a.status === "PUBLISHED" ? "success" : "neutral"}>{a.status}</Pill>
                  <button
                    type="button" className="btn-ghost"
                    onClick={() => setStatus.mutate({ id: a.id, status: a.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" })}
                  >
                    {a.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    type="button" className="btn-ghost text-danger-600"
                    onClick={() => { if (confirm(`Delete "${a.title}"?`)) remove.mutate(a.id); }}
                    aria-label={`Delete ${a.title}`}
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {setStatus.isError && <p className="mt-2 text-sm text-danger-600" role="alert">{(setStatus.error as Error).message}</p>}
          {!draft && (
            <button
              type="button" className="btn-primary mt-3"
              onClick={() => setDraft({ title: "", instructions: "", maxScore: 100, isRequired: true, peerReviewCount: 0, peerReviewsDue: 0, rubric: [] })}
            >
              <Plus size={16} aria-hidden /> Add an assignment
            </button>
          )}
        </CardBody>
      </Card>

      {draft && (
        <Card>
          <CardHeader title="New assignment" />
          <CardBody className="space-y-4">
            <TextField label="Title" required value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} />
            <TextArea label="Instructions" required rows={5} value={draft.instructions} onChange={(v) => setDraft({ ...draft, instructions: v })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Maximum score" type="number" value={String(draft.maxScore)}
                onChange={(v) => setDraft({ ...draft, maxScore: Math.max(1, Number(v) || 1) })}
              />
              <div className="flex items-end pb-1">
                <Toggle label="Required for completion" checked={draft.isRequired} onChange={(v) => setDraft({ ...draft, isRequired: v })} />
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
                <Users size={14} aria-hidden /> Peer review
              </p>
              <p className="mb-2 text-xs text-muted">
                Set reviewers above zero and classmates score each other against the rubric.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Reviewers per submission" type="number" value={String(draft.peerReviewCount)}
                  onChange={(v) => {
                    const n = Math.max(0, Math.min(10, Number(v) || 0));
                    // Owing at least as many reviews as you receive is what keeps
                    // the queue moving.
                    setDraft({ ...draft, peerReviewCount: n, peerReviewsDue: n });
                  }}
                />
                <TextField
                  label="Reviews each student owes" type="number" value={String(draft.peerReviewsDue)}
                  onChange={(v) => setDraft({ ...draft, peerReviewsDue: Math.max(0, Math.min(10, Number(v) || 0)) })}
                />
              </div>
            </div>

            <fieldset>
              <legend className="mb-1 text-sm font-medium">Rubric <span className="font-normal text-muted">(needed for peer review)</span></legend>
              <ul className="space-y-2">
                {draft.rubric.map((r, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <input
                      className="input flex-1" value={r.criterion} placeholder="Correct answers"
                      aria-label={`Criterion ${i + 1}`}
                      onChange={(e) => setDraft({ ...draft, rubric: draft.rubric.map((x, j) => (j === i ? { ...x, criterion: e.target.value } : x)) })}
                    />
                    <input
                      className="input w-24" type="number" value={String(r.points)}
                      aria-label={`Points for criterion ${i + 1}`}
                      onChange={(e) => setDraft({ ...draft, rubric: draft.rubric.map((x, j) => (j === i ? { ...x, points: Math.max(0, Number(e.target.value) || 0) } : x)) })}
                    />
                    <button
                      type="button" className="focus-ring rounded p-1 text-slate-400"
                      onClick={() => setDraft({ ...draft, rubric: draft.rubric.filter((_, j) => j !== i) })}
                      aria-label={`Remove criterion ${i + 1}`}
                    >
                      <Trash2 size={13} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button" className="btn-ghost mt-2 text-xs"
                onClick={() => setDraft({ ...draft, rubric: [...draft.rubric, { criterion: "", points: 0 }] })}
              >
                <Plus size={13} aria-hidden /> Add criterion
              </button>
              {draft.rubric.length > 0 && (
                <p className="mt-1 text-xs text-muted">
                  Rubric totals {draft.rubric.reduce((a, r) => a + r.points, 0)} of {draft.maxScore}.
                </p>
              )}
            </fieldset>

            {create.isError && <p className="text-sm text-danger-600" role="alert">{(create.error as Error).message}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button type="button" className="btn-ghost" onClick={() => setDraft(null)}>Cancel</button>
              <button
                type="button" className="btn-primary" disabled={!valid || create.isPending}
                onClick={() => create.mutate(
                  {
                    title: draft.title.trim(), instructions: draft.instructions.trim(),
                    maxScore: draft.maxScore, isRequired: draft.isRequired,
                    peerReviewCount: draft.peerReviewCount, peerReviewsDue: draft.peerReviewsDue,
                    rubric: draft.rubric.filter((r) => r.criterion.trim()),
                  },
                  { onSuccess: () => setDraft(null) },
                )}
              >
                {create.isPending ? "Saving…" : "Save assignment"}
              </button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- exams */

function ExamsTab({ course }: { course: CourseTree }) {
  const exams = useCourseExams(course.id);
  const upsertFinal = useUpsertExam(course.id);
  const upsertModule = useUpsertModuleExam(course.id);
  const removeModule = useDeleteModuleExam(course.id);
  const [editing, setEditing] = useState<null | { sectionId: string | null; title: string; durationMin: number; passingScore: number; questions: QuestionValues[] }>(null);

  const rows = exams.data ?? [];
  const finalExam = rows.find((e) => !e.sectionId);
  const valid = editing && editing.title.trim().length >= 2 && editing.questions.length > 0
    && editing.questions.every((q) => questionSchema.safeParse(q).success);

  const start = (sectionId: string | null, title: string) =>
    setEditing({ sectionId, title, durationMin: 30, passingScore: 80, questions: [blank()] });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Exams" sub="One per module, plus one final for the whole course." />
        <CardBody className="space-y-2">
          <div className="rounded-2xl border border-slate-200 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <FileCheck2 size={17} className="text-brand-700" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Course final exam</p>
                <p className="text-xs text-muted">
                  {finalExam ? `${finalExam.quiz._count.questions} questions · pass ${finalExam.passingScore}%` : "Not set"}
                </p>
              </div>
              {finalExam && <Pill tone={finalExam.status === "OPEN" ? "success" : "neutral"}>{finalExam.status}</Pill>}
              <button type="button" className="btn-ghost" onClick={() => start(null, finalExam?.title ?? `${course.title} — final exam`)}>
                {finalExam ? "Edit" : "Add"}
              </button>
            </div>
          </div>

          {course.sections.map((s) => {
            const ex = rows.find((e) => e.sectionId === s.id);
            return (
              <div key={s.id} className="rounded-2xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <FileCheck2 size={17} className="text-slate-400" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {s.weekNumber ? `Week ${s.weekNumber} · ` : ""}{s.title}
                    </p>
                    <p className="text-xs text-muted">
                      {ex ? `${ex.quiz._count.questions} questions · pass ${ex.passingScore}%` : "No module exam"}
                    </p>
                  </div>
                  <button type="button" className="btn-ghost" onClick={() => start(s.id, ex?.title ?? `${s.title} exam`)}>
                    {ex ? "Edit" : "Add"}
                  </button>
                  {ex && (
                    <button
                      type="button" className="btn-ghost text-danger-600"
                      onClick={() => { if (confirm(`Delete the exam for "${s.title}"?`)) removeModule.mutate(s.id); }}
                      aria-label={`Delete the exam for ${s.title}`}
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {course.sections.length === 0 && (
            <p className="text-xs text-muted">Add a module and it can have its own end-of-week exam.</p>
          )}
        </CardBody>
      </Card>

      {editing && (
        <Card>
          <CardHeader title={editing.sectionId ? "Module exam" : "Final exam"} />
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField label="Title" required value={editing.title} onChange={(v) => setEditing({ ...editing, title: v })} />
              <TextField
                label="Time limit (minutes)" type="number" value={String(editing.durationMin)}
                onChange={(v) => setEditing({ ...editing, durationMin: Math.max(1, Number(v) || 1) })}
              />
              <TextField
                label="Passing score (%)" type="number" value={String(editing.passingScore)}
                onChange={(v) => setEditing({ ...editing, passingScore: Math.max(0, Math.min(100, Number(v) || 0)) })}
              />
            </div>

            <ol className="space-y-3">
              {editing.questions.map((q, i) => (
                <QuestionEditor
                  key={i} question={q} index={i} total={editing.questions.length}
                  onChange={(next) => setEditing({ ...editing, questions: editing.questions.map((x, j) => (j === i ? next : x)) })}
                  onRemove={() => setEditing({ ...editing, questions: editing.questions.filter((_, j) => j !== i) })}
                  onMove={(from, to) => setEditing({ ...editing, questions: moved(editing.questions, from, to) })}
                />
              ))}
            </ol>
            <button type="button" className="btn-ghost" onClick={() => setEditing({ ...editing, questions: [...editing.questions, blank()] })}>
              <Plus size={15} aria-hidden /> Add question
            </button>

            {(upsertFinal.isError || upsertModule.isError) && (
              <p className="text-sm text-danger-600" role="alert">
                {((upsertFinal.error ?? upsertModule.error) as Error)?.message}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button
                type="button" className="btn-primary"
                disabled={!valid || upsertFinal.isPending || upsertModule.isPending}
                onClick={() => {
                  const payload = {
                    title: editing.title.trim(),
                    durationMin: editing.durationMin,
                    passingScore: editing.passingScore,
                    questions: editing.questions.map(toApiQuestion),
                  };
                  const done = { onSuccess: () => setEditing(null) };
                  if (editing.sectionId) upsertModule.mutate({ sectionId: editing.sectionId, ...payload }, done);
                  else upsertFinal.mutate(payload, done);
                }}
              >
                Save exam
              </button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- completion */

function CompletionTab({ course }: { course: CourseTree }) {
  const save = useSetCompletionRules(course.id);
  const [rules, setRules] = useState({
    requireAllLessons: course.requireAllLessons,
    requireAllQuizzes: course.requireAllQuizzes,
    requireAllAssignments: course.requireAllAssignments,
    requireFinalExam: course.requireFinalExam,
    passingScore: course.passingScore,
    issuesCertificate: course.issuesCertificate,
  });
  const { state, savedAt } = useAutosave(rules, (v) => save.mutateAsync(v));
  const hasExam = course.exams.some((e) => e.quiz._count.questions > 0);

  return (
    <Card>
      <CardHeader title="Completion and certificate" sub="What a student must finish for this course to count as done" />
      <CardBody className="space-y-3">
        <div className="flex justify-end"><SaveIndicator state={state} savedAt={savedAt} /></div>
        <Toggle label="Finish every lesson" checked={rules.requireAllLessons} onChange={(v) => setRules({ ...rules, requireAllLessons: v })} hint="Optional lessons do not count." />
        <Toggle label="Pass every required quiz" checked={rules.requireAllQuizzes} onChange={(v) => setRules({ ...rules, requireAllQuizzes: v })} />
        <Toggle label="Hand in every required assignment" checked={rules.requireAllAssignments} onChange={(v) => setRules({ ...rules, requireAllAssignments: v })} />
        <Toggle
          label="Pass the final exam" checked={rules.requireFinalExam}
          onChange={(v) => setRules({ ...rules, requireFinalExam: v })}
          hint={hasExam ? undefined : "There is no final exam with questions yet."}
        />
        {rules.requireFinalExam && !hasExam && (
          <p className="rounded-xl bg-warning-50 p-3 text-xs text-warning-700">
            Add a final exam with at least one question, or turn this off — the course cannot publish otherwise.
          </p>
        )}
        <div className="max-w-xs pt-1">
          <TextField
            label="Pass mark (%)" type="number" value={String(rules.passingScore)}
            onChange={(v) => setRules({ ...rules, passingScore: Math.max(0, Math.min(100, Number(v) || 0)) })}
          />
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <Toggle
            label="Issue a certificate on completion" checked={rules.issuesCertificate}
            onChange={(v) => setRules({ ...rules, issuesCertificate: v })}
            hint="Carries the student's name, this course, the date and a code anyone can verify."
          />
        </div>
      </CardBody>
    </Card>
  );
}
