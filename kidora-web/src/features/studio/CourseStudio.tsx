"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Eye, Save } from "lucide-react";
import { TeacherShell } from "@/features/teacher/TeacherShell";
import { TopHeader, ErrorState, Pill, Skeleton, cn } from "@/components/dashboard";
import { RequireRole } from "@/components/shared/RequireRole";
import { useCourseTree, useOutcomes, useReadiness } from "@/lib/hooks/queries";
import type { CourseTree } from "@/lib/api/authoring";
import { BasicsStep } from "./BasicsStep";
import { OutcomesStep } from "./OutcomesStep";
import { CurriculumStep } from "./CurriculumStep";
import { AssessmentStep } from "./AssessmentStep";
import { PreviewStep } from "./PreviewStep";
import { PublishStep } from "./PublishStep";

/**
 * The seven steps of the course studio, in the order a teacher works:
 * describe it, say what it teaches, lay out the modules, fill them with
 * content, add the assessment, look at it as a student, then ship it.
 *
 * Each step saves to the same DRAFT course as you go — there is no separate
 * "submit" that could lose work, and nothing reaches a student until step 7.
 */
const STEPS = [
  {
    key: "basics", label: "Basics",
    done: (c: CourseTree) => c.title.trim().length >= 2 && Boolean(c.subject) && c.shortDescription.trim().length >= 10,
  },
  {
    key: "outcomes", label: "Learning Outcomes",
    done: (c: CourseTree, x: Extra) => c.description.trim().length >= 20 && x.outcomes > 0,
  },
  {
    key: "modules", label: "Modules",
    done: (c: CourseTree) => c.sections.some((s) => s.lessons.length > 0),
  },
  {
    key: "content", label: "Content",
    done: (c: CourseTree) => c.sections.some((s) => s.lessons.some((l) => (l.contents?.length ?? 0) > 0)),
  },
  {
    key: "assessment", label: "Assessment",
    done: (c: CourseTree) => c.quizzes.length > 0 || c.assignments.length > 0 || c.exams.length > 0,
  },
  {
    // Nothing is stored by looking at a preview, so this step is done once the
    // teacher has actually opened it. Claiming otherwise would be a lie.
    key: "preview", label: "Preview",
    done: (_c: CourseTree, x: Extra) => x.previewed,
  },
  {
    key: "publish", label: "Publish",
    done: (c: CourseTree) => c.status === "PUBLISHED",
  },
] as const;

type Extra = { outcomes: number; previewed: boolean };
export type StepKey = (typeof STEPS)[number]["key"];

/* --------------------------------------------------------------- saving */

/**
 * The footer's Save buttons live outside the step that owns the form, so the
 * active step registers how to flush its pending edits. Without this, "Save
 * draft" would be a button that does nothing while an autosave timer is still
 * counting down.
 */
type Flush = () => Promise<unknown>;
const FlushContext = createContext<(fn: Flush | null) => void>(() => {});

export function useRegisterFlush(flush: Flush) {
  const register = useContext(FlushContext);
  const latest = useRef(flush);
  latest.current = flush;
  useEffect(() => {
    register(() => latest.current());
    return () => register(null);
  }, [register]);
}

export function CourseStudioPage({ courseId }: { courseId: string }) {
  return (
    <RequireRole allow={["TEACHER", "SCHOOL_ADMIN", "SCHOOL_LEADER", "DISTRICT_ADMIN", "ADMIN", "SUPER_ADMIN"]}>
      <Studio courseId={courseId} />
    </RequireRole>
  );
}

