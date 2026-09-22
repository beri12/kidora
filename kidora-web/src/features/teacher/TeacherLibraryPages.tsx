"use client";
import { useState } from "react";
import Link from "next/link";
import { BookOpen, FileCheck2, FolderOpen, ListChecks, Paperclip, Plus, Trash2, Upload } from "lucide-react";
import { TeacherShell } from "./TeacherShell";
import { useQueryClient } from "@tanstack/react-query";
import {
  useTeacherLessons, useTeacherQuizzes, useTeacherExams, useTeacherResources,
  useTeacherCourses, useTeacherClasses, useDeleteResource,
} from "@/lib/hooks/queries";
import { FileUpload } from "@/features/course-builder/FileUpload";
import {
  TopHeader, Card, CardBody, CardHeader, Pill, ProgressBar, EmptyState, ErrorState, Skeleton,
  SearchBar, Select, cn,
} from "@/components/dashboard";
import { fmtDate, timeAgo } from "@/lib/format";

/** Shared list frame: loading, error and empty are handled once, not per page. */
function ListPage<T>({
  title, sub, filters, q, empty, children, actions,
}: {
  title: string;
  sub?: string;
  filters?: React.ReactNode;
  q: { isPending: boolean; isError: boolean; error: unknown; data?: { items: T[]; total: number; page: number; pageSize: number }; refetch: () => unknown };
  empty: React.ReactNode;
  children: (items: T[]) => React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <TeacherShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title={title} sub={sub} right={actions} />}>
      {filters && <div className="mb-4 flex flex-wrap items-end gap-3">{filters}</div>}
      {q.isPending ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : q.isError ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : q.data && q.data.items.length ? (
        <>
          {children(q.data.items)}
          <p className="mt-4 text-xs text-muted">
            Showing {q.data.items.length} of {q.data.total}
          </p>
        </>
      ) : (
        empty
      )}
    </TeacherShell>
  );
}

function useCourseFilter() {
  const courses = useTeacherCourses();
  const [courseId, setCourseId] = useState("");
  const node = (
    <Select
      label="Course"
      value={courseId}
      onChange={setCourseId}
      options={[{ value: "", label: "All courses" }, ...(courses.data ?? []).map((c) => ({ value: c.id, label: c.title }))]}
    />
  );
  return { courseId, node };
}

/* ---------------------------------------------------------------- Lessons */

