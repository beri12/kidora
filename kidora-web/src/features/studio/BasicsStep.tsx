"use client";
import { useMemo, useState } from "react";
import { Check, GripVertical, Plus, Trash2, UserPlus, X } from "lucide-react";
import { Card, CardBody, CardHeader, Avatar, Pill, cn } from "@/components/dashboard";
import {
  useAddInstructor, useAddOutcome, useBrowseFilters, useDeleteOutcome, useInstructors,
  useOutcomes, useRemoveInstructor, useReorderOutcomes, useUpdateAuthoredCourse, useUpdateOutcome,
} from "@/lib/hooks/queries";
import type { CourseTree } from "@/lib/api/authoring";
import { basicInfoSchema, fieldError } from "@/features/course-builder/schema";
import {
  Field, ReorderButtons, SaveIndicator, SelectField, TextArea, TextField, moved, useAutosave,
} from "@/features/course-builder/parts";
import { FileUpload } from "@/features/course-builder/FileUpload";

/**
 * Step 1. Everything that describes the course, plus the two things that are
 * rows rather than fields: learning outcomes and co-instructors.
 */
export function BasicsStep({ course }: { course: CourseTree }) {
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
    estimatedMinutes: course.estimatedMinutes ?? undefined,
    thumbnailUrl: course.thumbnailUrl ?? "",
    bannerUrl: course.bannerUrl ?? "",
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const result = useMemo(() => basicInfoSchema.safeParse(form), [form]);
  const { state, savedAt } = useAutosave(
    form,
    (v) => update.mutateAsync({
      ...v,
      thumbnailUrl: v.thumbnailUrl || undefined,
      bannerUrl: v.bannerUrl || undefined,
    }),
    { enabled: result.success },
  );

  const hours = form.estimatedMinutes ? Math.round((form.estimatedMinutes / 60) * 10) / 10 : "";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-4">
        <Card>
          <CardHeader title="Course information" sub="What this course is and who it is for" />
          <CardBody className="space-y-4">
            <div className="flex justify-end"><SaveIndicator state={state} savedAt={savedAt} /></div>

            <TextField
              label="Course title" required value={form.title} onChange={(v) => set("title", v)}
              error={fieldError(result, "title")} placeholder="Introduction to Python"
            />
            <TextArea
              label="Short description" rows={2} value={form.shortDescription}
              onChange={(v) => set("shortDescription", v)}
              error={fieldError(result, "shortDescription")}
              hint="One line, shown on the course card."
            />
            <TextArea
              label="Full description" required rows={6} value={form.description}
              onChange={(v) => set("description", v)}
              error={fieldError(result, "description")}
              hint="A couple of sentences at least — this is checked before publishing."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Subject" required value={form.subjectSlug} onChange={(v) => set("subjectSlug", v)}
                error={fieldError(result, "subjectSlug")}
                options={[{ value: "", label: "Choose a subject" }, ...(filters.data?.subjects ?? []).map((s) => ({ value: s.slug, label: s.name }))]}
              />
              <SelectField
                label="Level" value={form.difficulty} onChange={(v) => set("difficulty", v as typeof form.difficulty)}
                options={[{ value: "EASY", label: "Beginner" }, { value: "MEDIUM", label: "Intermediate" }, { value: "HARD", label: "Advanced" }]}
              />
              <SelectField
                label="Grade" value={form.gradeId} onChange={(v) => set("gradeId", v)}
                options={[{ value: "", label: "Any grade" }, ...(filters.data?.grades ?? []).map((g) => ({ value: g.id, label: g.name }))]}
              />
              <TextField label="Age range" value={form.ageBand} onChange={(v) => set("ageBand", v)} placeholder="9-12" />
              <SelectField
                label="Language" value={form.language} onChange={(v) => set("language", v)}
                options={[
                  { value: "", label: "Not set" },
                  ...["English", "Amharic", "Swahili", "French"].map((l) => ({ value: l, label: l })),
                ]}
              />
              <Field label="Estimated duration" hint="Leave blank to add up the item times instead.">
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} step={0.5}
                    className="input w-24"
                    value={hours}
                    aria-label="Estimated duration in hours"
                    onChange={(e) => set("estimatedMinutes", e.target.value ? Math.round(Number(e.target.value) * 60) : undefined)}
                  />
                  <span className="text-sm text-muted">hours</span>
                </div>
              </Field>
            </div>
          </CardBody>
        </Card>

        <OutcomesCard courseId={course.id} />
      </div>

      <div className="min-w-0 space-y-4">
        <Card>
          <CardHeader title="Course images" />
          <CardBody className="space-y-4">
            <FileUpload
              label="Thumbnail" slot="image" value={form.thumbnailUrl || null}
              onUploaded={(f) => set("thumbnailUrl", f.url)}
              onClear={() => set("thumbnailUrl", "")}
              hint="Shown on the course card while students browse."
            />
            {form.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.thumbnailUrl} alt="" className="aspect-[16/9] w-full rounded-xl border border-slate-200 object-cover" />
            )}
            <FileUpload
              label="Banner" slot="image" value={form.bannerUrl || null}
              onUploaded={(f) => set("bannerUrl", f.url)}
              onClear={() => set("bannerUrl", "")}
              hint="The wide image at the top of the course page."
            />
          </CardBody>
        </Card>

        <InstructorsCard courseId={course.id} author={course.teacher} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------- learning outcomes */

