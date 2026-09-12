"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { TeacherShell } from "@/features/teacher/TeacherShell";
import { TopHeader, Card, CardBody, ErrorState, Pill, Skeleton, cn } from "@/components/dashboard";
import { RequireRole } from "@/components/shared/RequireRole";
import { useCourseTree, useCreateAuthoredCourse, usePublishChecklist, useBrowseFilters } from "@/lib/hooks/queries";
import type { CourseTree } from "@/lib/api/authoring";
import { AccessStep, BasicInfoStep, CompletionStep, DetailsStep } from "./StepsBasics";
import { CurriculumStep, LessonBuilder } from "./StepsCurriculum";
import { AssignmentsStep, ExamStep, QuizzesStep } from "./StepsAssessments";
import { PreviewStep, PublishStep } from "./StepsPublish";
import { basicInfoSchema, fieldError } from "./schema";
import { SelectField, TextField } from "./parts";

/**
 * The 12 steps of spec §4. Each `done` reads the saved course, not local
 * state, so the ticks reflect what is actually on the server.
 */
const STEPS = [
  { key: "basics", label: "Basic information", done: (c: CourseTree) => c.title.trim().length >= 2 && Boolean(c.subject) },
  { key: "details", label: "Course details", done: (c: CourseTree) => c.description.trim().length >= 20 },
  { key: "curriculum", label: "Curriculum", done: (c: CourseTree) => c.sections.length > 0 },
  { key: "lessons", label: "Lessons", done: (c: CourseTree) => c.sections.some((s) => s.lessons.length > 0) },
  { key: "activities", label: "Activities", done: (c: CourseTree) => c.sections.some((s) => s.lessons.some((l) => (l.contents?.length ?? 0) > 0)) },
  { key: "quizzes", label: "Quizzes", done: (c: CourseTree) => c.quizzes.length > 0 || c.sections.some((s) => s.lessons.some((l) => l.quiz)) },
  { key: "assignments", label: "Assignments", done: (c: CourseTree) => c.assignments.length > 0 },
  { key: "exam", label: "Final exam", done: (c: CourseTree) => c.exams.length > 0 },
  { key: "certificate", label: "Completion", done: (c: CourseTree) => c.issuesCertificate || !c.requireFinalExam },
  { key: "access", label: "Access", done: () => true },
  { key: "preview", label: "Preview", done: () => true },
  { key: "publish", label: "Publish", done: (c: CourseTree) => c.status === "PUBLISHED" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

/* --------------------------------------------------- new course (step 0) */

export function CreateCoursePage() {
  return (
    <RequireRole allow={["TEACHER", "SCHOOL_ADMIN", "SCHOOL_LEADER", "DISTRICT_ADMIN", "ADMIN", "SUPER_ADMIN"]}>
      <NewCourseForm />
    </RequireRole>
  );
}

function NewCourseForm() {
  const router = useRouter();
  const create = useCreateAuthoredCourse();
  const filters = useBrowseFilters();
  const [form, setForm] = useState({ title: "", subjectSlug: "", shortDescription: "" });
  const result = useMemo(() => basicInfoSchema.partial({ description: true }).safeParse({ ...form, subjectSlug: form.subjectSlug }), [form]);
  const valid = form.title.trim().length >= 2 && form.subjectSlug.length > 0;

  return (
    <TeacherShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title="Create a course" sub="Start with a title — everything else can come later" />}>
      <Card className="mx-auto max-w-xl">
        <CardBody className="space-y-4">
          <TextField
            label="Course title" required value={form.title}
            onChange={(v) => setForm({ ...form, title: v })}
            error={fieldError(result, "title")}
            placeholder="Fractions for Grade 5"
          />
          <SelectField
            label="Subject" required value={form.subjectSlug}
            onChange={(v) => setForm({ ...form, subjectSlug: v })}
            options={[{ value: "", label: "Choose a subject" }, ...(filters.data?.subjects ?? []).map((s) => ({ value: s.slug, label: s.name }))]}
          />
          <TextField
            label="Short description" value={form.shortDescription}
            onChange={(v) => setForm({ ...form, shortDescription: v })}
            hint="One line for the course card. You can change it later."
          />
          {create.isError && <p className="text-sm text-danger-600" role="alert">{(create.error as Error).message}</p>}
          <button
            type="button" className="btn-primary w-full"
            disabled={!valid || create.isPending}
            onClick={() => create.mutate(
              { title: form.title.trim(), subjectSlug: form.subjectSlug, shortDescription: form.shortDescription.trim() || undefined },
              { onSuccess: (c) => router.push(`/teacher/courses/${c.id}/build`) },
            )}
          >
            {create.isPending ? "Creating…" : "Create draft and continue"}
          </button>
          <p className="text-center text-xs text-muted">
            The course is saved as a draft. Nothing is visible to students until you publish it.
          </p>
        </CardBody>
      </Card>
    </TeacherShell>
  );
}

/* ------------------------------------------------------------- the builder */

export function CourseBuilderPage({ courseId }: { courseId: string }) {
  return (
    <RequireRole allow={["TEACHER", "SCHOOL_ADMIN", "SCHOOL_LEADER", "DISTRICT_ADMIN", "ADMIN", "SUPER_ADMIN"]}>
      <Builder courseId={courseId} />
    </RequireRole>
  );
}

function Builder({ courseId }: { courseId: string }) {
  const q = useCourseTree(courseId);
  const checklist = usePublishChecklist(courseId);
  const [step, setStep] = useState<StepKey>("basics");
  const [editingLesson, setEditingLesson] = useState<string | null>(null);

  if (q.isPending) {
    return (
      <TeacherShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title="Course builder" />}>
        <Skeleton className="h-96" />
      </TeacherShell>
    );
  }
  if (q.isError) {
    return (
      <TeacherShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title="Course builder" />}>
        <ErrorState error={q.error} retry={() => q.refetch()} />
      </TeacherShell>
    );
  }

  const course = q.data!;
  const index = STEPS.findIndex((s) => s.key === step);
  const go = (k: StepKey) => { setStep(k); setEditingLesson(null); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <TeacherShell
      header={({ onMenu }) => (
        <TopHeader
          onMenu={onMenu}
          title={course.title || "Untitled course"}
          sub={`${course.sections.length} modules · ${course._count.lessons} lessons`}
          right={
            <span className="flex items-center gap-2">
              <Pill tone={course.status === "PUBLISHED" ? "success" : course.status === "ARCHIVED" ? "neutral" : "info"}>
                {course.status}
              </Pill>
              {checklist.data && course.status !== "PUBLISHED" && (
                <span className="hidden text-xs text-muted sm:inline">
                  {checklist.data.items.filter((i) => i.ok).length}/{checklist.data.items.length} ready
                </span>
              )}
            </span>
          }
        />
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Course builder steps" className="lg:sticky lg:top-4 lg:self-start">
          {/* Horizontal and scrollable on small screens, a rail on large ones. */}
          <ol className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
            {STEPS.map((s, i) => {
              const done = s.done(course);
              const active = s.key === step;
              return (
                <li key={s.key} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    onClick={() => go(s.key)}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "focus-ring flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                      active ? "bg-brand-50 font-semibold text-brand-700" : "hover:bg-slate-50",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                        done ? "bg-success-500 text-white" : active ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-400",
                      )}
                      aria-hidden
                    >
                      {done ? <Check size={11} /> : i + 1}
                    </span>
                    <span className="whitespace-nowrap lg:whitespace-normal">{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="min-w-0 space-y-4">
          {step === "basics" && <BasicInfoStep course={course} />}
          {step === "details" && <DetailsStep course={course} />}
          {(step === "curriculum" || step === "lessons" || step === "activities") && (
            editingLesson
              ? <LessonBuilder course={course} lessonId={editingLesson} onClose={() => setEditingLesson(null)} />
              : <CurriculumStep course={course} onEditLesson={setEditingLesson} />
          )}
          {step === "quizzes" && <QuizzesStep course={course} />}
          {step === "assignments" && <AssignmentsStep course={course} />}
          {step === "exam" && <ExamStep course={course} />}
          {step === "certificate" && <CompletionStep course={course} />}
          {step === "access" && <AccessStep course={course} />}
          {step === "preview" && <PreviewStep course={course} />}
          {step === "publish" && <PublishStep course={course} onPublished={() => q.refetch()} />}

          <div className="flex items-center justify-between gap-2 pt-2">
            <button
              type="button" className="btn-ghost"
              disabled={index <= 0}
              onClick={() => go(STEPS[index - 1].key)}
            >
              <ChevronLeft size={16} aria-hidden /> Back
            </button>
            <button
              type="button" className="btn-primary"
              disabled={index >= STEPS.length - 1}
              onClick={() => go(STEPS[index + 1].key)}
            >
              Next <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </TeacherShell>
  );
}