export function TeacherLessonsPage() {
  const { courseId, node: courseFilter } = useCourseFilter();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const q = useTeacherLessons({ courseId: courseId || undefined, status: status || undefined, search: search || undefined, pageSize: 50 });

  return (
    <ListPage
      title="Lessons"
      sub="Every lesson across the courses you teach"
      q={q}
      filters={
        <>
          <SearchBar value={search} onChange={setSearch} placeholder="Search lessons" />
          {courseFilter}
          <Select
            label="Status"
            value={status}
            onChange={setStatus}
            options={[{ value: "", label: "All" }, { value: "PUBLISHED", label: "Published" }, { value: "DRAFT", label: "Draft" }]}
          />
        </>
      }
      empty={
        <EmptyState
          icon={<BookOpen size={22} />}
          title="No lessons yet"
          body="Lessons live inside a course. Create a course, add a module, then add your first lesson."
          action={{ label: "Create a course", href: "/teacher/courses/new" }}
        />
      }
    >
      {(items) => (
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-100">
              {items.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/teacher/courses/${l.course.id}/build`} className="focus-ring rounded font-medium hover:underline">
                      {l.title}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {l.course.title}
                      {l.section ? ` · ${l.section.title}` : ""} · {l.estimatedMin} min
                    </p>
                  </div>
                  {!l.hasContent && <Pill tone="warning">No content</Pill>}
                  <Pill tone={l.status === "PUBLISHED" ? "success" : "neutral"}>{l.status === "PUBLISHED" ? "Published" : "Draft"}</Pill>
                  <span className="hidden w-28 text-right text-xs text-muted sm:block">
                    {l.completedBy} completed
                  </span>
                  <span className="hidden w-24 text-right text-xs text-muted md:block">{timeAgo(l.updatedAt)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </ListPage>
  );
}

/* ---------------------------------------------------------------- Quizzes */

export function TeacherQuizzesPage() {
  const { courseId, node: courseFilter } = useCourseFilter();
  const [search, setSearch] = useState("");
  const q = useTeacherQuizzes({ courseId: courseId || undefined, search: search || undefined, pageSize: 50 });

  return (
    <ListPage
      title="Quizzes"
      sub="Question sets, attempts and how your classes scored"
      q={q}
      filters={<><SearchBar value={search} onChange={setSearch} placeholder="Search quizzes" />{courseFilter}</>}
      empty={
        <EmptyState
          icon={<ListChecks size={22} />}
          title="No quizzes yet"
          body="Add a quiz to a lesson while you are building a course, and its results will show up here."
        />
      }
    >
      {(items) => (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((z) => (
            <Card key={z.id} as="article" className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{z.title}</p>
                  <p className="truncate text-xs text-muted">
                    {z.course?.title ?? "—"}
                    {z.lesson ? ` · ${z.lesson.title}` : ""}
                  </p>
                </div>
                <Pill tone={z.published ? "success" : "neutral"}>{z.published ? "Live" : "Draft"}</Pill>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-slate-50 py-2">
                  <dt className="text-muted">Questions</dt>
                  <dd className="text-base font-bold">{z.questionCount}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 py-2">
                  <dt className="text-muted">Attempts</dt>
                  <dd className="text-base font-bold">{z.attemptCount}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 py-2">
                  <dt className="text-muted">Average</dt>
                  <dd className="text-base font-bold">{z.averagePercent != null ? `${z.averagePercent}%` : "—"}</dd>
                </div>
              </dl>
              {z.passRate != null && (
                <div className="mt-3">
                  <p className="mb-1 text-[11px] text-muted">Pass rate {z.passRate}% (pass mark {z.passingScore}%)</p>
                  <ProgressBar value={z.passRate} size="sm" />
                </div>
              )}
              {z.questionCount === 0 && <p className="mt-3 text-xs text-warning-700">This quiz has no questions yet.</p>}
            </Card>
          ))}
        </div>
      )}
    </ListPage>
  );
}

/* ------------------------------------------------------------------ Exams */

export function TeacherExamsPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const q = useTeacherExams({ status: status || undefined, search: search || undefined, pageSize: 50 });

  return (
    <ListPage
      title="Exams"
      sub="Final exams, schedules and results"
      q={q}
      filters={
        <>
          <SearchBar value={search} onChange={setSearch} placeholder="Search exams" />
          <Select
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "", label: "All" }, { value: "DRAFT", label: "Draft" },
              { value: "SCHEDULED", label: "Scheduled" }, { value: "OPEN", label: "Open" }, { value: "CLOSED", label: "Closed" },
            ]}
          />
        </>
      }
      empty={
        <EmptyState
          icon={<FileCheck2 size={22} />}
          title="No exams yet"
          body="A course can have one final exam. Add it in the course builder's Final Exam step."
        />
      }
    >
      {(items) => (
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-100">
              {items.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{x.title}</p>
                    <p className="truncate text-xs text-muted">
                      {x.course.title}
                      {x.class ? ` · ${x.class.name}` : ""} · {x.questionCount} questions
                      {x.durationMin ? ` · ${x.durationMin} min` : ""}
                    </p>
                  </div>
                  {x.scheduledAt && <span className="hidden text-xs text-muted sm:block">{fmtDate(x.scheduledAt)}</span>}
                  <span className="text-xs text-muted">{x.sat} sat</span>
                  {x.passRate != null && (
                    <span className={cn("text-xs font-semibold", x.passRate >= 70 ? "text-success-700" : "text-danger-600")}>
                      {x.passRate}% passed
                    </span>
                  )}
                  <Pill tone={x.status === "OPEN" ? "success" : x.status === "SCHEDULED" ? "info" : "neutral"}>{x.status}</Pill>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </ListPage>
  );
}

/* -------------------------------------------------------------- Resources */

export function TeacherResourcesPage() {
  const { courseId, node: courseFilter } = useCourseFilter();
  const [kind, setKind] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const q = useTeacherResources({ courseId: courseId || undefined, kind: kind || undefined, search: search || undefined, pageSize: 50 });
  const remove = useDeleteResource();

  return (
    <ListPage
      title="Resources"
      sub="Files you can attach to any lesson"
      q={q}
      actions={
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} aria-hidden /> Add resource
        </button>
      }
      filters={
        <>
          <SearchBar value={search} onChange={setSearch} placeholder="Search resources" />
          {courseFilter}
          <Select
            label="Type"
            value={kind}
            onChange={setKind}
            options={[
              { value: "", label: "All types" }, { value: "document", label: "Documents" },
              { value: "video", label: "Video" }, { value: "image", label: "Images" }, { value: "other", label: "Other" },
            ]}
          />
        </>
      }
      empty={
        <>
          <EmptyState
            icon={<FolderOpen size={22} />}
            title="No resources yet"
            body="Upload a worksheet, slide deck or video once, then attach it to as many lessons as you like."
            action={{ label: "Add your first resource", onClick: () => setOpen(true) }}
          />
          {open && <AddResourceDialog onClose={() => setOpen(false)} />}
        </>
      }
    >
      {(items) => (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((r) => (
              <Card key={r.id} as="article" className="flex flex-col p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600" aria-hidden>
                    <Paperclip size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <a href={r.url} target="_blank" rel="noreferrer" className="focus-ring block truncate rounded font-medium hover:underline">
                      {r.name}
                    </a>
                    <p className="text-xs text-muted">
                      {r.kind}
                      {r.sizeBytes ? ` · ${Math.max(1, Math.round(r.sizeBytes / 1024))} KB` : ""}
                    </p>
                  </div>
                </div>
                {r.description && <p className="mt-2 line-clamp-2 text-xs text-muted">{r.description}</p>}
                <p className="mt-3 text-xs text-muted">
                  {r.lesson ? `Attached to ${r.lesson.title}` : "Not attached to a lesson"}
                </p>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    className="btn-ghost text-danger-600"
                    onClick={() => { if (confirm(`Delete "${r.name}"? This cannot be undone.`)) remove.mutate(r.id); }}
                    disabled={remove.isPending}
                  >
                    <Trash2 size={14} aria-hidden /> Delete
                  </button>
                </div>
              </Card>
            ))}
          </div>
          {open && <AddResourceDialog onClose={() => setOpen(false)} />}
        </>
      )}
    </ListPage>
  );
}

function AddResourceDialog({ onClose }: { onClose: () => void }) {
  const [uploaded, setUploaded] = useState<{ url: string; name: string } | null>(null);
  const [description, setDescription] = useState("");
  const qc = useQueryClient();

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="add-resource-title">
      <Card className="w-full max-w-md">
        <CardHeader title="Add a resource" />
        <CardBody className="space-y-3">
          <h2 id="add-resource-title" className="sr-only">Add a resource</h2>

          {/* Uploading creates the library row, so there is nothing to save
              afterwards — the dialog just confirms and closes. */}
          <FileUpload
            label="File"
            slot="any"
            value={uploaded?.url ?? null}
            onUploaded={(f) => {
              setUploaded({ url: f.url, name: f.name });
              qc.invalidateQueries({ queryKey: ["teacher", "resources"] });
            }}
            onClear={() => setUploaded(null)}
            hint="Videos, images, audio, PDFs and Office documents."
          />

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Description <span className="font-normal text-muted">(optional)</span></span>
            <textarea className="input w-full" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={onClose}>{uploaded ? "Done" : "Cancel"}</button>
          </div>
          {uploaded && (
            <p className="text-xs text-success-700">
              Uploaded. It is in your library and can be attached to any lesson.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------- Attendance */

export function TeacherAttendancePage() {
  const classes = useTeacherClasses();
  const [classId, setClassId] = useState("");
  const selected = (classes.data ?? []).find((c) => c.id === classId);

  return (
    <TeacherShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title="Attendance" sub="Daily register by class" />}>
      {classes.isPending ? (
        <Skeleton className="h-64" />
      ) : classes.isError ? (
        <ErrorState error={classes.error} retry={() => classes.refetch()} />
      ) : (classes.data ?? []).length === 0 ? (
        <EmptyState title="No classes assigned" body="Attendance is taken per class. Your school admin assigns classes to teachers." />
      ) : (
        <div className="space-y-4">
          <Select
            label="Class"
            value={classId}
            onChange={setClassId}
            options={[{ value: "", label: "Choose a class" }, ...(classes.data ?? []).map((c) => ({ value: c.id, label: `${c.name} · ${c.grade}` }))]}
          />
          {selected ? (
            <AttendanceRegister classId={selected.id} className={selected.name} studentCount={selected.studentCount} />
          ) : (
            <EmptyState title="Choose a class" body="Pick a class above to take or review its register." />
          )}
        </div>
      )}
    </TeacherShell>
  );
}

function AttendanceRegister({ classId, className, studentCount }: { classId: string; className: string; studentCount: number }) {
  return (
    <Card>
      <CardHeader title={className} sub={`${studentCount} students`} />
      <CardBody>
        <p className="text-sm text-muted">
          Open the class to take today&rsquo;s register and see the attendance history.
        </p>
        <Link href={`/teacher/classes/${classId}`} className="btn-primary mt-3 inline-flex">Open {className}</Link>
      </CardBody>
    </Card>
  );
}