function OutcomesCard({ courseId }: { courseId: string }) {
  const q = useOutcomes(courseId);
  const add = useAddOutcome(courseId);
  const update = useUpdateOutcome(courseId);
  const remove = useDeleteOutcome(courseId);
  const reorder = useReorderOutcomes(courseId);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const rows = q.data ?? [];
  const submit = () => {
    const text = draft.trim();
    if (text.length < 2) return;
    add.mutate({ text }, { onSuccess: () => setDraft("") });
  };

  return (
    <Card>
      <CardHeader title="Learning objectives" sub="What a student will be able to do by the end" />
      <CardBody className="space-y-3">
        {rows.length === 0 && !q.isPending && (
          <p className="rounded-2xl bg-slate-50 p-3 text-sm text-muted">
            None yet. A course cannot be published without at least one.
          </p>
        )}

        <ul className="space-y-1.5">
          {rows.map((o, i) => (
            <li key={o.id} className="flex items-start gap-2 rounded-xl border border-slate-100 p-2">
              <GripVertical size={14} className="mt-1 shrink-0 text-slate-300" aria-hidden />
              <Check size={15} className="mt-0.5 shrink-0 text-success-600" aria-hidden />
              {editing === o.id ? (
                <input
                  className="input min-w-0 flex-1 text-sm" value={editText} autoFocus
                  aria-label={`Edit objective ${i + 1}`}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={() => { update.mutate({ id: o.id, text: editText.trim() }); setEditing(null); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { update.mutate({ id: o.id, text: editText.trim() }); setEditing(null); }
                    if (e.key === "Escape") setEditing(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="focus-ring min-w-0 flex-1 rounded text-left text-sm hover:underline"
                  onClick={() => { setEditing(o.id); setEditText(o.text); }}
                >
                  {o.text}
                </button>
              )}
              <ReorderButtons
                index={i} total={rows.length} label={`objective ${i + 1}`}
                onMove={(from, to) => reorder.mutate({ ids: moved(rows, from, to).map((x) => x.id) })}
              />
              <button
                type="button" className="focus-ring rounded p-1 text-slate-400 hover:text-danger-600"
                onClick={() => remove.mutate(o.id)} aria-label={`Remove objective ${i + 1}`}
              >
                <X size={13} aria-hidden />
              </button>
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <input
            className="input min-w-0 flex-1" value={draft}
            placeholder="Write basic Python programs"
            aria-label="New learning objective"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
          />
          <button type="button" className="btn-ghost shrink-0" onClick={submit} disabled={draft.trim().length < 2 || add.isPending}>
            <Plus size={15} aria-hidden /> Add
          </button>
        </div>
        {add.isError && <p className="text-sm text-danger-600" role="alert">{(add.error as Error).message}</p>}
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------- instructors */

function InstructorsCard({ courseId, author }: { courseId: string; author: CourseTree["teacher"] }) {
  const q = useInstructors(courseId);
  const add = useAddInstructor(courseId);
  const remove = useRemoveInstructor(courseId);
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader title="Instructors" sub="Who is credited on this course" />
      <CardBody className="space-y-3">
        {author && (
          <div className="flex items-center gap-2">
            <Avatar name={author.name} src={author.avatarUrl} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{author.name}</p>
              <p className="text-xs text-muted">Author</p>
            </div>
            <Pill tone="info">Owner</Pill>
          </div>
        )}

        {(q.data ?? []).map((i) => (
          <div key={i.id} className="flex items-center gap-2">
            <Avatar name={i.user.name} src={i.user.avatarUrl} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{i.user.name}</p>
              <p className="truncate text-xs text-muted">{i.role.replace(/_/g, " ").toLowerCase()}</p>
            </div>
            <button
              type="button" className="focus-ring rounded p-1 text-slate-400 hover:text-danger-600"
              onClick={() => remove.mutate(i.id)} aria-label={`Remove ${i.user.name}`}
            >
              <Trash2 size={13} aria-hidden />
            </button>
          </div>
        ))}

        {open ? (
          <div className="space-y-2 rounded-2xl bg-slate-50 p-3">
            <TextField
              label="Teacher's Kidora email" value={email} onChange={setEmail}
              placeholder="colleague@school.et"
            />
            {add.isError && <p className="text-sm text-danger-600" role="alert">{(add.error as Error).message}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => { setOpen(false); setEmail(""); }}>Cancel</button>
              <button
                type="button" className="btn-primary"
                disabled={!email.includes("@") || add.isPending}
                onClick={() => add.mutate({ email: email.trim() }, { onSuccess: () => { setEmail(""); setOpen(false); } })}
              >
                {add.isPending ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn-ghost w-full" onClick={() => setOpen(true)}>
            <UserPlus size={15} aria-hidden /> Add an instructor
          </button>
        )}
      </CardBody>
    </Card>
  );
}
