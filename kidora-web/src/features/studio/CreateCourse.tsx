"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TeacherShell } from "@/features/teacher/TeacherShell";
import { TopHeader, Card, CardBody } from "@/components/dashboard";
import { RequireRole } from "@/components/shared/RequireRole";
import { useBrowseFilters, useCreateAuthoredCourse } from "@/lib/hooks/queries";
import { basicInfoSchema, fieldError } from "@/features/course-builder/schema";
import { SelectField, TextField } from "@/features/course-builder/parts";

/**
 * Step zero: a title and a subject, and you are in the studio.
 *
 * Deliberately tiny. Asking for everything up front is what makes teachers
 * abandon a course before it exists; the rest is filled in where it belongs.
 */
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
