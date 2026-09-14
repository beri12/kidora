"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Film, Loader2, RotateCcw, Upload, X } from "lucide-react";
import { cn } from "@/components/dashboard";
import {
  VIDEO_ACCEPT, VIDEO_MIMES, formatBytes, formatDuration, putBytes, readVideoDuration, videoApi,
  type TransferProgress, type VideoAsset,
} from "@/lib/api/uploads";

type JobState = "queued" | "uploading" | "processing" | "ready" | "failed" | "cancelled";

interface Job {
  /** Local id: several files can share a name, so the name is not enough. */
  key: string;
  file: File;
  state: JobState;
  progress: TransferProgress | null;
  sessionId?: string;
  video?: VideoAsset;
  error?: string;
  controller?: AbortController;
}

const MAX_PARALLEL = 2;

/**
 * Uploading one or many videos into a single lesson.
 *
 * Every file is its own job with its own progress, so one failure does not
 * take the others down and the teacher can retry just the one that broke.
 * Nothing here blocks the page: the queue keeps running while the teacher
 * edits other fields, and the component warns before the tab closes with an
 * upload still in flight.
 *
 * A lesson takes as many videos as the teacher adds — the jobs append to the
 * lesson's item list rather than replacing anything.
 */
export function VideoUploader({
  courseId, lessonId, onUploaded, onBusyChange,
}: {
  courseId: string;
  lessonId: string;
  /** Called with the created item so the lesson list can absorb it. */
  onUploaded: (video: VideoAsset, contentItem?: { id: string; title: string; order: number }) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const running = useRef(0);
  const jobsRef = useRef<Job[]>([]);
  jobsRef.current = jobs;

  const patch = useCallback((key: string, next: Partial<Job>) => {
    setJobs((list) => list.map((j) => (j.key === key ? { ...j, ...next } : j)));
  }, []);

  const busy = jobs.some((j) => j.state === "uploading" || j.state === "queued" || j.state === "processing");
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);

  // An upload lost to a closed tab is a 500 MB waste of someone's data.
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const add = (files: FileList | File[]) => {
    const picked = Array.from(files);
    const bad: string[] = [];
    const good: Job[] = [];

    for (const file of picked) {
      if (!VIDEO_MIMES.includes(file.type)) {
        bad.push(`${file.name} — unsupported format. Please upload MP4, MOV, or WEBM.`);
        continue;
      }
      if (file.size === 0) {
        bad.push(`${file.name} — that file is empty.`);
        continue;
      }
      // Same name and size already queued or uploaded: almost certainly the
      // same file picked twice.
      const duplicate = jobsRef.current.some(
        (j) => j.file.name === file.name && j.file.size === file.size && j.state !== "failed" && j.state !== "cancelled",
      );
      if (duplicate) {
        bad.push(`${file.name} — already added.`);
        continue;
      }
      good.push({ key: `${file.name}:${file.size}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`, file, state: "queued", progress: null });
    }

    setRejected(bad);
    if (good.length) setJobs((list) => [...list, ...good]);
  };

  /** One job, end to end: presign, PUT, complete, then poll processing. */
  const run = useCallback(async (job: Job) => {
    const controller = new AbortController();
    patch(job.key, { state: "uploading", error: undefined, controller, progress: null });
    try {
      const [duration, ticket] = await Promise.all([
        readVideoDuration(job.file),
        videoApi.presign({
          courseId, lessonId,
          fileName: job.file.name,
          fileSizeBytes: job.file.size,
          mimeType: job.file.type,
        }),
      ]);
      patch(job.key, { sessionId: ticket.sessionId });

      await putBytes(ticket, job.file, {
        signal: controller.signal,
        onProgress: (p) => patch(job.key, { progress: p }),
      });

      patch(job.key, { state: "processing" });
      const { video, contentItem } = await videoApi.complete({
        sessionId: ticket.sessionId,
        title: job.file.name.replace(/\.[^.]+$/, ""),
        durationSeconds: duration,
      });
      patch(job.key, { video });
      onUploaded(video, contentItem);

      // Processing is asynchronous on the server; poll until it settles.
      let current = video;
      for (let i = 0; i < 40 && current.processingStatus !== "READY" && current.processingStatus !== "FAILED"; i += 1) {
        await new Promise((r) => setTimeout(r, 1500));
        current = await videoApi.status(video.id);
      }
      if (current.processingStatus === "FAILED") {
        patch(job.key, { state: "failed", video: current, error: current.error ?? "Video processing failed. Please retry or upload the video again." });
      } else {
        patch(job.key, { state: "ready", video: current });
        onUploaded(current);
      }
    } catch (e) {
      if ((e as DOMException).name === "AbortError") {
        patch(job.key, { state: "cancelled", progress: null });
        if (job.sessionId) await videoApi.abort(job.sessionId).catch(() => undefined);
        return;
      }
      patch(job.key, { state: "failed", error: (e as Error).message });
    }
  }, [courseId, lessonId, onUploaded, patch]);

  // Keep a couple of transfers in flight: all at once starves each of them.
  useEffect(() => {
    const next = jobs.filter((j) => j.state === "queued").slice(0, Math.max(0, MAX_PARALLEL - running.current));
    if (next.length === 0) return;
    for (const job of next) {
      running.current += 1;
      // Mark it first so this effect does not pick it up again on re-render.
      patch(job.key, { state: "uploading" });
      void run(job).finally(() => { running.current -= 1; });
    }
  }, [jobs, run, patch]);

  const cancel = (job: Job) => job.controller?.abort();
  const retry = (job: Job) => patch(job.key, { state: "queued", error: undefined, progress: null });
  const dismiss = (key: string) => setJobs((list) => list.filter((j) => j.key !== key));

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files?.length) add(e.dataTransfer.files); }}
        className={cn(
          "rounded-2xl border-2 border-dashed p-5 text-center transition-colors",
          dragging ? "border-brand-500 bg-brand-50/60" : "border-slate-200 bg-white",
        )}
      >
        <input
          ref={input} type="file" accept={VIDEO_ACCEPT} multiple className="sr-only"
          aria-label="Choose videos to upload"
          onChange={(e) => { if (e.target.files?.length) add(e.target.files); e.target.value = ""; }}
        />
        <Film size={24} className="mx-auto text-brand-400" aria-hidden />
        <p className="mt-2 text-sm font-semibold text-ink">Upload Video</p>
        <p className="text-xs text-muted">Drag &amp; drop video here, or</p>
        <button type="button" className="btn-primary mt-2" onClick={() => input.current?.click()}>
          <Upload size={15} aria-hidden /> Select Video
        </button>
        <p className="mt-2 text-xs text-muted">Supported formats: MP4, MOV, WEBM · several at once is fine</p>
      </div>

      {rejected.length > 0 && (
        <ul className="space-y-1 rounded-2xl bg-danger-50 p-3" role="alert">
          {rejected.map((r) => (
            <li key={r} className="flex items-start gap-2 text-xs text-danger-700">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />{r}
            </li>
          ))}
        </ul>
      )}

      {jobs.length > 0 && (
        <ul className="space-y-2" aria-label="Video uploads">
          {jobs.map((job) => <JobRow key={job.key} job={job} onCancel={() => cancel(job)} onRetry={() => retry(job)} onDismiss={() => dismiss(job.key)} />)}
        </ul>
      )}
    </div>
  );
}

