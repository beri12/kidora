"use client";
import { useRef, useState } from "react";
import { FileText, Film, Image as ImageIcon, Music, Upload, X } from "lucide-react";
import { cn } from "@/components/dashboard";
import { ACCEPT, MAX_MB, uploadFile, type UploadedFile } from "@/lib/api/uploads";
import { Field } from "./parts";

type Slot = keyof typeof ACCEPT;

const ICONS: Record<string, typeof Upload> = {
  video: Film, audio: Music, image: ImageIcon, document: FileText, captions: FileText, any: Upload,
};

/**
 * Pick a file, upload it, get a URL back.
 *
 * Drag-and-drop and a button, because a drop zone alone is unusable on a
 * phone and unreachable from a keyboard. Progress comes from the real request,
 * not a timer.
 */
export function FileUpload({
  label, slot, value, onUploaded, onClear, hint, required,
}: {
  label: string;
  slot: Slot;
  value?: string | null;
  onUploaded: (file: UploadedFile) => void;
  onClear?: () => void;
  hint?: string;
  required?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const Icon = ICONS[slot] ?? Upload;
  const limit = slot === "any" ? 500 : MAX_MB[slot as keyof typeof MAX_MB];

  const send = async (file: File) => {
    setError(null);
    // Check the size here too: it saves a doomed 400 MB upload over a slow link.
    if (file.size > limit * 1024 * 1024) {
      setError(`That file is ${Math.round(file.size / 1024 / 1024)} MB. The limit is ${limit} MB.`);
      return;
    }
    setProgress(0);
    setName(file.name);
    try {
      const uploaded = await uploadFile(file, { onProgress: setProgress });
      onUploaded(uploaded);
      setProgress(null);
    } catch (e) {
      setError((e as Error).message);
      setProgress(null);
    }
  };

  const busy = progress !== null;

  return (
    <Field label={label} hint={hint} error={error ?? undefined} required={required}>
      <input
        ref={input}
        type="file"
        accept={ACCEPT[slot]}
        className="sr-only"
        aria-label={label}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void send(f); e.target.value = ""; }}
      />

      {value && !busy ? (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
          <Icon size={16} className="shrink-0 text-brand-600" aria-hidden />
          <a href={value} target="_blank" rel="noreferrer" className="focus-ring min-w-0 flex-1 truncate rounded text-sm hover:underline">
            {name ?? value.split("/").pop()}
          </a>
          <button type="button" className="btn-ghost text-xs" onClick={() => input.current?.click()}>Replace</button>
          {onClear && (
            <button type="button" className="focus-ring rounded p-1 text-slate-400 hover:text-danger-600" onClick={onClear} aria-label={`Remove ${label}`}>
              <X size={14} aria-hidden />
            </button>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void send(f);
          }}
          className={cn(
            "rounded-2xl border-2 border-dashed p-4 text-center transition-colors",
            dragging ? "border-brand-400 bg-brand-50/60" : "border-slate-200",
          )}
        >
          {busy ? (
            <div>
              <p className="text-sm font-medium">{name}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-brand-500 transition-[width]"
                  style={{ width: `${progress}%` }}
                  role="progressbar"
                  aria-valuenow={progress ?? 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Uploading ${name}`}
                />
              </div>
              <p className="mt-1 text-xs text-muted" aria-live="polite">
                {progress === 100 ? "Finishing…" : `${progress}% uploaded`}
              </p>
            </div>
          ) : (
            <>
              <Icon size={22} className="mx-auto text-slate-400" aria-hidden />
              <button type="button" className="btn-primary mt-2" onClick={() => input.current?.click()}>
                <Upload size={15} aria-hidden /> Choose a file
              </button>
              <p className="mt-1.5 text-xs text-muted">
                or drop it here · up to {limit} MB
              </p>
            </>
          )}
        </div>
      )}
    </Field>
  );
}

/**
 * A compact upload button for places that already have their own layout —
 * a row in the content editor, say.
 */
export function UploadButton({
  slot, onUploaded, label = "Upload", className,
}: { slot: Slot; onUploaded: (f: UploadedFile) => void; label?: string; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <span className={cn("inline-flex flex-col", className)}>
      <input
        ref={input}
        type="file"
        accept={ACCEPT[slot]}
        className="sr-only"
        aria-label={label}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setError(null);
          setProgress(0);
          try {
            onUploaded(await uploadFile(f, { onProgress: setProgress }));
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setProgress(null);
          }
        }}
      />
      <button
        type="button"
        className="btn-ghost text-xs"
        onClick={() => input.current?.click()}
        disabled={progress !== null}
      >
        <Upload size={13} aria-hidden />
        {progress !== null ? `${progress}%` : label}
      </button>
      {error && <span className="mt-1 text-xs text-danger-600" role="alert">{error}</span>}
    </span>
  );
}
