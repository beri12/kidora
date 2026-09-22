"use client";
import { useMemo, useState } from "react";
import { ClipboardList, FileCheck2, ListChecks, Plus, Trash2, X } from "lucide-react";
import { Card, CardBody, CardHeader, EmptyState, Pill, cn } from "@/components/dashboard";
import {
  useCreateAssignment, useCreateQuiz, useCourseExam, useDeleteAssignment, useDeleteQuiz,
  useSetAssignmentStatus, useSetExamStatus, useUpdateAssignment, useUpdateQuiz, useUpsertExam,
} from "@/lib/hooks/queries";
import type { AuthoredQuestion, CourseTree, QuestionType } from "@/lib/api/authoring";
import { allErrors, questionSchema, type QuestionValues } from "./schema";
import { ReorderButtons, SelectField, TextArea, TextField, Toggle, moved } from "./parts";

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "MULTIPLE_CHOICE", label: "Multiple choice" },
  { value: "TRUE_FALSE", label: "True or false" },
  { value: "MULTIPLE_SELECT", label: "Multiple select" },
  { value: "SHORT_ANSWER", label: "Short answer" },
  { value: "ORDERING", label: "Put in order" },
  { value: "MATCHING", label: "Matching" },
];

const blankQuestion = (): QuestionValues => ({
  prompt: "", type: "MULTIPLE_CHOICE", options: ["", ""], correct: 0,
  correctOptions: [], correctOrder: [], pairs: [], points: 1,
  answerText: "", explanation: "", hint: "",
});

/* ---------------------------------------------------------- question editor */

