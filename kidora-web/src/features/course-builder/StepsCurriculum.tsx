"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Clock, Copy, Download, FileText, GripVertical, Image as ImageIcon, Layers, Lightbulb,
  Music, Plus, Quote, Subtitles, Trash2, Type, Video, X,
} from "lucide-react";
import { Card, CardBody, CardHeader, EmptyState, Pill, Skeleton, cn } from "@/components/dashboard";
import {
  useAuthoredLesson, useCreateLesson, useCreateSection, useDeleteLesson, useDeleteSection,
  useDuplicateLesson, useDuplicateSection, useReorderLessons, useReorderSections,
  useSaveLessonContent, useUpdateLesson, useUpdateSection,
} from "@/lib/hooks/queries";
import type { AuthoredSection, ContentBlock, ContentType, CourseTree } from "@/lib/api/authoring";
import { ReorderButtons, SaveIndicator, StringList, TextArea, TextField, Toggle, moved, useAutosave } from "./parts";
import { FileUpload, UploadButton } from "./FileUpload";

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
        <CardHeader title="Curriculum" sub="A module is a week of study. It holds lessons, and each lesson holds items." />
        <CardBody>
          <div className="flex flex-wrap gap-2">
            <input
              className="input min-w-0 flex-1"
              value={newTitle}
              placeholder="Week 1: What is a fraction?"
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
              <p className="flex items-center gap-2 text-xs text-muted">
                <label className="flex items-center gap-1">
                  Week
                  <input
                    type="number"
                    min={1}
                    className="w-12 rounded-lg border border-slate-200 px-1.5 py-0.5 text-right"
                    value={section.weekNumber ?? index + 1}
                    aria-label={`Week number for ${section.title}`}
                    onChange={(e) => updateSection.mutate({ id: section.id, weekNumber: Math.max(1, Number(e.target.value) || 1) })}
                  />
                </label>
                <span aria-hidden>·</span>
                {section.lessons.length} lesson{section.lessons.length === 1 ? "" : "s"}
                {section.lessons.length > 0 && (
                  <>
                    <span aria-hidden>·</span>
                    {section.lessons.reduce((a, l) => a + l.estimatedMin, 0)} min
                  </>
                )}
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

type Slot = "video" | "audio" | "image" | "document" | "captions" | "any";

/**
 * The item types a lesson is built from — Coursera's `item_type`, plus the
 * prose blocks that make up a reading.
 */
