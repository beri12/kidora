"use client";
import { useRef, useState } from "react";
import { ImageIcon, Upload, X } from "lucide-react";
import { cn } from "@/components/dashboard";
import { ACCEPT, MAX_MB, uploadFile } from "@/lib/api/uploads";

/**
 * The course thumbnail: preview on the left, instructions and a Choose File
 * button on the right, the whole panel a drop target.
 *
 * Its own component rather than the generic FileUpload because that renders a
 * dashed box of its own, which nested inside this panel read as two upload
 * areas. The upload itself is the same call, so progress is still the real
 * request rather than a timer.
 */
export function ThumbnailPicker({
  value, onUploaded, onClear,
}: {
  value?: string | null;
  onUploaded: (url: string, name: string) => void;
  onClear: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [name, setName] = useState<string | null>(null);

  const send = async (file: File) => {
    setError(null);
    if (file.size > MAX_MB.image * 1024 * 1024) {
      setError(`That image is ${Math.round(file.size / 1024 / 1024)} MB. The limit is ${MAX_MB.image} MB.`);
      return;
    }
    setProgress(0);
    setName(file.name);
    try {
      const uploaded = await uploadFile(file, { onProgress: setProgress });
      onUploaded(uploaded.url, uploaded.name);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  };

  const busy = progress !== null;

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-ink">Course Thumbnail</p>
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
          "grid gap-4 rounded-2xl border border-dashed p-4 transition-colors sm:grid-cols-[200px_minmax(0,1fr)] sm:items-center",
          dragging ? "border-brand-500 bg-brand-50/60" : "border-slate-200 bg-white",
        )}
      >
        <input
          ref={input} type="file" accept={ACCEPT.image} className="sr-only"
          aria-label="Course thumbnail file"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void send(f); e.target.value = ""; }}
        />

        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="aspect-[16/9] w-full rounded-xl border border-slate-100 object-cover" />
        ) : (
          <div className="grid aspect-[16/9] w-full place-items-center rounded-xl bg-brand-50 text-brand-300">
            <ImageIcon size={30} aria-hidden />
          </div>
        )}

        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Upload course image</p>
          <p className="mt-0.5 text-xs text-muted">Drag and drop or click to upload</p>
          <p className="text-xs text-muted">(Recommended size: 1280 × 720)</p>

          {busy ? (
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-brand-600 transition-[width]"
                  style={{ width: `${progress}%` }}
                  role="progressbar" aria-valuenow={progress ?? 0} aria-valuemin={0} aria-valuemax={100}
                  aria-label={`Uploading ${name}`}
                />
              </div>
              <p className="mt-1 text-xs text-muted" aria-live="polite">
                {progress === 100 ? "Finishing…" : `${progress}% uploaded`}
              </p>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" className="btn-secondary" onClick={() => input.current?.click()}>
                <Upload size={15} aria-hidden /> Choose File
              </button>
              {value && (
                <button
                  type="button" className="btn-ghost text-xs" onClick={onClear}
                  aria-label="Remove the course thumbnail"
                >
                  <X size={14} aria-hidden /> Remove
                </button>
              )}
              {value && name && <span className="truncate text-xs text-muted">{name}</span>}
            </div>
          )}

          {error && <p className="mt-2 text-xs text-danger-600" role="alert">{error}</p>}
        </div>
      </div>
    </div>
  );
}
