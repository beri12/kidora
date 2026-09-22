"use client";
import { useEffect, useState } from "react";
import { Check, FileCheck2, Plus, X } from "lucide-react";
import { Card, CardBody, CardHeader, Pill } from "@/components/dashboard";
import {
  useAddOutcome, useDeleteOutcome, useModuleExam, useOutcomes, useUpdateLesson, useUpdateSection,
} from "@/lib/hooks/queries";
import type { AuthoredLesson, AuthoredSection, CourseTree } from "@/lib/api/authoring";
import { SaveIndicator, TextArea, TextField, Toggle, useAutosave } from "@/features/course-builder/parts";

/** Third column when a module is selected. */
export function ModuleSettings({ course, section }: { course: CourseTree; section: AuthoredSection }) {
  const update = useUpdateSection(course.id);
  const exam = useModuleExam(course.id, section.id);
  const [form, setForm] = useState({
    title: section.title,
    description: section.description ?? "",
    weekNumber: section.weekNumber ?? undefined,
  });
  useEffect(() => {
    setForm({ title: section.title, description: section.description ?? "", weekNumber: section.weekNumber ?? undefined });
  }, [section.id, section.title, section.description, section.weekNumber]);

  const { state, savedAt } = useAutosave(form, (v) => update.mutateAsync({ id: section.id, ...v }));

  return (
    <div className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
      <Card>
        <CardHeader title="Module settings" />
        <CardBody className="space-y-3">
          <div className="flex justify-end"><SaveIndicator state={state} savedAt={savedAt} /></div>
          <TextField label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <TextArea label="Description" rows={3} value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          <TextField
            label="Week" type="number"
            value={form.weekNumber?.toString() ?? ""}
            onChange={(v) => setForm({ ...form, weekNumber: v ? Math.max(1, Number(v)) : undefined })}
            hint="Which week of the course this is."
          />
        </CardBody>
      </Card>

      <ModuleOutcomes courseId={course.id} sectionId={section.id} />

      <Card>
        <CardHeader title="Module exam" />
        <CardBody className="space-y-2 text-sm">
          {exam.data ? (
            <>
              <p className="font-medium">{exam.data.title}</p>
              <p className="text-xs text-muted">
                {exam.data.quiz.questions.length} question{exam.data.quiz.questions.length === 1 ? "" : "s"}
                {exam.data.durationMin ? ` · ${exam.data.durationMin} min` : ""} · pass {exam.data.passingScore}%
              </p>
              <Pill tone={exam.data.status === "OPEN" ? "success" : "neutral"}>{exam.data.status}</Pill>
            </>
          ) : (
            <p className="text-xs text-muted">
              No end-of-module exam. Add one in the Assessment step.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function ModuleOutcomes({ courseId, sectionId }: { courseId: string; sectionId: string }) {
  const q = useOutcomes(courseId, sectionId);
  const add = useAddOutcome(courseId);
  const remove = useDeleteOutcome(courseId);
  const [draft, setDraft] = useState("");

  return (
    <Card>
      <CardHeader title="Module objectives" sub="What this week teaches" />
      <CardBody className="space-y-2">
        <ul className="space-y-1">
          {(q.data ?? []).map((o) => (
            <li key={o.id} className="flex items-start gap-2 text-sm">
              <Check size={14} className="mt-0.5 shrink-0 text-success-600" aria-hidden />
              <span className="min-w-0 flex-1">{o.text}</span>
              <button
                type="button" className="focus-ring rounded p-0.5 text-slate-400 hover:text-danger-600"
                onClick={() => remove.mutate(o.id)} aria-label={`Remove "${o.text}"`}
              >
                <X size={12} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-1">
          <input
            className="input min-w-0 flex-1 text-sm" value={draft}
            placeholder="Name a variable"
            aria-label="New module objective"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim().length >= 2) {
                add.mutate({ text: draft.trim(), sectionId }, { onSuccess: () => setDraft("") });
              }
            }}
          />
          <button
            type="button" className="btn-ghost shrink-0 text-xs"
            disabled={draft.trim().length < 2}
            onClick={() => add.mutate({ text: draft.trim(), sectionId }, { onSuccess: () => setDraft("") })}
          >
            <Plus size={13} aria-hidden />
          </button>
        </div>
      </CardBody>
    </Card>
  );
}

/** Third column when a lesson is selected. */
export function LessonSettings({
  course, section, lesson,
}: { course: CourseTree; section: AuthoredSection; lesson: AuthoredLesson }) {
  const update = useUpdateLesson(course.id);
  const [form, setForm] = useState({
    description: lesson.description ?? "",
    estimatedMin: lesson.estimatedMin,
    isRequired: lesson.isRequired,
    status: lesson.status,
  });
  useEffect(() => {
    setForm({
      description: lesson.description ?? "",
      estimatedMin: lesson.estimatedMin,
      isRequired: lesson.isRequired,
      status: lesson.status,
    });
  }, [lesson.id, lesson.description, lesson.estimatedMin, lesson.isRequired, lesson.status]);

  const { state, savedAt } = useAutosave(form, (v) => update.mutateAsync({ id: lesson.id, ...v }));
  const itemMinutes = (lesson.contents ?? []).reduce((a, c) => a + (c.estimatedMin ?? 0), 0);

  return (
    <div className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
      <Card>
        <CardHeader title="Lesson settings" sub={section.title} />
        <CardBody className="space-y-3">
          <div className="flex justify-end"><SaveIndicator state={state} savedAt={savedAt} /></div>

          <TextArea
            label="Description" rows={3} value={form.description}
            onChange={(v) => setForm({ ...form, description: v })}
            hint="A sentence under the title in the curriculum."
          />
          <TextField
            label="Estimated minutes" type="number" value={String(form.estimatedMin)}
            onChange={(v) => setForm({ ...form, estimatedMin: Math.max(1, Number(v) || 1) })}
            hint={itemMinutes ? `Its items add up to ${itemMinutes} min.` : undefined}
          />
          <Toggle
            label="Required for completion" checked={form.isRequired}
            onChange={(v) => setForm({ ...form, isRequired: v })}
            hint="Optional lessons do not count towards finishing the course."
          />
          <Toggle
            label="Published" checked={form.status === "PUBLISHED"}
            onChange={(v) => setForm({ ...form, status: v ? "PUBLISHED" : "DRAFT" })}
            hint="Draft lessons are published with the course."
          />
        </CardBody>
      </Card>
    </div>
  );
}