export function QuestionEditor({
  question, index, total, onChange, onRemove, onMove,
}: {
  question: QuestionValues; index: number; total: number;
  onChange: (q: QuestionValues) => void; onRemove: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const set = <K extends keyof QuestionValues>(k: K, v: QuestionValues[K]) => onChange({ ...question, [k]: v });
  const result = useMemo(() => questionSchema.safeParse(question), [question]);
  const problems = allErrors(result);

  const setOption = (i: number, v: string) => set("options", question.options.map((o, j) => (j === i ? v : o)));
  const addOption = () => set("options", [...question.options, ""]);
  const removeOption = (i: number) => {
    const options = question.options.filter((_, j) => j !== i);
    onChange({
      ...question,
      options,
      correct: question.correct != null && question.correct >= options.length ? 0 : question.correct,
      correctOptions: question.correctOptions.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)),
      correctOrder: question.correctOrder.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)),
    });
  };

  const changeType = (type: QuestionType) => {
    // Each type reads different fields; resetting avoids carrying a stale
    // "correct" index into a type where it means nothing.
    onChange({
      ...blankQuestion(),
      prompt: question.prompt, points: question.points,
      explanation: question.explanation, hint: question.hint,
      type,
      options: type === "TRUE_FALSE" ? ["True", "False"] : type === "MATCHING" || type === "SHORT_ANSWER" ? [] : ["", ""],
      pairs: type === "MATCHING" ? [{ left: "", right: "" }, { left: "", right: "" }] : [],
    });
  };

  return (
    <li className={cn("rounded-2xl border p-3", problems.length ? "border-warning-300 bg-warning-50/30" : "border-slate-200")}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold text-muted">Question {index + 1}</span>
        <span className="flex-1" />
        <ReorderButtons index={index} total={total} onMove={onMove} label={`question ${index + 1}`} />
        <button type="button" className="focus-ring rounded p-1 text-danger-600" onClick={onRemove} aria-label={`Remove question ${index + 1}`}>
          <X size={14} aria-hidden />
        </button>
      </div>

      <div className="space-y-3">
        <TextArea label="Question" required rows={2} value={question.prompt} onChange={(v) => set("prompt", v)} />

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Type" value={question.type} onChange={(v) => changeType(v as QuestionType)} options={QUESTION_TYPES} />
          <TextField label="Points" type="number" value={String(question.points)} onChange={(v) => set("points", Math.max(0, Number(v) || 0))} />
        </div>

        {(question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") && (
          <fieldset>
            <legend className="mb-1 text-sm font-medium">Options <span className="font-normal text-muted">— pick the correct one</span></legend>
            <ul className="space-y-2">
              {question.options.map((o, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input
                    type="radio" name={`correct-${index}`} checked={question.correct === i}
                    onChange={() => set("correct", i)} className="size-4 text-brand-600 focus-ring"
                    aria-label={`Option ${i + 1} is correct`}
                  />
                  <input
                    className="input flex-1" value={o} placeholder={`Option ${i + 1}`}
                    aria-label={`Option ${i + 1}`}
                    readOnly={question.type === "TRUE_FALSE"}
                    onChange={(e) => setOption(i, e.target.value)}
                  />
                  {question.type === "MULTIPLE_CHOICE" && question.options.length > 2 && (
                    <button type="button" className="focus-ring rounded p-1 text-slate-400" onClick={() => removeOption(i)} aria-label={`Remove option ${i + 1}`}>
                      <X size={13} aria-hidden />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {question.type === "MULTIPLE_CHOICE" && (
              <button type="button" className="btn-ghost mt-2 text-xs" onClick={addOption}><Plus size={13} aria-hidden /> Add option</button>
            )}
          </fieldset>
        )}

        {question.type === "MULTIPLE_SELECT" && (
          <fieldset>
            <legend className="mb-1 text-sm font-medium">Options <span className="font-normal text-muted">— tick every correct one</span></legend>
            <ul className="space-y-2">
              {question.options.map((o, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input
                    type="checkbox" checked={question.correctOptions.includes(i)}
                    onChange={(e) => set("correctOptions", e.target.checked ? [...question.correctOptions, i] : question.correctOptions.filter((x) => x !== i))}
                    className="size-4 rounded text-brand-600 focus-ring" aria-label={`Option ${i + 1} is correct`}
                  />
                  <input className="input flex-1" value={o} placeholder={`Option ${i + 1}`} aria-label={`Option ${i + 1}`} onChange={(e) => setOption(i, e.target.value)} />
                  {question.options.length > 2 && (
                    <button type="button" className="focus-ring rounded p-1 text-slate-400" onClick={() => removeOption(i)} aria-label={`Remove option ${i + 1}`}><X size={13} aria-hidden /></button>
                  )}
                </li>
              ))}
            </ul>
            <button type="button" className="btn-ghost mt-2 text-xs" onClick={addOption}><Plus size={13} aria-hidden /> Add option</button>
          </fieldset>
        )}

        {question.type === "SHORT_ANSWER" && (
          <TextField
            label="Accepted answer" required value={question.answerText ?? ""} onChange={(v) => set("answerText", v)}
            hint="Marked case-insensitively. Leave blank only if you intend to grade it by hand."
          />
        )}

        {question.type === "ORDERING" && (
          <fieldset>
            <legend className="mb-1 text-sm font-medium">Items <span className="font-normal text-muted">— in the correct order</span></legend>
            <ul className="space-y-2">
              {question.options.map((o, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-6 text-xs text-muted">{i + 1}.</span>
                  <input className="input flex-1" value={o} placeholder={`Item ${i + 1}`} aria-label={`Item ${i + 1}`} onChange={(e) => setOption(i, e.target.value)} />
                  <ReorderButtons
                    index={i} total={question.options.length} label={`item ${i + 1}`}
                    onMove={(from, to) => set("options", moved(question.options, from, to))}
                  />
                  {question.options.length > 2 && (
                    <button type="button" className="focus-ring rounded p-1 text-slate-400" onClick={() => removeOption(i)} aria-label={`Remove item ${i + 1}`}><X size={13} aria-hidden /></button>
                  )}
                </li>
              ))}
            </ul>
            <button type="button" className="btn-ghost mt-2 text-xs" onClick={addOption}><Plus size={13} aria-hidden /> Add item</button>
            <p className="mt-2 text-xs text-muted">Students see these shuffled. The order above is the answer.</p>
            {/* The stored answer is the identity permutation of the list above. */}
            <input type="hidden" value={question.options.map((_, i) => i).join(",")} readOnly />
          </fieldset>
        )}

        {question.type === "MATCHING" && (
          <fieldset>
            <legend className="mb-1 text-sm font-medium">Pairs</legend>
            <ul className="space-y-2">
              {question.pairs.map((p, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input
                    className="input flex-1" value={p.left} placeholder="1/2" aria-label={`Pair ${i + 1} left`}
                    onChange={(e) => set("pairs", question.pairs.map((x, j) => (j === i ? { ...x, left: e.target.value } : x)))}
                  />
                  <span className="text-muted" aria-hidden>→</span>
                  <input
                    className="input flex-1" value={p.right} placeholder="Half a circle" aria-label={`Pair ${i + 1} right`}
                    onChange={(e) => set("pairs", question.pairs.map((x, j) => (j === i ? { ...x, right: e.target.value } : x)))}
                  />
                  {question.pairs.length > 2 && (
                    <button type="button" className="focus-ring rounded p-1 text-slate-400" onClick={() => set("pairs", question.pairs.filter((_, j) => j !== i))} aria-label={`Remove pair ${i + 1}`}><X size={13} aria-hidden /></button>
                  )}
                </li>
              ))}
            </ul>
            <button type="button" className="btn-ghost mt-2 text-xs" onClick={() => set("pairs", [...question.pairs, { left: "", right: "" }])}>
              <Plus size={13} aria-hidden /> Add pair
            </button>
            <p className="mt-2 text-xs text-muted">Students see the right-hand column shuffled.</p>
          </fieldset>
        )}

        <TextArea label="Explanation" rows={2} value={question.explanation ?? ""} onChange={(v) => set("explanation", v)} hint="Shown after answering, if the quiz is set to show explanations." />
        <TextField label="Hint" value={question.hint ?? ""} onChange={(v) => set("hint", v)} />

        {problems.length > 0 && (
          <ul className="rounded-xl bg-warning-50 p-2 text-xs text-warning-700" role="alert">
            {problems.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        )}
      </div>
    </li>
  );
}

/** Convert editor state into the API shape, dropping fields the type ignores. */
export function toApiQuestion(q: QuestionValues): AuthoredQuestion {
  const base = {
    prompt: q.prompt.trim(), type: q.type, points: q.points,
    explanation: q.explanation?.trim() || undefined, hint: q.hint?.trim() || undefined,
  };
  switch (q.type) {
    case "MULTIPLE_CHOICE":
    case "TRUE_FALSE":
      return { ...base, options: q.options, correct: q.correct };
    case "MULTIPLE_SELECT":
      return { ...base, options: q.options, correctOptions: [...q.correctOptions].sort((a, b) => a - b) };
    case "SHORT_ANSWER":
      return { ...base, answerText: q.answerText };
    case "ORDERING":
      return { ...base, options: q.options, correctOrder: q.options.map((_, i) => i) };
    case "MATCHING":
      return { ...base, pairs: q.pairs };
  }
}

/* ------------------------------------------------------------ 5. Quizzes */

export function QuizzesStep({ course }: { course: CourseTree }) {
  const create = useCreateQuiz(course.id);
  const remove = useDeleteQuiz(course.id);
  const [draft, setDraft] = useState<{ title: string; lessonId: string; questions: QuestionValues[] } | null>(null);

  const lessons = course.sections.flatMap((s) => s.lessons.map((l) => ({ ...l, sectionTitle: s.title })));
  const taken = new Set(lessons.filter((l) => l.quiz).map((l) => l.id));
  const valid = draft
    && draft.title.trim().length >= 2
    && draft.questions.length > 0
    && draft.questions.every((q) => questionSchema.safeParse(q).success);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Quizzes" sub="One quiz per lesson, plus standalone practice quizzes" />
        <CardBody>
          {course.quizzes.length === 0 && lessons.every((l) => !l.quiz) ? (
            <EmptyState icon={<ListChecks size={22} />} title="No quizzes yet" body="Add a quiz to check what students took in." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {lessons.filter((l) => l.quiz).map((l) => (
                <li key={l.quiz!.id} className="flex items-center gap-3 py-2.5">
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
                  >
                    <Trash2 size={14} aria-hidden /><span className="sr-only">Delete {l.quiz!.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!draft && (
            <button
              type="button" className="btn-primary mt-3"
              onClick={() => setDraft({ title: "", lessonId: "", questions: [blankQuestion()] })}
              disabled={lessons.length === 0}
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
            <TextField label="Quiz title" required value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} />
            <SelectField
              label="Attach to lesson" value={draft.lessonId} onChange={(v) => setDraft({ ...draft, lessonId: v })}
              options={[
                { value: "", label: "Standalone practice quiz" },
                ...lessons.filter((l) => !taken.has(l.id)).map((l) => ({ value: l.id, label: `${l.sectionTitle} · ${l.title}` })),
              ]}
              hint="A lesson can have one quiz. Lessons that already have one are not listed."
            />

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

            <button type="button" className="btn-ghost" onClick={() => setDraft({ ...draft, questions: [...draft.questions, blankQuestion()] })}>
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
                    published: true,
                    isRequired: true,
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

/* -------------------------------------------------------- 6. Assignments */

export function AssignmentsStep({ course }: { course: CourseTree }) {
  const create = useCreateAssignment(course.id);
  const setStatus = useSetAssignmentStatus(course.id);
  const remove = useDeleteAssignment(course.id);
  const [draft, setDraft] = useState<null | {
    title: string; instructions: string; maxScore: number; dueAt: string;
    isRequired: boolean; allowLate: boolean; allowResubmit: boolean;
    submissionType: "TEXT" | "FILE" | "BOTH";
    rubric: { criterion: string; points: number }[];
  }>(null);

  const valid = draft && draft.title.trim().length >= 2 && draft.instructions.trim().length > 0 && draft.maxScore > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Assignments" sub="Work students hand in for you to grade" />
        <CardBody>
          {course.assignments.length === 0 ? (
            <EmptyState icon={<ClipboardList size={22} />} title="No assignments yet" body="Set work for students to submit and grade." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {course.assignments.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted">Out of {a.maxScore}{a.isRequired ? " · required" : ""}</p>
                  </div>
                  <Pill tone={a.status === "PUBLISHED" ? "success" : "neutral"}>{a.status}</Pill>
                  {a.status === "DRAFT" ? (
                    <button type="button" className="btn-ghost" onClick={() => setStatus.mutate({ id: a.id, status: "PUBLISHED" })}>Publish</button>
                  ) : (
                    <button type="button" className="btn-ghost" onClick={() => setStatus.mutate({ id: a.id, status: "DRAFT" })}>Unpublish</button>
                  )}
                  <button
                    type="button" className="btn-ghost text-danger-600"
                    onClick={() => { if (confirm(`Delete "${a.title}"?`)) remove.mutate(a.id); }}
                  >
                    <Trash2 size={14} aria-hidden /><span className="sr-only">Delete {a.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {setStatus.isError && <p className="mt-2 text-sm text-danger-600" role="alert">{(setStatus.error as Error).message}</p>}
          {!draft && (
            <button
              type="button" className="btn-primary mt-3"
              onClick={() => setDraft({
                title: "", instructions: "", maxScore: 100, dueAt: "",
                isRequired: true, allowLate: true, allowResubmit: false,
                submissionType: "BOTH", rubric: [],
              })}
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
            <TextArea
              label="Instructions" required rows={5} value={draft.instructions}
              onChange={(v) => setDraft({ ...draft, instructions: v })}
              hint="Tell students exactly what to do and what to hand in."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Maximum score" type="number" required value={String(draft.maxScore)} onChange={(v) => setDraft({ ...draft, maxScore: Math.max(1, Number(v) || 1) })} />
              <TextField label="Due date" type="datetime-local" value={draft.dueAt} onChange={(v) => setDraft({ ...draft, dueAt: v })} />
              <SelectField
                label="Students submit" value={draft.submissionType}
                onChange={(v) => setDraft({ ...draft, submissionType: v as typeof draft.submissionType })}
                options={[{ value: "BOTH", label: "Text or a file" }, { value: "TEXT", label: "Text only" }, { value: "FILE", label: "A file only" }]}
              />
            </div>
            <div>
              <Toggle label="Required for course completion" checked={draft.isRequired} onChange={(v) => setDraft({ ...draft, isRequired: v })} />
              <Toggle label="Accept late submissions" checked={draft.allowLate} onChange={(v) => setDraft({ ...draft, allowLate: v })} />
              <Toggle label="Allow resubmission" checked={draft.allowResubmit} onChange={(v) => setDraft({ ...draft, allowResubmit: v })} />
            </div>

            <fieldset>
              <legend className="mb-1 text-sm font-medium">Rubric <span className="font-normal text-muted">(optional)</span></legend>
              <ul className="space-y-2">
                {draft.rubric.map((r, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <input
                      className="input flex-1" value={r.criterion} placeholder="Correct answers" aria-label={`Criterion ${i + 1}`}
                      onChange={(e) => setDraft({ ...draft, rubric: draft.rubric.map((x, j) => (j === i ? { ...x, criterion: e.target.value } : x)) })}
                    />
                    <input
                      className="input w-24" type="number" value={String(r.points)} aria-label={`Points for criterion ${i + 1}`}
                      onChange={(e) => setDraft({ ...draft, rubric: draft.rubric.map((x, j) => (j === i ? { ...x, points: Math.max(0, Number(e.target.value) || 0) } : x)) })}
                    />
                    <button type="button" className="focus-ring rounded p-1 text-slate-400" onClick={() => setDraft({ ...draft, rubric: draft.rubric.filter((_, j) => j !== i) })} aria-label={`Remove criterion ${i + 1}`}>
                      <X size={13} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn-ghost mt-2 text-xs" onClick={() => setDraft({ ...draft, rubric: [...draft.rubric, { criterion: "", points: 0 }] })}>
                <Plus size={13} aria-hidden /> Add criterion
              </button>
              {draft.rubric.length > 0 && (
                <p className="mt-1 text-xs text-muted">
                  Rubric total {draft.rubric.reduce((a, r) => a + r.points, 0)} · assignment is out of {draft.maxScore}
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
                    maxScore: draft.maxScore, dueAt: draft.dueAt ? new Date(draft.dueAt).toISOString() : undefined,
                    isRequired: draft.isRequired, allowLate: draft.allowLate, allowResubmit: draft.allowResubmit,
                    submissionType: draft.submissionType,
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

/* ---------------------------------------------------------- 7. Final exam */

export function ExamStep({ course }: { course: CourseTree }) {
  const examQuery = useCourseExam(course.id);
  const upsert = useUpsertExam(course.id);
  const setStatus = useSetExamStatus(course.id);
  const existing = examQuery.data;

  const [form, setForm] = useState<null | {
    title: string; durationMin: number; passingScore: number; questions: QuestionValues[];
  }>(null);

  const start = () => setForm({
    title: existing?.title ?? `${course.title} — final exam`,
    durationMin: existing?.durationMin ?? 30,
    passingScore: existing?.passingScore ?? 60,
    questions: (existing?.quiz.questions ?? []).length
      ? existing!.quiz.questions.map(fromApiQuestion)
      : [blankQuestion()],
  });

  const valid = form && form.title.trim().length >= 2 && form.questions.length > 0
    && form.questions.every((q) => questionSchema.safeParse(q).success);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Final exam" sub="Optional. One per course." />
        <CardBody className="space-y-3">
          {existing ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{existing.title}</p>
                  <p className="text-xs text-muted">
                    {existing.quiz.questions.length} question{existing.quiz.questions.length === 1 ? "" : "s"}
                    {existing.durationMin ? ` · ${existing.durationMin} min` : ""} · pass mark {existing.passingScore}%
                  </p>
                </div>
                <Pill tone={existing.status === "OPEN" ? "success" : existing.status === "SCHEDULED" ? "info" : "neutral"}>{existing.status}</Pill>
              </div>
              <div className="flex flex-wrap gap-2">
                {existing.status === "OPEN" ? (
                  <button type="button" className="btn-ghost" onClick={() => setStatus.mutate("CLOSED")}>Close exam</button>
                ) : (
                  <button type="button" className="btn-ghost" onClick={() => setStatus.mutate("OPEN")}>Open exam</button>
                )}
                {!form && <button type="button" className="btn-ghost" onClick={start}>Edit questions</button>}
              </div>
              {setStatus.isError && <p className="text-sm text-danger-600" role="alert">{(setStatus.error as Error).message}</p>}
            </>
          ) : (
            <>
              <EmptyState icon={<FileCheck2 size={22} />} title="No final exam" body="Add one if students should sit an exam before the course counts as complete." />
              {!form && <button type="button" className="btn-primary" onClick={start}><Plus size={16} aria-hidden /> Add a final exam</button>}
            </>
          )}
        </CardBody>
      </Card>

      {form && (
        <Card>
          <CardHeader title={existing ? "Edit final exam" : "New final exam"} />
          <CardBody className="space-y-4">
            <TextField label="Exam title" required value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Time limit (minutes)" type="number" value={String(form.durationMin)} onChange={(v) => setForm({ ...form, durationMin: Math.max(1, Number(v) || 1) })} />
              <TextField label="Pass mark (%)" type="number" value={String(form.passingScore)} onChange={(v) => setForm({ ...form, passingScore: Math.max(0, Math.min(100, Number(v) || 0)) })} />
            </div>

            <ol className="space-y-3">
              {form.questions.map((q, i) => (
                <QuestionEditor
                  key={i} question={q} index={i} total={form.questions.length}
                  onChange={(next) => setForm({ ...form, questions: form.questions.map((x, j) => (j === i ? next : x)) })}
                  onRemove={() => setForm({ ...form, questions: form.questions.filter((_, j) => j !== i) })}
                  onMove={(from, to) => setForm({ ...form, questions: moved(form.questions, from, to) })}
                />
              ))}
            </ol>
            <button type="button" className="btn-ghost" onClick={() => setForm({ ...form, questions: [...form.questions, blankQuestion()] })}>
              <Plus size={15} aria-hidden /> Add question
            </button>

            {upsert.isError && <p className="text-sm text-danger-600" role="alert">{(upsert.error as Error).message}</p>}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
              <button
                type="button" className="btn-primary" disabled={!valid || upsert.isPending}
                onClick={() => upsert.mutate(
                  {
                    title: form.title.trim(), durationMin: form.durationMin, passingScore: form.passingScore,
                    questions: form.questions.map(toApiQuestion),
                  },
                  { onSuccess: () => setForm(null) },
                )}
              >
                {upsert.isPending ? "Saving…" : "Save exam"}
              </button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

/** Stored question back into editor state. */
function fromApiQuestion(q: AuthoredQuestion): QuestionValues {
  return {
    prompt: q.prompt,
    type: q.type,
    options: q.options ?? [],
    correct: q.correct ?? 0,
    correctOptions: q.correctOptions ?? [],
    correctOrder: q.correctOrder ?? [],
    pairs: q.pairs ?? [],
    answerText: q.answerText ?? "",
    explanation: q.explanation ?? "",
    hint: q.hint ?? "",
    points: q.points ?? 1,
  };
}
