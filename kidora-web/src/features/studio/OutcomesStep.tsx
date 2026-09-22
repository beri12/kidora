"use client";
import { useMemo, useState } from "react";
import { Check, GraduationCap, GripVertical, Plus, Target, Trash2, UserPlus, X } from "lucide-react";
import { Card, CardBody, CardHeader, Avatar, Pill } from "@/components/dashboard";
import {
  useAddInstructor, useAddOutcome, useBrowseFilters, useDeleteOutcome, useInstructors,
  useOutcomes, useRemoveInstructor, useReorderOutcomes, useUpdateAuthoredCourse, useUpdateOutcome,
} from "@/lib/hooks/queries";
import type { CourseTree } from "@/lib/api/authoring";
import {
  ReorderButtons, SaveIndicator, StringList, TextArea, TextField, moved, useAutosave,
} from "@/features/course-builder/parts";
import { FileUpload } from "@/features/course-builder/FileUpload";
import { CourseOverviewPanel } from "./CourseOverviewPanel";
import { useRegisterFlush } from "./CourseStudio";

/**
 * Step 2 — what the course teaches.
 *
 * Objectives are rows rather than a text field because the student page lists
 * them one by one, and the publish check counts them. Prerequisites sit next
 * to them: both answer "is this course for me?", which is the question a
 * learner asks before enrolling.
 */
export function OutcomesStep({ course }: { course: CourseTree }) {
  const filters = useBrowseFilters();
  const outcomes = useOutcomes(course.id);
  const update = useUpdateAuthoredCourse(course.id);

  const [form, setForm] = useState({
    description: course.description ?? "",
    requirements: course.requirements ?? [],
    bannerUrl: course.bannerUrl ?? "",
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.description.trim().length === 0 || form.description.trim().length >= 20;

  const { state, savedAt, flush } = useAutosave(
    form,
    (v) => update.mutateAsync({ ...v, bannerUrl: v.bannerUrl || undefined }),
    { enabled: valid },
  );
  useRegisterFlush(() => flush());

  const subjectName = useMemo(
    () => filters.data?.subjects.find((s) => s.slug === course.subject?.slug)?.name ?? course.subject?.name,
    [filters.data, course.subject],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-4">
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700" aria-hidden>
                  <Target size={18} />
                </span>
                What students will learn
              </span>
            }
            sub="The objectives and the full description shown on the course page."
          />
          <CardBody className="space-y-4">
            <div className="flex justify-end"><SaveIndicator state={state} savedAt={savedAt} /></div>
            <TextArea
              label="About this course" required rows={6} value={form.description}
              onChange={(v) => set("description", v)}
              error={!valid ? "Write at least a couple of sentences — this is checked before publishing." : undefined}
              hint="The longer description a student reads before enrolling."
            />
          </CardBody>
        </Card>

        <OutcomesCard courseId={course.id} />

        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700" aria-hidden>
                  <GraduationCap size={18} />
                </span>
                Prerequisites
              </span>
            }
            sub="What a student needs before starting. Leave empty if none."
          />
          <CardBody>
            <StringList
              label="Prerequisites"
              values={form.requirements}
              onChange={(v) => set("requirements", v)}
              placeholder="Can read simple English"
              hint="Shown as “No prior experience required” when empty."
            />
          </CardBody>
        </Card>
      </div>

      <div className="min-w-0 space-y-4">
        <CourseOverviewPanel
          title={course.title}
          difficulty={course.difficulty}
          estimatedMinutes={course.estimatedMinutes ?? undefined}
          category={subjectName}
          thumbnailUrl={course.thumbnailUrl ?? undefined}
          outcomes={(outcomes.data ?? []).map((o) => o.text)}
          prerequisites={form.requirements}
        />

        <Card>
          <CardHeader title="Course banner" sub="The wide image at the top of the course page." />
          <CardBody>
            <FileUpload
              label="Banner" slot="image" value={form.bannerUrl || null}
              onUploaded={(f) => set("bannerUrl", f.url)}
              onClear={() => set("bannerUrl", "")}
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
