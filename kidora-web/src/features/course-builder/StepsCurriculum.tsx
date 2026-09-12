"use client";
import { useMemo, useState } from "react";
import {
  Copy, FileText, GripVertical, Image as ImageIcon, Layers, Lightbulb, Plus, Quote,
  Trash2, Type, Video, X,
} from "lucide-react";
import { Card, CardBody, CardHeader, EmptyState, Pill, Skeleton, cn } from "@/components/dashboard";
import {
  useAuthoredLesson, useCreateLesson, useCreateSection, useDeleteLesson, useDeleteSection,
  useDuplicateLesson, useDuplicateSection, useReorderLessons, useReorderSections,
  useSaveLessonContent, useUpdateLesson, useUpdateSection,
} from "@/lib/hooks/queries";
import type { AuthoredSection, ContentBlock, ContentType, CourseTree } from "@/lib/api/authoring";
import { ReorderButtons, SaveIndicator, StringList, TextArea, TextField, Toggle, moved, useAutosave } from "./parts";

/* ------------------------------------------------------- 3. Curriculum */

export function CurriculumStep({ course, onEditLesson }: { course: CourseTree; onEditLesson: (id: string) => void }) {
  const createSection = useCreateSection(course.id);
  const reorderSections = useReorderSections(course.id);
  const [newTitle, setNewTitle] = useState("");

  const move = (from: number, to: number) => {
    const ids = moved(course.sections, from, to).map((s) => s.id);
    reorderSections.mutate(ids);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Curriculum" sub="Modules hold lessons. Drag order is saved to the database." />
        <CardBody>
          <div className="flex flex-wrap gap-2">
            <input
              className="input min-w-0 flex-1"
              value={newTitle}
              placeholder="Module 1: What is a fraction?"
              aria-label="New module title"
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTitle.trim().length >= 2) {
                  createSection.mutate({ title: newTitle.trim() }, { onSuccess: () => setNewTitle("") });
                }
              }}
            />
            <button
              type="button"
              className="btn-primary shrink-0"
              disabled={newTitle.trim().length < 2 || createSection.isPending}
              onClick={() => createSection.mutate({ title: newTitle.trim() }, { onSuccess: () => setNewTitle("") })}
            >
              <Plus size={16} aria-hidden /> Add module
            </button>
          </div>
          {createSection.isError && (
            <p className="mt-2 text-sm text-danger-600" role="alert">{(createSection.error as Error).message}</p>
          )}
        </CardBody>
      </Card>

      {course.sections.length === 0 ? (
        <EmptyState
          icon={<Layers size={22} />}
          title="No modules yet"
          body="A course is built from modules, and each module holds lessons. Add your first module above."
        />
      ) : (
        <ol className="space-y-3">
          {course.sections.map((section, i) => (
            <SectionCard
              key={section.id}
              course={course}
              section={section}
              index={i}
              total={course.sections.length}
              onMove={move}
              onEditLesson={onEditLesson}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function SectionCard({
  course, section, index, total, onMove, onEditLesson,
}: {
  course: CourseTree; section: AuthoredSection; index: number; total: number;
  onMove: (from: number, to: number) => void; onEditLesson: (id: string) => void;
}) {
  const updateSection = useUpdateSection(course.id);
  const deleteSection = useDeleteSection(course.id);
  const duplicateSection = useDuplicateSection(course.id);
  const createLesson = useCreateLesson(course.id);
  const reorderLessons = useReorderLessons(course.id);
  const deleteLesson = useDeleteLesson(course.id);
  const duplicateLesson = useDuplicateLesson(course.id);

  const [title, setTitle] = useState(section.title);
  const [editing, setEditing] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");

  const moveLesson = (from: number, to: number) => {
    const ids = moved(section.lessons, from, to).map((l) => l.id);
    reorderLessons.mutate({ sectionId: section.id, ids });
  };

  return (
    <li>
      <Card as="div">
        <CardBody className="space-y-3">
          <div className="flex items-start gap-2">
            <span className="mt-1 text-slate-300" aria-hidden><GripVertical size={16} /></span>
            <div className="min-w-0 flex-1">
              {editing ? (
                <div className="flex gap-2">
                  <input
                    className="input flex-1" value={title} autoFocus
                    aria-label="Module title"
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { updateSection.mutate({ id: section.id, title: title.trim() }); setEditing(false); }
                      if (e.key === "Escape") { setTitle(section.title); setEditing(false); }
                    }}
                  />
                  <button
                    type="button" className="btn-ghost"
                    onClick={() => { updateSection.mutate({ id: section.id, title: title.trim() }); setEditing(false); }}
                  >Save</button>
                </div>
              ) : (
                <button
                  type="button"
                  className="focus-ring rounded text-left font-semibold hover:underline"
                  onClick={() => setEditing(true)}
                >
                  {section.title}
                </button>
              )}
              <p className="text-xs text-muted">
                {section.lessons.length} lesson{section.lessons.length === 1 ? "" : "s"}
              </p>
            </div>
            <ReorderButtons index={index} total={total} onMove={onMove} label={section.title} />
            <button
              type="button" className="btn-ghost" title="Duplicate module"
              onClick={() => duplicateSection.mutate(section.id)} disabled={duplicateSection.isPending}
            >
              <Copy size={14} aria-hidden /><span className="sr-only">Duplicate {section.title}</span>
            </button>
            <button
              type="button" className="btn-ghost text-danger-600" title="Delete module"
              onClick={() => {
                if (confirm(`Delete "${section.title}" and its ${section.lessons.length} lesson(s)? This cannot be undone.`)) {
                  deleteSection.mutate(section.id);
                }
              }}
            >
              <Trash2 size={14} aria-hidden /><span className="sr-only">Delete {section.title}</span>
            </button>
          </div>

          {section.lessons.length > 0 && (
            <ol className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
              {section.lessons.map((lesson, j) => (
                <li key={lesson.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="w-6 text-xs text-muted">{j + 1}.</span>
                  <button
                    type="button"
                    className="focus-ring min-w-0 flex-1 truncate rounded text-left text-sm font-medium hover:underline"
                    onClick={() => onEditLesson(lesson.id)}
                  >
                    {lesson.title}
                  </button>
                  <span className="hidden text-xs text-muted sm:block">{lesson.estimatedMin} min</span>
                  {!lesson.isRequired && <Pill tone="neutral">Optional</Pill>}
                  <Pill tone={lesson.status === "PUBLISHED" ? "success" : "neutral"}>
                    {lesson.status === "PUBLISHED" ? "Published" : "Draft"}
                  </Pill>
                  <ReorderButtons index={j} total={section.lessons.length} onMove={moveLesson} label={lesson.title} />
                  <button
                    type="button" className="btn-ghost" title="Duplicate lesson"
                    onClick={() => duplicateLesson.mutate(lesson.id)}
                  >
                    <Copy size={13} aria-hidden /><span className="sr-only">Duplicate {lesson.title}</span>
                  </button>
                  <button
                    type="button" className="btn-ghost text-danger-600" title="Delete lesson"
                    onClick={() => { if (confirm(`Delete "${lesson.title}"?`)) deleteLesson.mutate(lesson.id); }}
                  >
                    <Trash2 size={13} aria-hidden /><span className="sr-only">Delete {lesson.title}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}

          <div className="flex gap-2">
            <input
              className="input min-w-0 flex-1 text-sm"
              value={lessonTitle}
              placeholder="Lesson title"
              aria-label={`New lesson in ${section.title}`}
              onChange={(e) => setLessonTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && lessonTitle.trim().length >= 2) {
                  createLesson.mutate({ sectionId: section.id, title: lessonTitle.trim() }, { onSuccess: () => setLessonTitle("") });
                }
              }}
            />
            <button
              type="button" className="btn-ghost shrink-0"
              disabled={lessonTitle.trim().length < 2 || createLesson.isPending}
              onClick={() => createLesson.mutate({ sectionId: section.id, title: lessonTitle.trim() }, { onSuccess: () => setLessonTitle("") })}
            >
              <Plus size={15} aria-hidden /> Add lesson
            </button>
          </div>
        </CardBody>
      </Card>
    </li>
  );
}

/* ---------------------------------------------------- 4. Lesson builder */

const BLOCK_KINDS: { type: ContentType; label: string; icon: typeof Type; hasBody: boolean; hasUrl: boolean }[] = [
  { type: "HEADING", label: "Heading", icon: Type, hasBody: false, hasUrl: false },
  { type: "PARAGRAPH", label: "Paragraph", icon: FileText, hasBody: true, hasUrl: false },
  { type: "IMAGE", label: "Image", icon: ImageIcon, hasBody: false, hasUrl: true },
  { type: "VIDEO", label: "Video", icon: Video, hasBody: false, hasUrl: true },
  { type: "AUDIO", label: "Audio", icon: Video, hasBody: false, hasUrl: true },
  { type: "DOCUMENT", label: "Document", icon: FileText, hasBody: false, hasUrl: true },
  { type: "CALLOUT", label: "Callout", icon: Lightbulb, hasBody: true, hasUrl: false },
  { type: "EXAMPLE", label: "Example", icon: Quote, hasBody: true, hasUrl: false },
  { type: "CODE", label: "Code", icon: FileText, hasBody: true, hasUrl: false },
  { type: "QUESTION", label: "Question", icon: Lightbulb, hasBody: true, hasUrl: false },
];

export function LessonBuilder({ course, lessonId, onClose }: { course: CourseTree; lessonId: string; onClose: () => void }) {
  const q = useAuthoredLesson(lessonId);
  if (q.isPending) return <Skeleton className="h-96" />;
  if (q.isError || !q.data) {
    return (
      <Card><CardBody>
        <p className="text-sm text-danger-600">That lesson could not be loaded.</p>
        <button type="button" className="btn-ghost mt-2" onClick={onClose}>Back to curriculum</button>
      </CardBody></Card>
    );
  }
  return <LessonEditor key={lessonId} course={course} lesson={q.data} onClose={onClose} />;
}

function LessonEditor({
  course, lesson, onClose,
}: { course: CourseTree; lesson: NonNullable<ReturnType<typeof useAuthoredLesson>["data"]>; onClose: () => void }) {
  const updateLesson = useUpdateLesson(course.id);
  const saveContent = useSaveLessonContent(course.id);

  const [meta, setMeta] = useState({
    title: lesson.title,
    description: lesson.description ?? "",
    estimatedMin: lesson.estimatedMin,
    isRequired: lesson.isRequired,
    objectives: lesson.objectives ?? [],
    status: lesson.status,
  });
  const [blocks, setBlocks] = useState<ContentBlock[]>(
    (lesson.contents ?? []).map((c) => ({ type: c.type, title: c.title ?? "", body: c.body ?? "", url: c.url ?? "" })),
  );
  const [preview, setPreview] = useState(false);

  const metaSave = useAutosave(meta, (v) => updateLesson.mutateAsync({ id: lesson.id, ...v }));
  const blocksSave = useAutosave(blocks, (v) => saveContent.mutateAsync({ lessonId: lesson.id, blocks: v }));

  const state = blocksSave.state === "idle" ? metaSave.state : blocksSave.state;
  const savedAt = Math.max(metaSave.savedAt ?? 0, blocksSave.savedAt ?? 0) || null;

  const addBlock = (type: ContentType) => setBlocks((b) => [...b, { type, title: "", body: "", url: "" }]);
  const setBlock = (i: number, patch: Partial<ContentBlock>) =>
    setBlocks((b) => b.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={<span className="flex items-center gap-2">Lesson <span className="text-muted">·</span> {meta.title}</span>}
          sub="Autosaved as you type"
        />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" className="btn-ghost" onClick={onClose}>← Back to curriculum</button>
            <div className="flex items-center gap-2">
              <SaveIndicator state={state} savedAt={savedAt} />
              <button type="button" className="btn-ghost" onClick={() => setPreview((p) => !p)}>
                {preview ? "Edit" : "Preview"}
              </button>
            </div>
          </div>

          {!preview && (
            <>
              <TextField label="Lesson title" required value={meta.title} onChange={(v) => setMeta((m) => ({ ...m, title: v }))} />
              <TextArea
                label="Description" value={meta.description} rows={2}
                onChange={(v) => setMeta((m) => ({ ...m, description: v }))}
                hint="A sentence shown under the title in the curriculum."
              />
              <StringList
                label="Learning objectives" values={meta.objectives}
                onChange={(v) => setMeta((m) => ({ ...m, objectives: v }))}
                placeholder="Name a half"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Estimated minutes" type="number" value={String(meta.estimatedMin)}
                  onChange={(v) => setMeta((m) => ({ ...m, estimatedMin: Math.max(1, Number(v) || 1) }))}
                />
                <div className="flex flex-col justify-end gap-1 pb-1">
                  <Toggle
                    label="Required for completion" checked={meta.isRequired}
                    onChange={(v) => setMeta((m) => ({ ...m, isRequired: v }))}
                  />
                  <Toggle
                    label="Published" checked={meta.status === "PUBLISHED"}
                    onChange={(v) => setMeta((m) => ({ ...m, status: v ? "PUBLISHED" : "DRAFT" }))}
                    hint="Draft lessons are published automatically when the course is."
                  />
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={preview ? "Preview" : "Content"} sub={preview ? "How the student will see it" : `${blocks.length} block${blocks.length === 1 ? "" : "s"}`} />
        <CardBody className="space-y-3">
          {preview ? (
            <LessonPreview blocks={blocks} title={meta.title} objectives={meta.objectives} />
          ) : (
            <>
              {blocks.length === 0 && (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">
                  This lesson has no content yet. A required lesson with no content blocks the course from publishing.
                </p>
              )}
              <ol className="space-y-3">
                {blocks.map((b, i) => {
                  const kind = BLOCK_KINDS.find((k) => k.type === b.type) ?? BLOCK_KINDS[1];
                  return (
                    <li key={i} className="rounded-2xl border border-slate-200 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <kind.icon size={15} className="text-brand-600" aria-hidden />
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{kind.label}</span>
                        <span className="flex-1" />
                        <ReorderButtons
                          index={i} total={blocks.length} label={`${kind.label} block`}
                          onMove={(from, to) => setBlocks((bs) => moved(bs, from, to))}
                        />
                        <button
                          type="button" className="focus-ring rounded p-1 text-danger-600"
                          onClick={() => setBlocks((bs) => bs.filter((_, j) => j !== i))}
                          aria-label={`Remove ${kind.label} block`}
                        >
                          <X size={14} aria-hidden />
                        </button>
                      </div>
                      {(b.type === "HEADING" || kind.hasUrl) && (
                        <input
                          className="input mb-2 w-full"
                          value={b.title ?? ""}
                          placeholder={b.type === "HEADING" ? "Heading text" : "Caption"}
                          aria-label={`${kind.label} title`}
                          onChange={(e) => setBlock(i, { title: e.target.value })}
                        />
                      )}
                      {kind.hasUrl && (
                        <input
                          className="input w-full"
                          value={b.url ?? ""}
                          placeholder="https://…"
                          aria-label={`${kind.label} URL`}
                          onChange={(e) => setBlock(i, { url: e.target.value })}
                        />
                      )}
                      {kind.hasBody && (
                        <textarea
                          className={cn("input w-full", b.type === "CODE" && "font-mono text-xs")}
                          rows={b.type === "PARAGRAPH" ? 4 : 3}
                          value={b.body ?? ""}
                          placeholder={b.type === "CODE" ? "print('hello')" : "Write here…"}
                          aria-label={`${kind.label} text`}
                          onChange={(e) => setBlock(i, { body: e.target.value })}
                        />
                      )}
                    </li>
                  );
                })}
              </ol>

              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                {BLOCK_KINDS.map((k) => (
                  <button key={k.type} type="button" className="btn-ghost text-xs" onClick={() => addBlock(k.type)}>
                    <k.icon size={13} aria-hidden /> {k.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function LessonPreview({ blocks, title, objectives }: { blocks: ContentBlock[]; title: string; objectives: string[] }) {
  return (
    <article className="prose-kidora max-w-none space-y-4">
      <h2 className="text-xl font-bold">{title}</h2>
      {objectives.length > 0 && (
        <div className="rounded-2xl bg-brand-50/60 p-4">
          <p className="text-sm font-semibold">By the end of this lesson you will be able to:</p>
          <ul className="mt-1 list-disc pl-5 text-sm">{objectives.map((o, i) => <li key={i}>{o}</li>)}</ul>
        </div>
      )}
      {blocks.map((b, i) => <ContentBlockView key={i} block={b} />)}
    </article>
  );
}

/** One rendered content block. Shared with the student player. */
export function ContentBlockView({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "HEADING":
      return <h3 className="text-lg font-bold">{block.title}</h3>;
    case "PARAGRAPH":
    case "TEXT":
      return <p className="whitespace-pre-wrap text-sm leading-relaxed">{block.body}</p>;
    case "IMAGE":
      return block.url ? (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.url} alt={block.title || ""} className="w-full rounded-2xl" />
          {block.title && <figcaption className="mt-1 text-xs text-muted">{block.title}</figcaption>}
        </figure>
      ) : null;
    case "VIDEO":
      return block.url ? (
        <figure>
          <video src={block.url} controls className="w-full rounded-2xl" aria-label={block.title || "Lesson video"} />
          {block.title && <figcaption className="mt-1 text-xs text-muted">{block.title}</figcaption>}
        </figure>
      ) : null;
    case "AUDIO":
      return block.url ? <audio src={block.url} controls className="w-full" aria-label={block.title || "Lesson audio"} /> : null;
    case "DOCUMENT":
    case "RESOURCE":
      return block.url ? (
        <a href={block.url} target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium hover:bg-slate-100">
          <FileText size={15} aria-hidden /> {block.title || "Download"}
        </a>
      ) : null;
    case "CALLOUT":
      return (
        <aside className="rounded-2xl border-l-4 border-brand-400 bg-brand-50/60 p-3 text-sm">
          {block.title && <p className="font-semibold">{block.title}</p>}
          <p className="whitespace-pre-wrap">{block.body}</p>
        </aside>
      );
    case "EXAMPLE":
      return (
        <aside className="rounded-2xl bg-slate-50 p-3 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Example</p>
          <p className="whitespace-pre-wrap">{block.body}</p>
        </aside>
      );
    case "QUESTION":
      return (
        <aside className="rounded-2xl border border-dashed border-brand-300 p-3 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-600">Think about it</p>
          <p className="whitespace-pre-wrap">{block.body}</p>
        </aside>
      );
    case "CODE":
      return (
        <pre className="overflow-x-auto rounded-2xl bg-slate-900 p-3 text-xs text-slate-100">
          <code>{block.body}</code>
        </pre>
      );
    default:
      return block.body ? <p className="whitespace-pre-wrap text-sm">{block.body}</p> : null;
  }
}