const BLOCK_KINDS: {
  type: ContentType; label: string; icon: typeof Type;
  hasBody: boolean; upload?: Slot; group: "content" | "media" | "assessment";
}[] = [
  { type: "HEADING", label: "Heading", icon: Type, hasBody: false, group: "content" },
  { type: "PARAGRAPH", label: "Paragraph", icon: FileText, hasBody: true, group: "content" },
  { type: "CALLOUT", label: "Callout", icon: Lightbulb, hasBody: true, group: "content" },
  { type: "EXAMPLE", label: "Example", icon: Quote, hasBody: true, group: "content" },
  { type: "CODE", label: "Code", icon: FileText, hasBody: true, group: "content" },
  { type: "QUESTION", label: "Think about it", icon: Lightbulb, hasBody: true, group: "content" },
  { type: "VIDEO", label: "Video", icon: Video, hasBody: false, upload: "video", group: "media" },
  { type: "AUDIO", label: "Audio", icon: Music, hasBody: false, upload: "audio", group: "media" },
  { type: "IMAGE", label: "Image", icon: ImageIcon, hasBody: false, upload: "image", group: "media" },
  { type: "DOCUMENT", label: "Reading / document", icon: FileText, hasBody: true, upload: "document", group: "media" },
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

  const addBlock = (type: ContentType) =>
    setBlocks((b) => [...b, { type, title: "", body: "", url: "", estimatedMin: 3, isRequired: true }]);
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
                {blocks.map((b, i) => (
                  <ItemEditor
                    key={i}
                    block={b}
                    index={i}
                    total={blocks.length}
                    onChange={(patch) => setBlock(i, patch)}
                    onRemove={() => setBlocks((bs) => bs.filter((_, j) => j !== i))}
                    onMove={(from, to) => setBlocks((bs) => moved(bs, from, to))}
                  />
                ))}
              </ol>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                {(["content", "media"] as const).map((group) => (
                  <div key={group} className="flex flex-wrap items-center gap-2">
                    <span className="w-14 text-[11px] uppercase tracking-wide text-muted">
                      {group === "content" ? "Text" : "Media"}
                    </span>
                    {BLOCK_KINDS.filter((k) => k.group === group).map((k) => (
                      <button key={k.type} type="button" className="btn-ghost text-xs" onClick={() => addBlock(k.type)}>
                        <k.icon size={13} aria-hidden /> {k.label}
                      </button>
                    ))}
                  </div>
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
      return block.url ? <VideoItem block={block} /> : null;
    case "AUDIO":
      return block.url ? <audio src={block.url} controls className="w-full" aria-label={block.title || "Lesson audio"} /> : null;
    case "DOCUMENT":
    case "RESOURCE":
      return <ReadingItem block={block} />;
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


/**
 * One item in a lesson.
 *
 * Media items upload a real file rather than asking a teacher to host it
 * somewhere and paste a link. A video item also carries its captions and its
 * in-video checks; a reading carries its downloadable attachments.
 */
function ItemEditor({
  block, index, total, onChange, onRemove, onMove,
}: {
  block: ContentBlock;
  index: number;
  total: number;
  onChange: (patch: Partial<ContentBlock>) => void;
  onRemove: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const kind = BLOCK_KINDS.find((k) => k.type === block.type) ?? BLOCK_KINDS[1];
  const [showExtras, setShowExtras] = useState(false);
  const checkpoints = block.checkpoints ?? [];
  const downloads = block.downloadUrls ?? [];

  return (
    <li className="rounded-2xl border border-slate-200 p-3">
      <div className="mb-2 flex items-center gap-2">
        <kind.icon size={15} className="text-brand-600" aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{kind.label}</span>
        <span className="flex-1" />
        <label className="flex items-center gap-1 text-xs text-muted">
          <Clock size={12} aria-hidden />
          <input
            type="number"
            className="w-14 rounded-lg border border-slate-200 px-1.5 py-0.5 text-right"
            value={block.estimatedMin ?? 3}
            min={0}
            aria-label={`Minutes for this ${kind.label.toLowerCase()}`}
            onChange={(e) => onChange({ estimatedMin: Math.max(0, Number(e.target.value) || 0) })}
          />
          min
        </label>
        <label className="flex items-center gap-1 text-xs text-muted">
          <input
            type="checkbox"
            className="size-3.5 rounded border-slate-300 text-brand-600 focus-ring"
            checked={block.isRequired ?? true}
            onChange={(e) => onChange({ isRequired: e.target.checked })}
          />
          Required
        </label>
        <ReorderButtons index={index} total={total} label={`${kind.label} item`} onMove={onMove} />
        <button
          type="button" className="focus-ring rounded p-1 text-danger-600"
          onClick={onRemove} aria-label={`Remove ${kind.label} item`}
        >
          <X size={14} aria-hidden />
        </button>
      </div>

      {(block.type === "HEADING" || kind.upload) && (
        <input
          className="input mb-2 w-full"
          value={block.title ?? ""}
          placeholder={block.type === "HEADING" ? "Heading text" : "Title shown above the file"}
          aria-label={`${kind.label} title`}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      )}

      {kind.upload && (
        <FileUpload
          label={`${kind.label} file`}
          slot={kind.upload}
          value={block.url || null}
          onUploaded={(f) => onChange({ url: f.url, title: block.title || f.name })}
          onClear={() => onChange({ url: "" })}
        />
      )}

      {kind.hasBody && (
        <textarea
          className={cn("input mt-2 w-full", block.type === "CODE" && "font-mono text-xs")}
          rows={block.type === "PARAGRAPH" || block.type === "DOCUMENT" ? 5 : 3}
          value={block.body ?? ""}
          placeholder={
            block.type === "CODE" ? "print('hello')"
            : block.type === "DOCUMENT" ? "Write the reading here. Markdown works."
            : "Write here…"
          }
          aria-label={`${kind.label} text`}
          onChange={(e) => onChange({ body: e.target.value })}
        />
      )}

      {/* Video and reading extras, folded away until wanted. */}
      {(block.type === "VIDEO" || block.type === "DOCUMENT") && (
        <div className="mt-2">
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => setShowExtras((v) => !v)}
            aria-expanded={showExtras}
          >
            {block.type === "VIDEO"
              ? `Captions and in-video questions${checkpoints.length ? ` (${checkpoints.length})` : ""}`
              : `Attachments${downloads.length ? ` (${downloads.length})` : ""}`}
          </button>

          {showExtras && block.type === "VIDEO" && (
            <div className="mt-2 space-y-3 rounded-2xl bg-slate-50 p-3">
              <FileUpload
                label="Captions (WebVTT)"
                slot="captions"
                value={block.transcriptVtt ? "uploaded" : null}
                onUploaded={async (f) => {
                  // Captions are small, and the player wants them inline rather
                  // than as a second request, so fetch the text straight back.
                  try {
                    const text = await (await fetch(f.url)).text();
                    onChange({ transcriptVtt: text });
                  } catch {
                    onChange({ transcriptVtt: null });
                  }
                }}
                onClear={() => onChange({ transcriptVtt: null })}
                hint="Captions make the video usable without sound, and searchable."
              />

              <div>
                <p className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                  <Subtitles size={14} aria-hidden /> In-video questions
                </p>
                <p className="mb-2 text-xs text-muted">
                  The video pauses and asks. These are never scored — they exist to make a child stop and think.
                </p>
                <ul className="space-y-2">
                  {checkpoints.map((c, i) => (
                    <li key={i} className="rounded-xl border border-slate-200 bg-white p-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                          value={c.atSeconds}
                          min={0}
                          aria-label={`Question ${i + 1} time in seconds`}
                          onChange={(e) => onChange({
                            checkpoints: checkpoints.map((x, j) => (j === i ? { ...x, atSeconds: Math.max(0, Number(e.target.value) || 0) } : x)),
                          })}
                        />
                        <span className="text-xs text-muted">seconds</span>
                        <span className="flex-1" />
                        <button
                          type="button" className="focus-ring rounded p-1 text-slate-400"
                          onClick={() => onChange({ checkpoints: checkpoints.filter((_, j) => j !== i) })}
                          aria-label={`Remove in-video question ${i + 1}`}
                        >
                          <X size={13} aria-hidden />
                        </button>
                      </div>
                      <input
                        className="input mt-2 w-full text-sm"
                        value={c.prompt}
                        placeholder="What fraction is shaded?"
                        aria-label={`Question ${i + 1}`}
                        onChange={(e) => onChange({
                          checkpoints: checkpoints.map((x, j) => (j === i ? { ...x, prompt: e.target.value } : x)),
                        })}
                      />
                      <ul className="mt-2 space-y-1">
                        {c.options.map((o, oi) => (
                          <li key={oi} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`cp-${index}-${i}`}
                              checked={c.correct === oi}
                              onChange={() => onChange({
                                checkpoints: checkpoints.map((x, j) => (j === i ? { ...x, correct: oi } : x)),
                              })}
                              className="size-3.5 text-brand-600 focus-ring"
                              aria-label={`Option ${oi + 1} is correct`}
                            />
                            <input
                              className="input flex-1 text-sm"
                              value={o}
                              placeholder={`Option ${oi + 1}`}
                              aria-label={`Question ${i + 1} option ${oi + 1}`}
                              onChange={(e) => onChange({
                                checkpoints: checkpoints.map((x, j) => (j === i
                                  ? { ...x, options: x.options.map((y, k) => (k === oi ? e.target.value : y)) }
                                  : x)),
                              })}
                            />
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button" className="btn-ghost mt-1 text-xs"
                        onClick={() => onChange({
                          checkpoints: checkpoints.map((x, j) => (j === i ? { ...x, options: [...x.options, ""] } : x)),
                        })}
                      >
                        <Plus size={12} aria-hidden /> Add option
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="btn-ghost mt-2 text-xs"
                  onClick={() => onChange({
                    checkpoints: [...checkpoints, { atSeconds: 0, prompt: "", options: ["", ""], correct: 0 }],
                  })}
                >
                  <Plus size={13} aria-hidden /> Add an in-video question
                </button>
              </div>
            </div>
          )}

          {showExtras && block.type === "DOCUMENT" && (
            <div className="mt-2 space-y-2 rounded-2xl bg-slate-50 p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Download size={14} aria-hidden /> Downloadable files
              </p>
              <ul className="space-y-1">
                {downloads.map((d, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-xl bg-white p-2 text-sm">
                    <FileText size={14} className="shrink-0 text-brand-600" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{d.name}</span>
                    <button
                      type="button" className="focus-ring rounded p-1 text-slate-400"
                      onClick={() => onChange({ downloadUrls: downloads.filter((_, j) => j !== i) })}
                      aria-label={`Remove ${d.name}`}
                    >
                      <X size={13} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              <UploadButton
                slot="any"
                label="Add an attachment"
                onUploaded={(f) => onChange({
                  downloadUrls: [...downloads, { name: f.name, url: f.url, sizeBytes: f.sizeBytes, mimeType: f.mimeType }],
                })}
              />
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * A video item: the file, its captions, and its in-video questions.
 *
 * The questions pause the video at their timestamp and will not let it run on
 * until answered. They are never scored — the point is to make a child stop
 * and think, not to catch them out — so a wrong answer just shows the right
 * one and carries on.
 */
function VideoItem({ block }: { block: ContentBlock }) {
  const ref = useRef<HTMLVideoElement>(null);
  const checkpoints = useMemo(
    () => [...(block.checkpoints ?? [])].sort((a, b) => a.atSeconds - b.atSeconds),
    [block.checkpoints],
  );
  const [asked, setAsked] = useState<Set<number>>(new Set());
  const [active, setActive] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);

  // A captions file is stored inline, so it is turned into a blob URL for the
  // native <track> rather than fetched again.
  const trackUrl = useMemo(() => {
    if (!block.transcriptVtt) return null;
    return URL.createObjectURL(new Blob([block.transcriptVtt], { type: "text/vtt" }));
  }, [block.transcriptVtt]);
  useEffect(() => () => { if (trackUrl) URL.revokeObjectURL(trackUrl); }, [trackUrl]);

  const onTime = () => {
    const v = ref.current;
    if (!v || active !== null) return;
    const due = checkpoints.findIndex((c, i) => !asked.has(i) && v.currentTime >= c.atSeconds);
    if (due >= 0) {
      v.pause();
      setActive(due);
      setPicked(null);
    }
  };

  const dismiss = () => {
    if (active === null) return;
    setAsked((s) => new Set(s).add(active));
    setActive(null);
    setPicked(null);
    ref.current?.play().catch(() => { /* autoplay may be blocked; the child can press play */ });
  };

  const current = active === null ? null : checkpoints[active];

  return (
    <figure className="space-y-2">
      <div className="relative">
        <video
          ref={ref}
          src={block.url ?? undefined}
          controls
          className="w-full rounded-2xl"
          aria-label={block.title || "Lesson video"}
          onTimeUpdate={onTime}
        >
          {trackUrl && <track kind="captions" src={trackUrl} srcLang="en" label="Captions" default />}
        </video>

        {current && (
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/70 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-4" role="dialog" aria-modal="true" aria-label="Question about the video">
              <p className="text-sm font-semibold">{current.prompt}</p>
              <ul className="mt-3 space-y-1.5">
                {current.options.map((o, i) => {
                  const chosen = picked === i;
                  const right = i === current.correct;
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        className={cn(
                          "focus-ring w-full rounded-xl border px-3 py-2 text-left text-sm",
                          picked === null ? "border-slate-200 hover:bg-slate-50"
                          : right ? "border-success-400 bg-success-50 font-medium"
                          : chosen ? "border-danger-300 bg-danger-50"
                          : "border-slate-200 opacity-60",
                        )}
                        onClick={() => picked === null && setPicked(i)}
                        disabled={picked !== null}
                      >
                        {o}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {picked !== null && (
                <p className="mt-2 text-xs text-muted">
                  {picked === current.correct ? "That's right." : `The answer is "${current.options[current.correct]}".`}
                </p>
              )}
              <button type="button" className="btn-primary mt-3 w-full" onClick={dismiss}>
                {picked === null ? "Skip" : "Keep watching"}
              </button>
            </div>
          </div>
        )}
      </div>
      {block.title && <figcaption className="text-xs text-muted">{block.title}</figcaption>}
      {checkpoints.length > 0 && (
        <p className="text-xs text-muted">
          {checkpoints.length} question{checkpoints.length === 1 ? "" : "s"} along the way.
        </p>
      )}
    </figure>
  );
}

/** A reading: its text, plus anything the teacher attached to download. */
function ReadingItem({ block }: { block: ContentBlock }) {
  const downloads = block.downloadUrls ?? [];
  return (
    <div className="space-y-2">
      {block.title && <h3 className="text-base font-semibold">{block.title}</h3>}
      {block.body && <p className="whitespace-pre-wrap text-sm leading-relaxed">{block.body}</p>}
      {block.url && (
        <a
          href={block.url} target="_blank" rel="noreferrer"
          className="focus-ring inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium hover:bg-slate-100"
        >
          <FileText size={15} aria-hidden /> Open {block.title || "the document"}
        </a>
      )}
      {downloads.length > 0 && (
        <ul className="space-y-1">
          {downloads.map((d, i) => (
            <li key={i}>
              <a
                href={d.url} target="_blank" rel="noreferrer"
                className="focus-ring flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-slate-50"
              >
                <Download size={14} className="shrink-0 text-brand-600" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{d.name}</span>
                {d.sizeBytes ? <span className="text-xs text-muted">{Math.max(1, Math.round(d.sizeBytes / 1024))} KB</span> : null}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
