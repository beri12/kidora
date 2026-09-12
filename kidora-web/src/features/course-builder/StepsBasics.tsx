"use client";
import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader, Pill } from "@/components/dashboard";
import { useBrowseFilters, useSetCompletionRules, useUpdateAuthoredCourse } from "@/lib/hooks/queries";
import type { CourseTree } from "@/lib/api/authoring";
import { basicInfoSchema, detailsSchema, fieldError } from "./schema";
import { Field, SaveIndicator, SelectField, StringList, TextArea, TextField, Toggle, useAutosave } from "./parts";
import { FileUpload } from "./FileUpload";

/* ------------------------------------------------------- 1. Basic details */

export function BasicInfoStep({ course }: { course: CourseTree }) {
  const filters = useBrowseFilters();
  const update = useUpdateAuthoredCourse(course.id);

  const [form, setForm] = useState({
    title: course.title,
    shortDescription: course.shortDescription ?? "",
    description: course.description ?? "",
    subjectSlug: course.subject?.slug ?? "",
    gradeId: course.grade?.id ?? "",
    ageBand: course.ageBand ?? "",
    language: course.language ?? "",
    difficulty: course.difficulty,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const result = useMemo(() => basicInfoSchema.safeParse(form), [form]);
  const { state, savedAt } = useAutosave(form, (v) => update.mutateAsync(v), { enabled: result.success });

  return (
    <Card>
      <CardHeader
        title="Basic information"
        sub="What this course is and who it is for"
      />
      <CardBody className="space-y-4">
        <div className="flex justify-end"><SaveIndicator state={state} savedAt={savedAt} /></div>

        <TextField
          label="Course title" required value={form.title} onChange={(v) => set("title", v)}
          error={fieldError(result, "title")} placeholder="Fractions for Grade 5"
        />
        <TextField
          label="Short description" value={form.shortDescription} onChange={(v) => set("shortDescription", v)}
          error={fieldError(result, "shortDescription")}
          hint="One line, shown on the course card while browsing."
        />
        <TextArea
          label="Full description" value={form.description} onChange={(v) => set("description", v)}
          error={fieldError(result, "description")} rows={6}
          hint="At least a couple of sentences — this is checked before publishing."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Subject" required value={form.subjectSlug} onChange={(v) => set("subjectSlug", v)}
            error={fieldError(result, "subjectSlug")}
            options={[{ value: "", label: "Choose a subject" }, ...(filters.data?.subjects ?? []).map((s) => ({ value: s.slug, label: s.name }))]}
          />
          <SelectField
            label="Grade" value={form.gradeId} onChange={(v) => set("gradeId", v)}
            options={[{ value: "", label: "Any grade" }, ...(filters.data?.grades ?? []).map((g) => ({ value: g.id, label: g.name }))]}
            hint="Leave blank and set an age range instead if the course suits several grades."
          />
          <TextField label="Age range" value={form.ageBand} onChange={(v) => set("ageBand", v)} placeholder="9-12" />
          <SelectField
            label="Difficulty" value={form.difficulty} onChange={(v) => set("difficulty", v as typeof form.difficulty)}
            options={[{ value: "EASY", label: "Easy" }, { value: "MEDIUM", label: "Medium" }, { value: "HARD", label: "Hard" }]}
          />
          <SelectField
            label="Language" value={form.language} onChange={(v) => set("language", v)}
            options={[
              { value: "", label: "Not set" },
              ...(filters.data?.languages ?? []).map((l) => ({ value: l, label: l })),
              ...(["English", "Amharic", "Swahili", "French"].filter((l) => !(filters.data?.languages ?? []).includes(l)).map((l) => ({ value: l, label: l }))),
            ]}
          />
        </div>
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------- 2. Course detail */

export function DetailsStep({ course }: { course: CourseTree }) {
  const update = useUpdateAuthoredCourse(course.id);
  const [form, setForm] = useState({
    learningPoints: course.learningPoints ?? [],
    requirements: course.requirements ?? [],
    tags: course.tags ?? [],
    topic: course.topic ?? "",
    estimatedMinutes: course.estimatedMinutes ?? undefined,
    thumbnailUrl: course.thumbnailUrl ?? "",
    bannerUrl: course.bannerUrl ?? "",
    trailerUrl: course.trailerUrl ?? "",
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const result = useMemo(() => detailsSchema.safeParse(form), [form]);
  const { state, savedAt } = useAutosave(form, (v) => update.mutateAsync({
    ...v,
    thumbnailUrl: v.thumbnailUrl || undefined,
    bannerUrl: v.bannerUrl || undefined,
    trailerUrl: v.trailerUrl || undefined,
  }), { enabled: result.success });

  return (
    <Card>
      <CardHeader title="Course details" sub="What students will learn, and what they need first" />
      <CardBody className="space-y-4">
        <div className="flex justify-end"><SaveIndicator state={state} savedAt={savedAt} /></div>

        <StringList
          label="Learning objectives" values={form.learningPoints} onChange={(v) => set("learningPoints", v)}
          placeholder="Compare two fractions" hint="One per line. Press Enter to add."
        />
        <StringList
          label="Prerequisites" values={form.requirements} onChange={(v) => set("requirements", v)}
          placeholder="Can multiply to 12×12"
        />
        <StringList
          label="Tags" values={form.tags} onChange={(v) => set("tags", v)} placeholder="fractions"
          hint="Helps students find the course when searching."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Topic" value={form.topic} onChange={(v) => set("topic", v)} placeholder="Fractions" />
          <TextField
            label="Estimated minutes" type="number"
            value={form.estimatedMinutes?.toString() ?? ""}
            onChange={(v) => set("estimatedMinutes", v ? Number(v) : undefined)}
            hint="Leave blank to add up the lesson times instead."
          />
        </div>

        <FileUpload
          label="Thumbnail" slot="image" value={form.thumbnailUrl || null}
          onUploaded={(f) => set("thumbnailUrl", f.url)}
          onClear={() => set("thumbnailUrl", "")}
          hint="Shown on the course card while students browse."
        />
        {form.thumbnailUrl && (
          <Field label="Thumbnail preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.thumbnailUrl} alt="" className="max-h-40 rounded-xl border border-slate-200 object-cover" />
          </Field>
        )}

        <FileUpload
          label="Banner" slot="image" value={form.bannerUrl || null}
          onUploaded={(f) => set("bannerUrl", f.url)}
          onClear={() => set("bannerUrl", "")}
          hint="The wide image at the top of the course page."
        />
        <FileUpload
          label="Trailer video" slot="video" value={form.trailerUrl || null}
          onUploaded={(f) => set("trailerUrl", f.url)}
          onClear={() => set("trailerUrl", "")}
          hint="A short clip on the course page. Optional."
        />
      </CardBody>
    </Card>
  );
}

/* ---------------------------------------------------- 9. Access + pricing */

export function AccessStep({ course }: { course: CourseTree }) {
  const update = useUpdateAuthoredCourse(course.id);
  const [access, setAccess] = useState(course.access);
  const { state, savedAt } = useAutosave(access, (v) => update.mutateAsync({ access: v }));

  const OPTIONS = [
    { value: "FREE", label: "Free", body: "Any student on Kidora can enrol." },
    { value: "PREMIUM", label: "Kidora Plus", body: "Only students with an active subscription can enrol." },
    { value: "SCHOOL_ONLY", label: "My school only", body: "Only students at your school can see this course." },
    { value: "INVITE_ONLY", label: "Invite only", body: "Hidden from browsing. You add students yourself." },
  ] as const;

  return (
    <Card>
      <CardHeader title="Access" sub="Who can enrol in this course" />
      <CardBody className="space-y-3">
        <div className="flex justify-end"><SaveIndicator state={state} savedAt={savedAt} /></div>
        <fieldset className="space-y-2">
          <legend className="sr-only">Course access</legend>
          {OPTIONS.map((o) => (
            <label
              key={o.value}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 ${
                access === o.value ? "border-brand-400 bg-brand-50/50" : "border-slate-200"
              }`}
            >
              <input
                type="radio" name="access" value={o.value} checked={access === o.value}
                onChange={() => setAccess(o.value)}
                className="mt-1 size-4 text-brand-600 focus-ring"
              />
              <span className="text-sm">
                <span className="font-medium">{o.label}</span>
                <span className="block text-xs text-muted">{o.body}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <p className="text-xs text-muted">
          Access is enforced on the server for every request, not just hidden in the browser.
        </p>
      </CardBody>
    </Card>
  );
}

/* -------------------------------------- 8. Completion rules + certificate */

export function CompletionStep({ course }: { course: CourseTree }) {
  const save = useSetCompletionRules(course.id);
  const [rules, setRules] = useState({
    requireAllLessons: course.requireAllLessons,
    requireAllQuizzes: course.requireAllQuizzes,
    requireAllAssignments: course.requireAllAssignments,
    requireFinalExam: course.requireFinalExam,
    passingScore: course.passingScore,
    issuesCertificate: course.issuesCertificate,
  });
  const set = <K extends keyof typeof rules>(k: K, v: (typeof rules)[K]) => setRules((r) => ({ ...r, [k]: v }));
  const { state, savedAt } = useAutosave(rules, (v) => save.mutateAsync(v));

  const hasExam = course.exams.length > 0 && course.exams[0].quiz._count.questions > 0;

  return (
    <Card>
      <CardHeader title="Completion and certificate" sub="What a student must finish for this course to count as done" />
      <CardBody className="space-y-3">
        <div className="flex justify-end"><SaveIndicator state={state} savedAt={savedAt} /></div>

        <Toggle
          label="Finish every lesson" checked={rules.requireAllLessons}
          onChange={(v) => set("requireAllLessons", v)}
          hint="Lessons marked optional do not count."
        />
        <Toggle
          label="Pass every required quiz" checked={rules.requireAllQuizzes}
          onChange={(v) => set("requireAllQuizzes", v)}
        />
        <Toggle
          label="Hand in every required assignment" checked={rules.requireAllAssignments}
          onChange={(v) => set("requireAllAssignments", v)}
        />
        <Toggle
          label="Pass the final exam" checked={rules.requireFinalExam}
          onChange={(v) => set("requireFinalExam", v)}
          hint={hasExam ? undefined : "You have not added a final exam yet — the course cannot be published with this on."}
        />
        {rules.requireFinalExam && !hasExam && (
          <p className="rounded-xl bg-warning-50 p-3 text-xs text-warning-700">
            Add a final exam with at least one question, or turn this off.
          </p>
        )}

        <div className="max-w-xs pt-2">
          <TextField
            label="Pass mark (%)" type="number" value={String(rules.passingScore)}
            onChange={(v) => set("passingScore", Math.max(0, Math.min(100, Number(v) || 0)))}
          />
        </div>

        <div className="mt-2 rounded-2xl bg-slate-50 p-3">
          <Toggle
            label="Issue a certificate on completion" checked={rules.issuesCertificate}
            onChange={(v) => set("issuesCertificate", v)}
            hint="The certificate carries the student's name, this course, the date and a code anyone can verify."
          />
          {rules.issuesCertificate && (
            <p className="mt-2 flex items-center gap-2 text-xs text-muted">
              <Pill tone="success">On</Pill>
              Issued automatically the first time a student meets every rule above.
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
