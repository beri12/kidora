"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Gauge } from "lucide-react";
import { cn } from "@/components/dashboard";
import { learningApi } from "@/lib/api/learning";
import { formatDuration } from "@/lib/api/uploads";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
/** How often to tell the server where we are. Often enough to survive a crash. */
const REPORT_EVERY_MS = 10_000;

/**
 * The student's video.
 *
 * Resume, watch time and completion all run through the server: the browser
 * reports where it is and how much it actually watched since the last report,
 * and the API decides whether that crosses the completion threshold. Seeking
 * to the end therefore finishes nothing, which is the point.
 */
export function VideoPlayer({
  contentItemId, src, poster, captionsUrl, title, durationSeconds,
  resumeAt = 0, completed = false, allowDownload = false, onCompleted,
}: {
  contentItemId: string;
  src: string;
  poster?: string | null;
  captionsUrl?: string | null;
  title: string;
  durationSeconds?: number | null;
  resumeAt?: number;
  completed?: boolean;
  allowDownload?: boolean;
  onCompleted?: (lessonCompleted: boolean) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState(1);
  const [isDone, setIsDone] = useState(completed);
  const [resumed, setResumed] = useState(false);

  // Watched time is accumulated from timeupdate while playing, so a scrub
  // forward adds nothing to it.
  const watched = useRef(0);
  const lastTime = useRef(0);
  const reported = useRef(0);

  const report = useCallback(async (force = false) => {
    const el = video.current;
    if (!el) return;
    const delta = Math.round(watched.current - reported.current);
    if (!force && delta < 1) return;
    reported.current = watched.current;
    try {
      const res = await learningApi.saveContentProgress(contentItemId, {
        positionSec: Math.round(el.currentTime),
        watchedDeltaSec: Math.max(0, delta),
        durationSeconds: Number.isFinite(el.duration) ? Math.round(el.duration) : undefined,
      });
      if (res.completed && !isDone) {
        setIsDone(true);
        onCompleted?.(res.lessonCompleted);
      }
    } catch {
      // A dropped progress ping is not worth interrupting the lesson for; the
      // next one carries the same position.
    }
  }, [contentItemId, isDone, onCompleted]);

  // Report on a timer while playing, and once more on the way out.
  useEffect(() => {
    const id = window.setInterval(() => { if (!video.current?.paused) void report(); }, REPORT_EVERY_MS);
    return () => {
      window.clearInterval(id);
      void report(true);
    };
  }, [report]);

  return (
    <div className="space-y-2">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- a track is added below when the teacher supplied one */}
      <video
        ref={video}
        src={src}
        poster={poster ?? undefined}
        controls
        controlsList={allowDownload ? undefined : "nodownload"}
        preload="metadata"
        className="w-full rounded-2xl bg-black"
        aria-label={`${title} video`}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          // Pick up where they left off, unless they were basically at the end.
          if (!resumed && resumeAt > 2 && resumeAt < el.duration - 5) el.currentTime = resumeAt;
          setResumed(true);
          lastTime.current = el.currentTime;
          el.playbackRate = speed;
        }}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          const step = t - lastTime.current;
          // Only count forward movement at roughly real speed; anything larger
          // is a seek, not viewing.
          if (step > 0 && step < 2) watched.current += step;
          lastTime.current = t;
        }}
        onSeeked={(e) => { lastTime.current = e.currentTarget.currentTime; }}
        onPause={() => void report(true)}
        onEnded={() => void report(true)}
      >
        {captionsUrl && <track kind="captions" src={captionsUrl} label="Captions" default />}
      </video>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Gauge size={14} className="text-muted" aria-hidden />
          <label htmlFor={`speed-${contentItemId}`} className="text-xs text-muted">Speed</label>
          <select
            id={`speed-${contentItemId}`}
            className="input w-auto py-1 text-xs"
            value={speed}
            onChange={(e) => {
              const v = Number(e.target.value);
              setSpeed(v);
              if (video.current) video.current.playbackRate = v;
            }}
          >
            {SPEEDS.map((s) => <option key={s} value={s}>{s}x</option>)}
          </select>
        </div>

        {durationSeconds ? <span className="text-xs text-muted">{formatDuration(durationSeconds)}</span> : null}

        <span className={cn("ml-auto inline-flex items-center gap-1 text-xs font-medium", isDone ? "text-success-700" : "text-muted")}>
          {isDone ? <><CheckCircle2 size={13} aria-hidden /> Completed</> : "Keep watching to complete"}
        </span>
      </div>
    </div>
  );
}