function Studio({ courseId }: { courseId: string }) {
  const router = useRouter();
  const tree = useCourseTree(courseId);
  const readiness = useReadiness(courseId);
  const outcomes = useOutcomes(courseId);
  const [step, setStep] = useState<StepKey>("basics");
  const [previewed, setPreviewed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const flushRef = useRef<Flush | null>(null);
  const register = useCallback((fn: Flush | null) => { flushRef.current = fn; }, []);

  // Flush whatever the current step has pending, and never let a failed save
  // masquerade as a successful one.
  const save = useCallback(async () => {
    if (!flushRef.current) return true;
    setSaving(true);
    try {
      await flushRef.current();
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  if (tree.isPending) {
    return (
      <TeacherShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title="Course studio" />}>
        <Skeleton className="h-[70vh]" />
      </TeacherShell>
    );
  }
  if (tree.isError) {
    return (
      <TeacherShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title="Course studio" />}>
        <ErrorState error={tree.error} retry={() => tree.refetch()} />
      </TeacherShell>
    );
  }

  const course = tree.data!;
  const extra: Extra = { outcomes: outcomes.data?.length ?? 0, previewed };
  const index = STEPS.findIndex((s) => s.key === step);
  const last = index === STEPS.length - 1;

  const go = (k: StepKey) => {
    setStep(k);
    if (k === "preview") setPreviewed(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const saveAndContinue = async () => {
    const ok = await save();
    if (!ok) { setSavedNote("Could not save — check the fields above."); return; }
    setSavedNote(null);
    go(STEPS[index + 1].key);
  };
  const saveDraft = async () => {
    const ok = await save();
    setSavedNote(ok ? "Draft saved." : "Could not save — check the fields above.");
    window.setTimeout(() => setSavedNote(null), 4000);
  };

  const statusTone =
    course.status === "PUBLISHED" ? "success"
    : course.status === "REVIEW" ? "warning"
    : course.status === "ARCHIVED" ? "neutral"
    : course.status === "UNPUBLISHED" ? "warning"
    : "info";

  return (
    <TeacherShell
      header={({ onMenu }) => (
        <TopHeader
          onMenu={onMenu}
          title={course.title || "Untitled course"}
          sub={`${course.sections.length} modules · ${course._count.lessons} lessons`}
          right={
            <span className="flex items-center gap-2">
              <Pill tone={statusTone}>{course.status}</Pill>
              {readiness.data && course.status !== "PUBLISHED" && (
                <span className="hidden text-xs text-muted sm:inline">
                  {readiness.data.lines.filter((l) => l.ok).length}/{readiness.data.lines.length} ready
                </span>
              )}
              <Link href={`/teacher/courses/${courseId}/preview`} className="btn-ghost">
                <Eye size={15} aria-hidden /> <span className="hidden sm:inline">Preview</span>
              </Link>
            </span>
          }
        />
      )}
    >
      <FlushContext.Provider value={register}>
        <div className="space-y-4">
          <StudioHeading step={step} />
          <Stepper current={step} course={course} extra={extra} onGo={go} />

          {step === "basics" && <BasicsStep course={course} onContinue={saveAndContinue} />}
          {step === "outcomes" && <OutcomesStep course={course} />}
          {step === "modules" && <CurriculumStep course={course} mode="structure" />}
          {step === "content" && <CurriculumStep course={course} mode="content" />}
          {step === "assessment" && <AssessmentStep course={course} />}
          {step === "preview" && <PreviewStep course={course} />}
          {step === "publish" && <PublishStep course={course} onDone={() => router.push("/teacher/courses")} />}

          <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-2 border-t border-slate-100 bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-7 lg:px-7">
            <div className="flex items-center gap-2">
              <button type="button" className="btn-ghost" disabled={index <= 0} onClick={() => go(STEPS[index - 1].key)}>
                <ChevronLeft size={16} aria-hidden /> <span className="hidden sm:inline">Back</span>
              </button>
              <button type="button" className="btn-ghost" onClick={saveDraft} disabled={saving}>
                <Save size={15} aria-hidden /> Save Draft
              </button>
            </div>

            <div className="flex items-center gap-3">
              {savedNote && <p className="text-xs text-muted" role="status">{savedNote}</p>}
              {!last && (
                <button type="button" className="btn-primary" onClick={saveAndContinue} disabled={saving}>
                  {saving ? "Saving…" : "Save & Continue"} <ChevronRight size={16} aria-hidden />
                </button>
              )}
            </div>
          </div>
        </div>
      </FlushContext.Provider>
    </TeacherShell>
  );
}

function StudioHeading({ step }: { step: StepKey }) {
  return (
    <div>
      <Link href="/teacher/courses" className="focus-ring inline-flex items-center gap-1.5 rounded text-sm text-muted hover:text-ink">
        <ChevronLeft size={15} aria-hidden /> Back to My Courses
      </Link>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">
        {step === "publish" ? "Publish Course" : "Create New Course"}
      </h1>
      <p className="text-sm text-muted">
        Build an engaging course with structured learning, interactive content, and assessments.
      </p>
    </div>
  );
}

/** ①—②—③—④—⑤—⑥—⑦ with the label under each circle, as in the design. */
function Stepper({
  current, course, extra, onGo,
}: { current: StepKey; course: CourseTree; extra: Extra; onGo: (k: StepKey) => void }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);
  return (
    <nav aria-label="Course studio steps">
      <ol className="flex items-start gap-1 overflow-x-auto rounded-2xl bg-white p-3 shadow-card ring-1 ring-black/[0.04]">
        {STEPS.map((s, i) => {
          const done = s.done(course, extra);
          const active = s.key === current;
          return (
            <li key={s.key} className="flex min-w-0 flex-1 items-start">
              <button
                type="button"
                onClick={() => onGo(s.key)}
                aria-current={active ? "step" : undefined}
                className="focus-ring flex w-[84px] shrink-0 flex-col items-center gap-1.5 rounded-xl px-1 py-1 sm:w-auto sm:min-w-0 sm:flex-1"
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors",
                    active ? "bg-brand-800 text-white ring-4 ring-brand-100"
                    : done ? "bg-success-500 text-white"
                    : "bg-slate-100 text-slate-400",
                  )}
                  aria-hidden
                >
                  {done && !active ? <Check size={14} /> : i + 1}
                </span>
                <span
                  className={cn(
                    "text-center text-[11px] leading-tight sm:text-xs",
                    active ? "font-semibold text-brand-800" : "text-muted",
                  )}
                >
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <span
                  className={cn("mt-4 hidden h-0.5 flex-1 rounded-full sm:block", i < currentIndex ? "bg-success-400" : "bg-slate-100")}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
