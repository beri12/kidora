"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { TeacherShell } from "@/features/teacher/TeacherShell";
import { TopHeader, ErrorState, Pill, Skeleton, cn } from "@/components/dashboard";
import { RequireRole } from "@/components/shared/RequireRole";
import { useCourseTree, useReadiness } from "@/lib/hooks/queries";
import type { CourseTree } from "@/lib/api/authoring";
import { BasicsStep } from "./BasicsStep";
import { CurriculumStep } from "./CurriculumStep";
import { AssessmentStep } from "./AssessmentStep";
import { PublishStep } from "./PublishStep";

/**
 * The five steps of the course studio.
 *
 * Deliberately fewer than the tree has levels: a teacher thinks in "set it
 * up / build it / test it / ship it", not in twelve separate screens. Content
 * is edited inside Curriculum rather than as its own step, because you edit a
 * lesson *where you see it in the tree*.
 */
const STEPS = [
  { key: "basics", label: "Basics", done: (c: CourseTree) => c.title.trim().length >= 2 && Boolean(c.subject) && c.description.trim().length >= 20 },
  { key: "curriculum", label: "Curriculum", done: (c: CourseTree) => c.sections.some((s) => s.lessons.length > 0) },
  { key: "content", label: "Content", done: (c: CourseTree) => c.sections.some((s) => s.lessons.some((l) => (l.contents?.length ?? 0) > 0)) },
  { key: "assessment", label: "Assessment", done: (c: CourseTree) => c.quizzes.length > 0 || c.assignments.length > 0 || c.exams.length > 0 },
  { key: "publish", label: "Publish", done: (c: CourseTree) => c.status === "PUBLISHED" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

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
  const [step, setStep] = useState<StepKey>("basics");

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
  const index = STEPS.findIndex((s) => s.key === step);
  const go = (k: StepKey) => { setStep(k); window.scrollTo({ top: 0, behavior: "smooth" }); };

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
      <div className="space-y-4">
        <Stepper current={step} course={course} onGo={go} />

        {step === "basics" && <BasicsStep course={course} />}
        {step === "curriculum" && <CurriculumStep course={course} mode="structure" />}
        {step === "content" && <CurriculumStep course={course} mode="content" />}
        {step === "assessment" && <AssessmentStep course={course} />}
        {step === "publish" && <PublishStep course={course} onDone={() => router.push("/teacher/courses")} />}

        <div className="flex items-center justify-between gap-2 pt-1">
          <button type="button" className="btn-ghost" disabled={index <= 0} onClick={() => go(STEPS[index - 1].key)}>
            <ChevronLeft size={16} aria-hidden /> Back
          </button>
          <p className="hidden text-xs text-muted sm:block">Everything saves as you type.</p>
          <button
            type="button" className="btn-primary"
            disabled={index >= STEPS.length - 1}
            onClick={() => go(STEPS[index + 1].key)}
          >
            Save &amp; continue <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      </div>
    </TeacherShell>
  );
}

/** ● Basics ─── ● Curriculum ─── ○ Content ─── ○ Assessment ─── ○ Publish */
function Stepper({
  current, course, onGo,
}: { current: StepKey; course: CourseTree; onGo: (k: StepKey) => void }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);
  return (
    <nav aria-label="Course studio steps">
      <ol className="flex items-center gap-1 overflow-x-auto rounded-2xl bg-white p-2 shadow-card ring-1 ring-black/[0.04]">
        {STEPS.map((s, i) => {
          const done = s.done(course);
          const active = s.key === current;
          return (
            <li key={s.key} className="flex min-w-0 flex-1 items-center">
              <button
                type="button"
                onClick={() => onGo(s.key)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "focus-ring flex min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                  active ? "bg-brand-50 font-semibold text-brand-800" : "hover:bg-slate-50",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                    done ? "bg-success-500 text-white"
                    : active ? "bg-brand-800 text-white"
                    : "bg-slate-100 text-slate-400",
                  )}
                  aria-hidden
                >
                  {done ? <Check size={12} /> : i + 1}
                </span>
                <span className="truncate">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <span
                  className={cn("mx-1 hidden h-0.5 flex-1 rounded-full sm:block", i < currentIndex ? "bg-success-400" : "bg-slate-100")}
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