function JobRow({
  job, onCancel, onRetry, onDismiss,
}: { job: Job; onCancel: () => void; onRetry: () => void; onDismiss: () => void }) {
  const p = job.progress;
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <Film size={16} className="mt-0.5 shrink-0 text-brand-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{job.file.name}</p>
          <p className="text-xs text-muted">
            {formatBytes(job.file.size)}
            {job.video?.durationSeconds ? ` · ${formatDuration(job.video.durationSeconds)}` : ""}
          </p>

          {job.state === "uploading" && (
            <div className="mt-2">
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-brand-600 transition-[width]"
                  style={{ width: `${p?.percent ?? 0}%` }}
                  role="progressbar" aria-valuenow={p?.percent ?? 0} aria-valuemin={0} aria-valuemax={100}
                  aria-label={`Uploading ${job.file.name}`}
                />
              </div>
              <p className="mt-1 text-xs text-muted" aria-live="polite">
                Uploading… {p?.percent ?? 0}%
                {p ? ` · ${formatBytes(p.loaded)} of ${formatBytes(p.total)}` : ""}
                {p?.bytesPerSecond ? ` · ${formatBytes(p.bytesPerSecond)}/s` : ""}
                {p?.etaSeconds !== null && p?.etaSeconds !== undefined ? ` · ${formatDuration(p.etaSeconds)} left` : ""}
              </p>
            </div>
          )}

          {job.state === "processing" && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted" aria-live="polite">
              <CheckCircle2 size={13} className="text-success-600" aria-hidden /> Upload complete · processing video…
            </p>
          )}
          {job.state === "ready" && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-success-700">
              <CheckCircle2 size={13} aria-hidden /> Video ready
            </p>
          )}
          {job.state === "queued" && <p className="mt-1.5 text-xs text-muted">Waiting…</p>}
          {job.state === "cancelled" && <p className="mt-1.5 text-xs text-muted">Cancelled.</p>}
          {job.state === "failed" && (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-danger-700" role="alert">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />{job.error}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {job.state === "uploading" && (
            <button type="button" className="btn-ghost text-xs" onClick={onCancel}>Cancel</button>
          )}
          {(job.state === "failed" || job.state === "cancelled") && (
            <button type="button" className="btn-ghost text-xs" onClick={onRetry}>
              <RotateCcw size={13} aria-hidden /> Retry
            </button>
          )}
          {job.state === "processing" && <Loader2 size={15} className="animate-spin text-brand-600" aria-hidden />}
          {(job.state === "ready" || job.state === "cancelled" || job.state === "failed") && (
            <button
              type="button" className="focus-ring rounded p-1 text-slate-400 hover:text-danger-600"
              onClick={onDismiss} aria-label={`Dismiss ${job.file.name}`}
            >
              <X size={14} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
