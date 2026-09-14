"use client";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, CheckCircle2, Copy, Eye, EyeOff, Film, GripVertical, Loader2, Play, Plus,
  RotateCcw, Trash2, X,
} from "lucide-react";
import { Card, CardBody, Pill, cn } from "@/components/dashboard";
import {
  useDeleteLesson, useDuplicateLesson, useRetryVideoProcessing, useSaveLessonContent,
  useSetItemStatus, useUpdateLesson,
} from "@/lib/hooks/queries";
import { formatDuration, type VideoAsset } from "@/lib/api/uploads";
import { VideoUploader } from "./VideoUploader";
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
  const [uploading, setUploading] = useState(false);
  const [uploadsBusy, setUploadsBusy] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<{ title: string; url: string } | null>(null);

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
        video: c.video ?? null,
      })),
    );
    setTitle(lesson.title);
    setOpenItem(null);
    // Intentionally only lesson.id: see above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  const { state, savedAt } = useAutosave(
    blocks,
    (v) =>
      save.mutateAsync({
        lessonId: lesson.id,
        // `_key` and `video` are local/read-only; the API rejects extras.
        blocks: v.map(({ _key, video, progress, ...block }) => block),
      }),
    // An upload creates its item on the server. Saving this list mid-upload
    // would send an array that does not contain it yet, and the save deletes
    // items it is not told about — so hold off until the queue is idle.
    { enabled: !uploadsBusy },
  );

  const setBlock = (i: number, patch: Partial<ContentBlock>) =>
    setBlocks((b) => b.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  /** An empty row for the teacher to fill in. */
  const addEmptyItem = (type: ContentType) => {
    const _key = crypto.randomUUID();
    setBlocks((b) => [...b, { _key, type, title: "", body: "", url: "", estimatedMin: 3, isRequired: true, status: "PUBLISHED" }]);
    setOpenItem(_key);
    setAdding(false);
  };

  const addItem = (type: ContentType) => {
    if (type === "VIDEO") {
      // A video starts with a file, so picking Video opens the uploader rather
      // than an empty row. Pasting a URL is still possible from in there.
      setUploading(true);
      setAdding(false);
      return;
    }
    addEmptyItem(type);
  };

  /**
   * Take on an item the server created during an upload.
   *
   * Without this the next autosave would post a list missing the new item and
   * the server, which treats the list as the lesson's contents, would delete
   * the video that had just finished uploading.
   */
  const absorbVideo = (video: VideoAsset, item?: { id: string; title: string; order: number }) => {
    setBlocks((list) => {
      const existing = list.findIndex((b) => b.id === video.contentItemId);
      if (existing >= 0) {
        return list.map((b, i) => (i === existing ? { ...b, video, durationSeconds: video.durationSeconds ?? b.durationSeconds } : b));
      }
      return [...list, {
        _key: video.contentItemId,
        id: video.contentItemId,
        type: "VIDEO" as ContentType,
        title: item?.title ?? "Video",
        body: "",
        url: video.url ?? "",
        estimatedMin: Math.max(1, Math.round((video.durationSeconds ?? 60) / 60)),
        isRequired: true,
        status: "PUBLISHED" as const,
        durationSeconds: video.durationSeconds ?? null,
        video,
      }];
    });
  };

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= blocks.length) return;
    setBlocks((bs) => moved(bs, from, to));
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
          <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-8 text-center">
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <Film size={22} aria-hidden />
            </div>
            <p className="text-sm font-semibold text-ink">Nothing in this lesson yet</p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-muted">
              Upload one video or several, then add a reading, a PDF or a quiz alongside them.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" className="btn-primary" onClick={() => setUploading(true)}>
                <Film size={15} aria-hidden /> Upload videos
              </button>
              <button type="button" className="btn-secondary" onClick={() => setAdding(true)}>
                <Plus size={15} aria-hidden /> Add other content
              </button>
            </div>
          </div>
        ) : (
          <ol className="space-y-2">
            {blocks.map((b, i) => {
              const kind = ITEM_KINDS.find((k) => k.type === b.type) ?? ITEM_KINDS[5];
              const open = openItem === b._key;
              const live = (b.status ?? "PUBLISHED") === "PUBLISHED";
              return (
                <li
                  key={b._key}
                  draggable
                  onDragStart={(e) => { setDragKey(b._key); e.dataTransfer.effectAllowed = "move"; }}
                  onDragEnd={() => setDragKey(null)}
                  onDragOver={(e) => { if (dragKey && dragKey !== b._key) e.preventDefault(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!dragKey) return;
                    const from = blocks.findIndex((x) => x._key === dragKey);
                    if (from >= 0) move(from, i);
                    setDragKey(null);
                  }}
                  className={cn(
                    "rounded-2xl border",
                    open ? "border-brand-300" : "border-slate-200",
                    dragKey === b._key && "opacity-50",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2 p-3">
                    <span className="hidden cursor-grab text-slate-300 sm:block" aria-hidden title="Drag to reorder">
                      <GripVertical size={14} />
                    </span>
                    {b.type === "VIDEO" && b.video?.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.video.thumbnailUrl} alt="" className="h-8 w-14 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl", live ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-400")} aria-hidden>
                        <kind.icon size={15} />
                      </span>
                    )}
                    <button
                      type="button"
                      className="focus-ring min-w-0 flex-1 rounded text-left"
                      onClick={() => setOpenItem(open ? null : b._key)}
                      aria-expanded={open}
                    >
                      <span className="block truncate text-sm font-medium">
                        {i + 1}. {b.title || kind.label}
                      </span>
                      <span className="block text-xs text-muted">
                        {b.type === "VIDEO" && b.video?.durationSeconds
                          ? formatDuration(b.video.durationSeconds)
                          : `${kind.label} · ${b.estimatedMin ?? 3} min`}
                        {b.isRequired === false ? " · optional" : ""}
                      </span>
                    </button>
                    {b.type === "VIDEO" && b.video && <VideoState video={b.video} courseId={course.id} />}
                    {b.type === "VIDEO" && b.video?.url && b.video.processingStatus === "READY" && (
                      <button
                        type="button" className="btn-ghost text-xs"
                        onClick={() => setPreviewing({ title: b.title || "Video", url: b.video!.url! })}
                      >
                        <Play size={13} aria-hidden /> Preview
                      </button>
                    )}
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

        {uploading && (
          <div className="space-y-2 rounded-2xl bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Add videos to this lesson</p>
              <button type="button" className="btn-ghost text-xs" onClick={() => setUploading(false)} disabled={uploadsBusy}>
                Done
              </button>
            </div>
            <VideoUploader
              courseId={course.id}
              lessonId={lesson.id}
              onUploaded={absorbVideo}
              onBusyChange={setUploadsBusy}
            />
            <p className="text-xs text-muted">
              Add as many videos as the lesson needs — each becomes its own item, in the order they finish.
            </p>
            <button
              type="button" className="btn-ghost w-full text-xs"
              onClick={() => { setUploading(false); addEmptyItem("VIDEO"); }}
            >
              Already hosted elsewhere? Add a video by URL instead
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={() => setAdding(true)}>
            <Plus size={15} aria-hidden /> Add content
          </button>
          <button type="button" className="btn-ghost" onClick={() => setUploading(true)}>
            <Film size={15} aria-hidden /> Add video
          </button>
        </div>

        {setStatus.isError && (
          <p className="text-sm text-danger-600" role="alert">{(setStatus.error as Error).message}</p>
        )}
      </CardBody>

      {adding && <AddContentModal onPick={addItem} onClose={() => setAdding(false)} />}
      {previewing && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          role="dialog" aria-modal="true" aria-label={`Preview of ${previewing.title}`}
          onClick={() => setPreviewing(null)}
        >
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between text-white">
              <p className="truncate text-sm font-medium">{previewing.title}</p>
              <button type="button" className="btn-ghost text-white" onClick={() => setPreviewing(null)} aria-label="Close preview">
                <X size={16} aria-hidden />
              </button>
            </div>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={previewing.url} controls autoPlay className="w-full rounded-2xl bg-black" />
          </div>
        </div>
      )}
    </Card>
  );
}

/** Upload/processing state for one video, with a retry when it failed. */
function VideoState({ video, courseId }: { video: NonNullable<ContentBlock["video"]>; courseId: string }) {
  const retry = useRetryVideoProcessing(courseId);
  if (video.processingStatus === "READY") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success-700">
        <CheckCircle2 size={13} aria-hidden /> Ready
      </span>
    );
  }
  if (video.processingStatus === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-xs text-danger-700" title={video.error ?? undefined}>
          <AlertTriangle size={13} aria-hidden /> Failed
        </span>
        <button type="button" className="btn-ghost text-xs" onClick={() => retry.mutate(video.id)} disabled={retry.isPending}>
          <RotateCcw size={12} aria-hidden /> Retry
        </button>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted" aria-live="polite">
      <Loader2 size={13} className="animate-spin" aria-hidden /> Processing
    </span>
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
