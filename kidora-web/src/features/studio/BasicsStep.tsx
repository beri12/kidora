"use client";
import { useMemo, useState } from "react";
import { ArrowRight, Clock, ImageIcon, Sprout } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/dashboard";
import { useBrowseFilters, useOutcomes, useUpdateAuthoredCourse } from "@/lib/hooks/queries";
import type { CourseTree } from "@/lib/api/authoring";
import { basicInfoSchema, fieldError } from "@/features/course-builder/schema";
import { Field, SaveIndicator, SelectField, TextArea, TextField, useAutosave } from "@/features/course-builder/parts";
import { ThumbnailPicker } from "./ThumbnailPicker";
import { CourseOverviewPanel } from "./CourseOverviewPanel";
import { useRegisterFlush } from "./CourseStudio";

const SHORT_LIMIT = 500;

/**
 * Step 1 — what the course is. Nothing here needs a decision about teaching:
 * a teacher can fill this in before they have planned a single lesson, which
 * is the point of letting the draft exist first.
 */
export function BasicsStep({ course, onContinue }: { course: CourseTree; onContinue: () => void }) {
  const filters = useBrowseFilters();
  const outcomes = useOutcomes(course.id);
  const update = useUpdateAuthoredCourse(course.id);

  const [form, setForm] = useState({
    title: course.title,
    shortDescription: course.shortDescription ?? "",
    subjectSlug: course.subject?.slug ?? "",
    gradeId: course.grade?.id ?? "",
    ageBand: course.ageBand ?? "",
    language: course.language ?? "",
    difficulty: course.difficulty,
    estimatedMinutes: course.estimatedMinutes ?? undefined,
    thumbnailUrl: course.thumbnailUrl ?? "",
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const result = useMemo(() => basicInfoSchema.safeParse(form), [form]);
  const save = (v: typeof form) => update.mutateAsync({ ...v, thumbnailUrl: v.thumbnailUrl || undefined });
  const { state, savedAt, flush } = useAutosave(form, save, { enabled: result.success });
  // The footer's Save buttons flush this form rather than waiting out the
  // autosave timer.
  useRegisterFlush(() => (result.success ? flush() : Promise.reject(new Error("invalid"))));

  const hours = form.estimatedMinutes ? Math.round((form.estimatedMinutes / 60) * 10) / 10 : "";
  const subjectName = filters.data?.subjects.find((s) => s.slug === form.subjectSlug)?.name;
  const audienceMissing = !form.gradeId && !form.ageBand.trim();

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="min-w-0">
        <CardHeader
          title={
            <span className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700" aria-hidden>
                <ImageIcon size={18} />
              </span>
              Course Basic Information
            </span>
          }
          sub="Start with the essential details about your course."
        />
        <CardBody className="space-y-4">
          <div className="flex justify-end"><SaveIndicator state={state} savedAt={savedAt} /></div>

          <TextField
            label="Course Title" required value={form.title} onChange={(v) => set("title", v)}
            error={fieldError(result, "title")} placeholder="Introduction to Python Programming"
          />

          <div>
            <TextArea
              label="Short Description" required rows={4} value={form.shortDescription}
              onChange={(v) => set("shortDescription", v.slice(0, SHORT_LIMIT))}
              error={fieldError(result, "shortDescription")}
              placeholder="Learn Python from scratch and build real projects!"
            />
            <p className={`mt-1 text-right text-xs ${form.shortDescription.length > SHORT_LIMIT - 40 ? "text-warning-600" : "text-muted"}`}>
              {form.shortDescription.length}/{SHORT_LIMIT}
            </p>
          </div>

          <ThumbnailPicker
            value={form.thumbnailUrl || null}
            onUploaded={(url) => set("thumbnailUrl", url)}
            onClear={() => set("thumbnailUrl", "")}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Course Level" required id="f-course-level">
              <div className="relative">
                <Sprout size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-success-600" aria-hidden />
                <select
                  id="f-course-level" className="input appearance-none pl-9 pr-9"
                  value={form.difficulty}
                  onChange={(e) => set("difficulty", e.target.value as typeof form.difficulty)}
                >
                  <option value="EASY">Beginner</option>
                  <option value="MEDIUM">Intermediate</option>
                  <option value="HARD">Advanced</option>
                </select>
              </div>
            </Field>

            <Field label="Estimated Duration" required id="f-estimated-duration" hint="Leave blank to add up the item times instead.">
              <div className="relative">
                <Clock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-600" aria-hidden />
                <input
                  type="number" min={0} step={0.5} className="input pl-9 pr-16"
                  value={hours} id="f-estimated-duration"
                  aria-label="Estimated duration in hours"
                  onChange={(e) => set("estimatedMinutes", e.target.value ? Math.round(Number(e.target.value) * 60) : undefined)}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">hours</span>
              </div>
            </Field>
          </div>

          <SelectField
            label="Course Category" required value={form.subjectSlug} onChange={(v) => set("subjectSlug", v)}
            error={fieldError(result, "subjectSlug")}
            hint="This is the subject students filter by when they browse."
            options={[{ value: "", label: "Choose a category" }, ...(filters.data?.subjects ?? []).map((s) => ({ value: s.slug, label: s.name }))]}
          />

          {/* Not in the visual design, but the publish check refuses a course
              with neither, so hiding it would only move the dead end to step 7. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Grade" value={form.gradeId} onChange={(v) => set("gradeId", v)}
              hint={audienceMissing ? "Set a grade or an age range — publishing needs one." : undefined}
              options={[{ value: "", label: "Any grade" }, ...(filters.data?.grades ?? []).map((g) => ({ value: g.id, label: g.name }))]}
            />
            <TextField
              label="Age range" value={form.ageBand} onChange={(v) => set("ageBand", v)} placeholder="9-12"
              hint={audienceMissing ? "For example 9-12." : undefined}
            />
          </div>

          <details className="rounded-2xl bg-slate-50 p-3">
            <summary className="cursor-pointer text-sm font-medium">More (optional)</summary>
            <div className="mt-3">
              <SelectField
                label="Language" value={form.language} onChange={(v) => set("language", v)}
                options={[
                  { value: "", label: "Not set" },
                  ...["English", "Amharic", "Swahili", "French"].map((l) => ({ value: l, label: l })),
                ]}
              />
            </div>
          </details>

          <div className="flex justify-end">
            <button type="button" className="btn-primary" onClick={onContinue} disabled={!result.success}>
              Save &amp; Continue <ArrowRight size={16} aria-hidden />
            </button>
          </div>
        </CardBody>
      </Card>

      <div className="min-w-0">
        <CourseOverviewPanel
          title={form.title}
          difficulty={form.difficulty}
          estimatedMinutes={form.estimatedMinutes}
          category={subjectName}
          thumbnailUrl={form.thumbnailUrl || undefined}
          outcomes={(outcomes.data ?? []).map((o) => o.text)}
          prerequisites={course.requirements}
        />
      </div>
    </div>
  );
}
