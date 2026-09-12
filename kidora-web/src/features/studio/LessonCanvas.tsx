"use client";
import { useEffect, useMemo, useState } from "react";
import { Copy, Eye, EyeOff, Plus, Trash2, X } from "lucide-react";
import { Card, CardBody, EmptyState, Pill, cn } from "@/components/dashboard";
import {
  useDeleteLesson, useDuplicateLesson, useSaveLessonContent, useSetItemStatus, useUpdateLesson,
} from "@/lib/hooks/queries";
import type { AuthoredLesson, AuthoredSection, ContentBlock, ContentType, CourseTree } from "@/lib/api/authoring";
import { ReorderButtons, SaveIndicator, moved, useAutosave } from "@/features/course-builder/parts";
import { ITEM_KINDS } from "./CurriculumStep";
import { ItemEditor } from "./ItemEditor";

/**
 * The middle column: the lesson you selected, as a list of its items.
 *
 * Items save on a debounce, and each has its own published/draft state so a
 * teacher can leave one half-written without hiding the whole lesson.
 */
export function LessonCanvas({
  course, section, lesson,
}: { course: CourseTree; section: AuthoredSection; lesson: AuthoredLesson }) {
  const save = useSaveLessonContent(course.id);
  const updateLesson = useUpdateLesson(course.id);
  const duplicate = useDuplicateLesson(course.id);
  const remove = useDeleteLesson(course.id);
  const setStatus = useSetItemStatus(course.id);

  /**
   * Each block carries a key that is made once and never changes.
   *
   * Keying on the database id would change the moment a new item is first
   * saved, remounting the editor the teacher is typing into. Keying on the
   * array index would mis-associate rows after a reorder. So the key is local
   * and stable for the life of the row.
   */
  type Editable = ContentBlock & { _key: string };
  const [blocks, setBlocks] = useState<Editable[]>([]);
  const [title, setTitle] = useState(lesson.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [adding, setAdding] = useState(false);
  const [openItem, setOpenItem] = useState<string | null>(null);

  /**
   * Seeded only when a *different* lesson is selected.
   *
   * Re-seeding whenever `lesson.contents` changed meant every autosave — which
   * refetches the tree — threw away whatever was being typed since the save
   * began, and closed the open editor. Local state is the working copy from
   * the moment the lesson opens; the server is written from it, not the other
   * way round.
   */
  useEffect(() => {
    setBlocks(
      (lesson.contents ?? []).map((c) => ({
        _key: c.id ?? crypto.randomUUID(),
        id: c.id,
        type: c.type,
        title: c.title ?? "",
        body: c.body ?? "",
        url: c.url ?? "",
        estimatedMin: c.estimatedMin ?? 3,
        isRequired: c.isRequired ?? true,
        status: c.status ?? "PUBLISHED",
        durationSeconds: c.durationSeconds ?? null,
        transcriptVtt: c.transcriptVtt ?? null,
        checkpoints: c.checkpoints ?? [],
        downloadUrls: c.downloadUrls ?? [],
        quizId: c.quizId ?? null,
        assignmentId: c.assignmentId ?? null,
      })),
    );
    setTitle(lesson.title);
    setOpenItem(null);
    // Intentionally only lesson.id: see above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  const { state, savedAt } = useAutosave(blocks, (v) =>
    save.mutateAsync({
      lessonId: lesson.id,
      // `_key` is a local concern; the API would reject the extra property.
      blocks: v.map(({ _key, ...block }) => block),
    }),
  );

  const setBlock = (i: number, patch: Partial<ContentBlock>) =>
    setBlocks((b) => b.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const addItem = (type: ContentType) => {
    const _key = crypto.randomUUID();
    setBlocks((b) => [...b, { _key, type, title: "", body: "", url: "", estimatedMin: 3, isRequired: true, status: "PUBLISHED" }]);
    setOpenItem(_key);
    setAdding(false);
  };

  const totalMin = blocks.reduce((a, b) => a + (b.estimatedMin ?? 0), 0);
  const liveCount = blocks.filter((b) => (b.status ?? "PUBLISHED") === "PUBLISHED").length;

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">
              {section.weekNumber ? `Week ${section.weekNumber} · ` : ""}{section.title}
            </p>
            {editingTitle ? (
              <input
                className="input w-full text-lg font-bold" value={title} autoFocus
                aria-label="Lesson title"
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => { updateLesson.mutate({ id: lesson.id, title: title.trim() }); setEditingTitle(false); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { updateLesson.mutate({ id: lesson.id, title: title.trim() }); setEditingTitle(false); }
                  if (e.key === "Escape") { setTitle(lesson.title); setEditingTitle(false); }
                }}
              />
            ) : (
              <button type="button" className="focus-ring rounded text-left text-lg font-bold hover:underline" onClick={() => setEditingTitle(true)}>
                {lesson.title}
              </button>
            )}
            <p className="text-xs text-muted">
              {blocks.length} item{blocks.length === 1 ? "" : "s"}
              {blocks.length !== liveCount ? ` · ${blocks.length - liveCount} draft` : ""}
              {totalMin ? ` · ${totalMin} min` : ""}
            </p>
          </div>
          <SaveIndicator state={state} savedAt={savedAt} />
          <button type="button" className="btn-ghost" onClick={() => duplicate.mutate(lesson.id)} aria-label={`Duplicate ${lesson.title}`}>
            <Copy size={14} aria-hidden />
          </button>
          <button
            type="button" className="btn-ghost text-danger-600"
            onClick={() => { if (confirm(`Delete "${lesson.title}"?`)) remove.mutate(lesson.id); }}
            aria-label={`Delete ${lesson.title}`}
          >
            <Trash2 size={14} aria-hidden />
          </button>
        </div>

        {blocks.length === 0 ? (
          <EmptyState
            title="Nothing in this lesson yet"
            body="Add a video, a reading, a quiz — whatever a student needs to learn this idea."
            action={{ label: "Add learning material", onClick: () => setAdding(true) }}
          />
        ) : (
          <ol className="space-y-2">
            {blocks.map((b, i) => {
              const kind = ITEM_KINDS.find((k) => k.type === b.type) ?? ITEM_KINDS[5];
              const open = openItem === b._key;
              const live = (b.status ?? "PUBLISHED") === "PUBLISHED";
              return (
                <li key={b._key} className={cn("rounded-2xl border", open ? "border-brand-300" : "border-slate-200")}>
                  <div className="flex flex-wrap items-center gap-2 p-3">
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl", live ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-400")} aria-hidden>
                      <kind.icon size={15} />
                    </span>
                    <button
                      type="button"
                      className="focus-ring min-w-0 flex-1 rounded text-left"
                      onClick={() => setOpenItem(open ? null : b._key)}
                      aria-expanded={open}
                    >
                      <span className="block truncate text-sm font-medium">
                        {b.title || kind.label}
                      </span>
                      <span className="block text-xs text-muted">
                        {kind.label} · {b.estimatedMin ?? 3} min{b.isRequired === false ? " · optional" : ""}
                      </span>
                    </button>
                    {!live && <Pill tone="neutral">Draft</Pill>}
                    <button
                      type="button"
                      className="btn-ghost"
                      title={live ? "Hide from students" : "Show to students"}
                      onClick={() => {
                        const next = live ? "DRAFT" : "PUBLISHED";
                        setBlock(i, { status: next });
                        // Persisted immediately rather than on the debounce:
                        // hiding something from children should not wait.
                        if (b.id) setStatus.mutate({ id: b.id, status: next });
                      }}
                    >
                      {live ? <Eye size={14} aria-hidden /> : <EyeOff size={14} aria-hidden />}
                      <span className="sr-only">{live ? `Hide ${b.title || kind.label}` : `Show ${b.title || kind.label}`}</span>
                    </button>
                    <ReorderButtons
                      index={i} total={blocks.length} label={b.title || kind.label}
                      onMove={(from, to) => setBlocks((bs) => moved(bs, from, to))}
                    />
                    <button
                      type="button" className="focus-ring rounded p-1 text-slate-400 hover:text-danger-600"
                      onClick={() => { setBlocks((bs) => bs.filter((_, j) => j !== i)); if (open) setOpenItem(null); }}
                      aria-label={`Remove ${b.title || kind.label}`}
                    >
                      <X size={14} aria-hidden />
                    </button>
                  </div>

                  {open && (
                    <div className="border-t border-slate-100 p-3">
                      <ItemEditor course={course} block={b} onChange={(patch) => setBlock(i, patch)} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        <button type="button" className="btn-ghost w-full" onClick={() => setAdding(true)}>
          <Plus size={15} aria-hidden /> Add content
        </button>

        {setStatus.isError && (
          <p className="text-sm text-danger-600" role="alert">{(setStatus.error as Error).message}</p>
        )}
      </CardBody>

      {adding && <AddContentModal onPick={addItem} onClose={() => setAdding(false)} />}
    </Card>
  );
}

/** Tiles rather than a dropdown: six options you can see beats six you scroll. */
function AddContentModal({ onPick, onClose }: { onPick: (t: ContentType) => void; onClose: () => void }) {
  const groups = [
    { key: "media", label: "Learning material" },
    { key: "text", label: "Text" },
    { key: "assessment", label: "Assessment" },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="add-content-title">
      <div className="max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="add-content-title" className="text-lg font-bold">Add learning material</h2>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Close">
            <X size={16} aria-hidden />
          </button>
        </div>

        {groups.map((g) => (
          <section key={g.key} className="mb-4 last:mb-0">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{g.label}</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              {ITEM_KINDS.filter((k) => k.group === g.key).map((k) => (
                <button
                  key={k.type}
                  type="button"
                  onClick={() => onPick(k.type)}
                  className="focus-ring rounded-2xl border border-slate-200 p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/50"
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700" aria-hidden>
                    <k.icon size={17} />
                  </span>
                  <p className="mt-2 text-sm font-semibold">{k.label}</p>
                  <p className="text-xs text-muted">{k.blurb}</p>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
