"use client";
import { useRef, useState } from "react";
import {
  Bold, Code, Download, Heading1, Heading2, Image as ImageIcon, Italic, Link2, List,
  Plus, Quote, Subtitles, X,
} from "lucide-react";
import { Pill, cn } from "@/components/dashboard";
import type { ContentBlock, CourseTree } from "@/lib/api/authoring";
import { Field, TextArea, TextField, Toggle } from "@/features/course-builder/parts";
import { FileUpload, UploadButton } from "@/features/course-builder/FileUpload";

/** Routes one item to the editor its type needs. */
export function ItemEditor({
  course, block, onChange,
}: { course: CourseTree; block: ContentBlock; onChange: (patch: Partial<ContentBlock>) => void }) {
  return (
    <div className="space-y-3">
      {block.type === "VIDEO" && <VideoEditor block={block} onChange={onChange} />}
      {block.type === "DOCUMENT" && <ReadingEditor block={block} onChange={onChange} />}
      {(block.type === "IMAGE" || block.type === "AUDIO") && <MediaEditor block={block} onChange={onChange} />}
      {["HEADING", "PARAGRAPH", "CALLOUT", "EXAMPLE", "QUESTION", "CODE"].includes(block.type) && (
        <TextBlockEditor block={block} onChange={onChange} />
      )}
      {["QUIZ", "ASSIGNMENT", "PEER_REVIEW"].includes(block.type) && (
        <AssessmentLink course={course} block={block} onChange={onChange} />
      )}

      <div className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
        <TextField
          label="Minutes" type="number" value={String(block.estimatedMin ?? 3)}
          onChange={(v) => onChange({ estimatedMin: Math.max(0, Number(v) || 0) })}
          hint="How long this one item takes."
        />
        <div className="flex items-end pb-1">
          <Toggle
            label="Required for completion" checked={block.isRequired ?? true}
            onChange={(v) => onChange({ isRequired: v })}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ video editor */

/**
 * Video, its captions, and the questions that pause it.
 *
 * Laid out as the player plus two panels, so a teacher can watch, read the
 * transcript and place a question at the moment they hear it — rather than
 * guessing a timestamp in a separate form.
 */
function VideoEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [at, setAt] = useState(0);
  const checkpoints = block.checkpoints ?? [];

  const addAtCurrentTime = () => {
    const t = Math.floor(video.current?.currentTime ?? at);
    onChange({
      checkpoints: [...checkpoints, { atSeconds: t, prompt: "", options: ["", ""], correct: 0 }]
        .sort((a, b) => a.atSeconds - b.atSeconds),
    });
  };

  const setCheckpoint = (i: number, patch: Partial<(typeof checkpoints)[number]>) =>
    onChange({ checkpoints: checkpoints.map((c, j) => (j === i ? { ...c, ...patch } : c)) });

  return (
    <div className="space-y-3">
      <TextField label="Title" value={block.title ?? ""} onChange={(v) => onChange({ title: v })} placeholder="Understanding Python Variables" />

      <FileUpload
        label="Video file" slot="video" value={block.url || null}
        onUploaded={(f) => onChange({ url: f.url, title: block.title || f.name })}
        onClear={() => onChange({ url: "" })}
      />

      {block.url && (
        <video
          ref={video}
          src={block.url}
          controls
          className="w-full rounded-2xl"
          aria-label="Preview"
          onTimeUpdate={(e) => setAt(Math.floor((e.target as HTMLVideoElement).currentTime))}
          onLoadedMetadata={(e) => {
            const d = Math.round((e.target as HTMLVideoElement).duration);
            if (Number.isFinite(d) && d > 0 && d !== block.durationSeconds) onChange({ durationSeconds: d });
          }}
        >
          {block.transcriptVtt && (
            <track
              kind="captions"
              srcLang="en"
              label="Captions"
              default
              src={`data:text/vtt;charset=utf-8,${encodeURIComponent(block.transcriptVtt)}`}
            />
          )}
        </video>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Transcript */}
        <section className="rounded-2xl bg-slate-50 p-3">
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Subtitles size={15} aria-hidden /> Transcript
          </h4>
          <FileUpload
            label="Captions file (WebVTT)" slot="captions" value={block.transcriptVtt ? "uploaded" : null}
            onUploaded={async (f) => {
              try {
                onChange({ transcriptVtt: await (await fetch(f.url)).text() });
              } catch {
                onChange({ transcriptVtt: null });
              }
            }}
            onClear={() => onChange({ transcriptVtt: null })}
            hint="Or type it below. Captions make the video usable without sound."
          />
          <textarea
            className="input mt-2 h-40 w-full font-mono text-xs"
            value={block.transcriptVtt ?? ""}
            placeholder={"WEBVTT\n\n00:00:00.000 --> 00:00:04.000\nWelcome to Python."}
            aria-label="Transcript"
            onChange={(e) => onChange({ transcriptVtt: e.target.value })}
          />
        </section>

        {/* In-video questions */}
        <section className="rounded-2xl bg-slate-50 p-3">
          <h4 className="mb-1 text-sm font-semibold">Questions</h4>
          <p className="mb-2 text-xs text-muted">
            The video pauses and asks. Never scored — they exist to make a child stop and think.
          </p>

          <ul className="space-y-2">
            {checkpoints.map((c, i) => (
              <li key={i} className="rounded-xl bg-white p-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0}
                    className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    value={c.atSeconds}
                    aria-label={`Question ${i + 1} time in seconds`}
                    onChange={(e) => setCheckpoint(i, { atSeconds: Math.max(0, Number(e.target.value) || 0) })}
                  />
                  <button
                    type="button"
                    className="btn-ghost text-[11px]"
                    onClick={() => { if (video.current) video.current.currentTime = c.atSeconds; }}
                  >
                    {mmss(c.atSeconds)} — jump
                  </button>
                  <span className="flex-1" />
                  <button
                    type="button" className="focus-ring rounded p-1 text-slate-400 hover:text-danger-600"
                    onClick={() => onChange({ checkpoints: checkpoints.filter((_, j) => j !== i) })}
                    aria-label={`Remove question ${i + 1}`}
                  >
                    <X size={13} aria-hidden />
                  </button>
                </div>
                <input
                  className="input mt-2 w-full text-sm"
                  value={c.prompt}
                  placeholder="What is a variable?"
                  aria-label={`Question ${i + 1}`}
                  onChange={(e) => setCheckpoint(i, { prompt: e.target.value })}
                />
                <ul className="mt-2 space-y-1">
                  {c.options.map((o, oi) => (
                    <li key={oi} className="flex items-center gap-2">
                      <input
                        type="radio" name={`vq-${i}`} checked={c.correct === oi}
                        onChange={() => setCheckpoint(i, { correct: oi })}
                        className="size-3.5 text-brand-600 focus-ring"
                        aria-label={`Option ${oi + 1} is correct`}
                      />
                      <input
                        className="input flex-1 text-sm" value={o}
                        placeholder={`Option ${oi + 1}`}
                        aria-label={`Question ${i + 1} option ${oi + 1}`}
                        onChange={(e) => setCheckpoint(i, { options: c.options.map((y, k) => (k === oi ? e.target.value : y)) })}
                      />
                      {c.options.length > 2 && (
                        <button
                          type="button" className="focus-ring rounded p-1 text-slate-400"
                          onClick={() => setCheckpoint(i, {
                            options: c.options.filter((_, k) => k !== oi),
                            correct: c.correct >= oi && c.correct > 0 ? c.correct - 1 : c.correct,
                          })}
                          aria-label={`Remove option ${oi + 1}`}
                        >
                          <X size={12} aria-hidden />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  type="button" className="btn-ghost mt-1 text-[11px]"
                  onClick={() => setCheckpoint(i, { options: [...c.options, ""] })}
                >
                  <Plus size={12} aria-hidden /> Option
                </button>
              </li>
            ))}
          </ul>

          <button type="button" className="btn-ghost mt-2 w-full text-xs" onClick={addAtCurrentTime}>
            <Plus size={13} aria-hidden /> Add a question{block.url ? ` at ${mmss(at)}` : ""}
          </button>
        </section>
      </div>
    </div>
  );
}

function mmss(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ---------------------------------------------------------- reading editor */

interface Tool {
  label: string;
  icon: typeof Bold;
  /** Wraps the selection, e.g. **bold**. */
  wrap?: [string, string];
  /** Prefixes the line the cursor is on, e.g. "## ". */
  prefix?: string;
}

const TOOLS: Tool[] = [
  { label: "Bold", icon: Bold, wrap: ["**", "**"] },
  { label: "Italic", icon: Italic, wrap: ["_", "_"] },
  { label: "Heading 1", icon: Heading1, prefix: "# " },
  { label: "Heading 2", icon: Heading2, prefix: "## " },
  { label: "Link", icon: Link2, wrap: ["[", "](https://)"] },
  { label: "List", icon: List, prefix: "- " },
  { label: "Quote", icon: Quote, prefix: "> " },
  { label: "Code", icon: Code, wrap: ["\n```\n", "\n```\n"] },
];

/**
 * Markdown with a toolbar.
 *
 * Deliberately not a rich-text editor over contenteditable: the text is
 * stored as markdown and rendered the same way for the student, so what a
 * teacher writes is exactly what ships. The toolbar inserts markdown around
 * the selection rather than hiding it.
 */
function ReadingEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  const area = useRef<HTMLTextAreaElement>(null);
  const downloads = block.downloadUrls ?? [];

  const apply = (tool: Tool) => {
    const el = area.current;
    if (!el) return;
    const text = block.body ?? "";
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = text.slice(start, end);

    let next: string;
    let caret: number;
    if (tool.wrap) {
      const [open, close] = tool.wrap;
      next = text.slice(0, start) + open + selected + close + text.slice(end);
      caret = start + open.length + selected.length;
    } else {
      // Line prefix: apply from the start of the line the cursor is on.
      const lineStart = text.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
      const prefix = tool.prefix ?? "";
      next = text.slice(0, lineStart) + prefix + text.slice(lineStart);
      caret = start + prefix.length;
    }
    onChange({ body: next });
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(caret, caret); });
  };

  return (
    <div className="space-y-3">
      <TextField label="Title" value={block.title ?? ""} onChange={(v) => onChange({ title: v })} placeholder="Python Data Types" />

      <Field label="Reading" hint="Markdown. Headings, lists, links and code blocks all work.">
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-1.5 py-1">
            {TOOLS.map((t) => (
              <button
                key={t.label}
                type="button"
                className="focus-ring rounded-lg p-1.5 text-slate-600 hover:bg-white"
                onClick={() => apply(t)}
                title={t.label}
                aria-label={t.label}
              >
                <t.icon size={14} aria-hidden />
              </button>
            ))}
            <span className="flex-1" />
            <UploadButton
              slot="image"
              label="Image"
              onUploaded={(f) => onChange({ body: `${block.body ?? ""}\n\n![${f.name}](${f.url})\n` })}
            />
          </div>
          <textarea
            ref={area}
            className="h-64 w-full resize-y border-0 px-3 py-2 text-sm focus:outline-none"
            value={block.body ?? ""}
            placeholder={"# Python Variables\n\nA variable stores information that your program can use later."}
            aria-label="Reading content"
            onChange={(e) => onChange({ body: e.target.value })}
          />
        </div>
      </Field>

      <Field label="Attachments" hint="PDFs and worksheets students can download.">
        <ul className="space-y-1">
          {downloads.map((d, i) => (
            <li key={i} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 text-sm">
              <Download size={14} className="shrink-0 text-brand-600" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{d.name}</span>
              <button
                type="button" className="focus-ring rounded p-1 text-slate-400 hover:text-danger-600"
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
          label="Attach a file"
          className="mt-1"
          onUploaded={(f) => onChange({
            downloadUrls: [...downloads, { name: f.name, url: f.url, sizeBytes: f.sizeBytes, mimeType: f.mimeType }],
          })}
        />
      </Field>
    </div>
  );
}

/* ------------------------------------------------------------- simple kinds */

function MediaEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  const slot = block.type === "IMAGE" ? "image" : "audio";
  return (
    <div className="space-y-3">
      <TextField label="Caption" value={block.title ?? ""} onChange={(v) => onChange({ title: v })} />
      <FileUpload
        label={block.type === "IMAGE" ? "Image file" : "Audio file"}
        slot={slot}
        value={block.url || null}
        onUploaded={(f) => onChange({ url: f.url, title: block.title || f.name })}
        onClear={() => onChange({ url: "" })}
      />
      {block.type === "IMAGE" && block.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={block.url} alt="" className="max-h-56 rounded-xl border border-slate-200 object-contain" />
      )}
    </div>
  );
}

function TextBlockEditor({ block, onChange }: { block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  if (block.type === "HEADING") {
    return <TextField label="Heading" value={block.title ?? ""} onChange={(v) => onChange({ title: v })} placeholder="What is a variable?" />;
  }
  return (
    <TextArea
      label={block.type === "CODE" ? "Code" : "Text"}
      rows={block.type === "PARAGRAPH" ? 6 : 4}
      value={block.body ?? ""}
      onChange={(v) => onChange({ body: v })}
      placeholder={block.type === "CODE" ? "name = \"Kidora\"" : "Write here…"}
    />
  );
}

/** A QUIZ/ASSIGNMENT/PEER_REVIEW item points at the real thing. */
function AssessmentLink({
  course, block, onChange,
}: { course: CourseTree; block: ContentBlock; onChange: (p: Partial<ContentBlock>) => void }) {
  const isQuiz = block.type === "QUIZ";
  const options = isQuiz
    ? course.quizzes.map((q) => ({ value: q.id, label: `${q.title} (${q._count.questions} questions)` }))
    : course.assignments
        .filter((a) => (block.type === "PEER_REVIEW" ? true : true))
        .map((a) => ({ value: a.id, label: a.title }));
  const current = isQuiz ? block.quizId ?? "" : block.assignmentId ?? "";

  return (
    <div className="space-y-3">
      <TextField label="Title shown in the lesson" value={block.title ?? ""} onChange={(v) => onChange({ title: v })} />
      <Field
        label={isQuiz ? "Which quiz" : "Which assignment"}
        hint={
          options.length
            ? "Build it in the Assessment step, then point this item at it."
            : "There are none yet. Create one in the Assessment step first."
        }
      >
        <select
          className="input w-full"
          value={current}
          aria-label={isQuiz ? "Quiz" : "Assignment"}
          onChange={(e) => onChange(isQuiz ? { quizId: e.target.value || null } : { assignmentId: e.target.value || null })}
        >
          <option value="">Not linked yet</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>
      {!current && <Pill tone="warning">Students will not see anything until this is linked.</Pill>}
    </div>
  );
}
