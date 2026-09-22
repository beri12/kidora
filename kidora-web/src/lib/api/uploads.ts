import { API_BASE_URL, getAuthToken } from "./client";

export interface UploadedFile {
  id: string;
  url: string;
  name: string;
  sizeBytes: number;
  kind: "video" | "image" | "document" | "other";
  mimeType: string;
  /** The content block type this file naturally becomes. */
  contentType: "VIDEO" | "AUDIO" | "IMAGE" | "DOCUMENT" | "RESOURCE";
}

/**
 * Turn a failed upload response into something a teacher can act on.
 *
 * The API's own 404 body says "Cannot POST /api/uploads", and echoing that
 * into the drop zone told nobody anything — it looks like the upload is
 * broken when the real meaning is that the API answering does not have the
 * route, which in practice means it is running an older build. So the status
 * is translated here, and the URL that failed is named, because that is the
 * one fact needed to tell a stale API from a misconfigured base URL.
 */
export function uploadErrorMessage(status: number, responseText: string, url: string): string {
  let body: { error?: { message?: string | string[] }; message?: string } | null = null;
  try { body = JSON.parse(responseText); } catch { /* storage errors are XML, or empty */ }
  const raw = body?.error?.message ?? body?.message;
  const server = Array.isArray(raw) ? raw[0] : raw;

  if (status === 404) {
    const origin = (() => { try { return new URL(url).origin; } catch { return url; } })();
    return `The API at ${origin} has no upload endpoint (404 on POST ${url}). `
      + 'It is almost certainly running an older build: stop it, run "npm run build" in kidora-api, and start it again. '
      + 'Run "node scripts/doctor.js" to confirm.';
  }
  if (status === 401) return 'Your session has expired. Sign in again and retry the upload.';
  if (status === 403) return server || "You don't have permission to upload to this course.";
  if (status === 413) return server || 'That file is larger than the server allows.';
  if (status === 0) return `Could not reach the API at ${url}. Check that it is running.`;
  if (status >= 500) return server || `The server failed while storing the file (${status}).`;
  return server || `Upload failed (${status}).`;
}

/**
 * Upload one file with progress.
 *
 * XMLHttpRequest rather than fetch: fetch still cannot report upload progress
 * in any browser, and a teacher sending a 200 MB video needs to see that
 * something is happening.
 */
export function uploadFile(
  file: File,
  opts: { onProgress?: (percent: number) => void; signal?: AbortSignal } = {},
): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);

    const url = `${API_BASE_URL}/uploads`;
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    const token = getAuthToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadedFile);
          return;
        } catch {
          reject(new Error('The server accepted the file but sent back something unreadable.'));
          return;
        }
      }
      // eslint-disable-next-line no-console
      console.error(`Upload failed: POST ${url} -> ${xhr.status}`, xhr.responseText.slice(0, 300));
      reject(new Error(uploadErrorMessage(xhr.status, xhr.responseText, url)));
    });

    xhr.addEventListener("error", () => reject(new Error(uploadErrorMessage(0, "", url))));
    xhr.addEventListener("abort", () => reject(new DOMException("Upload cancelled", "AbortError")));

    opts.signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(form);
  });
}

/** What the file picker should accept, per kind of slot. */
export const ACCEPT = {
  video: "video/mp4,video/webm,video/ogg,video/quicktime",
  audio: "audio/mpeg,audio/wav,audio/ogg,audio/aac,audio/mp4",
  image: "image/png,image/jpeg,image/gif,image/webp,image/svg+xml",
  document: ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.md",
  captions: ".vtt,.srt,text/vtt",
  any: "video/*,audio/*,image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.md,.vtt,.srt",
} as const;

/** Largest accepted size per kind, mirroring the server. Shown before a doomed upload starts. */
export const MAX_MB = { video: 500, audio: 100, image: 10, document: 50, captions: 2 } as const;

/* -------------------------------------------------------------- video --- */

export type VideoProcessingStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";
export type VideoUploadStatus = "PENDING" | "UPLOADING" | "COMPLETED" | "FAILED" | "ABORTED";

export interface VideoAsset {
  id: string;
  contentItemId: string;
  url: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  fileSizeBytes: number;
  mimeType: string;
  uploadStatus: VideoUploadStatus;
  processingStatus: VideoProcessingStatus;
  error: string | null;
  captionsUrl: string | null;
  allowDownload: boolean;
}

export interface UploadTicket {
  sessionId: string;
  storageKey: string;
  fileName: string;
  fileSizeBytes: number;
  status: VideoUploadStatus;
  expiresAt: string;
  /** True when the same file was already being uploaded. */
  resumed: boolean;
  uploadUrl: string;
  headers: Record<string, string>;
  /** True when the bytes go straight to the bucket, bypassing the API. */
  direct: boolean;
}

/** What the video picker accepts. The server enforces the same list. */
export const VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm";
export const VIDEO_MIMES = ["video/mp4", "video/quicktime", "video/webm"];

async function json<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const nested = body as { error?: { message?: string | string[] }; message?: string } | null;
    const raw = nested?.error?.message ?? nested?.message;
    const message = Array.isArray(raw) ? raw[0] : raw;
    throw new Error(message || `Request failed (${res.status}).`);
  }
  return body as T;
}

export const videoApi = {
  presign: (body: { courseId: string; lessonId?: string; fileName: string; fileSizeBytes: number; mimeType: string }) =>
    json<UploadTicket>("/uploads/presign", { method: "POST", body: JSON.stringify(body) }),
  complete: (body: { sessionId: string; contentItemId?: string; title?: string; durationSeconds?: number }) =>
    json<{ contentItem: { id: string; title: string; order: number }; video: VideoAsset }>(
      "/uploads/complete", { method: "POST", body: JSON.stringify(body) },
    ),
  abort: (sessionId: string) => json<{ ok: true }>(`/uploads/sessions/${sessionId}/abort`, { method: "POST" }),
  status: (videoId: string) => json<VideoAsset>(`/uploads/videos/${videoId}/status`),
  update: (videoId: string, body: Record<string, unknown>) =>
    json<VideoAsset>(`/uploads/videos/${videoId}`, { method: "PATCH", body: JSON.stringify(body) }),
  retry: (videoId: string) => json<VideoAsset>(`/uploads/videos/${videoId}/retry`, { method: "POST" }),
  remove: (videoId: string) => json<{ ok: true; contentItemId: string }>(`/uploads/videos/${videoId}`, { method: "DELETE" }),
};

export interface TransferProgress {
  loaded: number;
  total: number;
  percent: number;
  /** Bytes per second over the last few samples, or null too early to tell. */
  bytesPerSecond: number | null;
  /** Seconds left at the current rate, or null. */
  etaSeconds: number | null;
}

/**
 * Read a video's real duration in the browser, so the item has a length before
 * the server has looked at the file. The server treats it as a hint and clamps
 * it — this is a convenience, not a source of truth.
 */
export function readVideoDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement("video");
    const done = (v?: number) => { URL.revokeObjectURL(url); resolve(v); };
    el.preload = "metadata";
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? Math.round(el.duration) : undefined);
    el.onerror = () => done(undefined);
    el.src = url;
  });
}

/**
 * PUT the bytes wherever the ticket says, reporting progress, speed and ETA.
 *
 * XHR again, for the same reason as above: fetch cannot report upload
 * progress. The Authorization header is attached only when the destination is
 * our own API — a presigned bucket URL must never carry our JWT.
 */
export function putBytes(
  ticket: UploadTicket,
  file: File,
  opts: { onProgress?: (p: TransferProgress) => void; signal?: AbortSignal } = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(ticket.direct ? "PUT" : "PUT", ticket.uploadUrl);

    for (const [k, v] of Object.entries(ticket.headers)) xhr.setRequestHeader(k, v);
    if (!ticket.direct) {
      const token = getAuthToken();
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    const started = Date.now();
    let lastAt = started;
    let lastLoaded = 0;
    let rate: number | null = null;

    xhr.upload.addEventListener("progress", (e) => {
      if (!e.lengthComputable) return;
      const now = Date.now();
      const dt = (now - lastAt) / 1000;
      if (dt > 0.4) {
        const sample = (e.loaded - lastLoaded) / dt;
        // Smoothed, or the number jitters too much to read.
        rate = rate === null ? sample : rate * 0.7 + sample * 0.3;
        lastAt = now;
        lastLoaded = e.loaded;
      }
      const remaining = e.total - e.loaded;
      opts.onProgress?.({
        loaded: e.loaded,
        total: e.total,
        percent: Math.round((e.loaded / e.total) * 100),
        bytesPerSecond: rate,
        etaSeconds: rate && rate > 0 ? Math.round(remaining / rate) : null,
      });
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) { resolve(); return; }
      // eslint-disable-next-line no-console
      console.error(`Video upload failed: PUT ${ticket.uploadUrl} -> ${xhr.status}`, xhr.responseText.slice(0, 300));
      reject(new Error(uploadErrorMessage(xhr.status, xhr.responseText, ticket.uploadUrl)));
    });
    xhr.addEventListener("error", () => reject(new Error(uploadErrorMessage(0, "", ticket.uploadUrl))));
    xhr.addEventListener("timeout", () => reject(new Error("The upload timed out. Please try again.")));
    xhr.addEventListener("abort", () => reject(new DOMException("Upload cancelled", "AbortError")));
    opts.signal?.addEventListener("abort", () => xhr.abort());

    xhr.send(file);
  });
}

/** Human-readable byte count. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

/** mm:ss, or h:mm:ss past an hour. */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (!totalSeconds || totalSeconds < 0) return "--:--";
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}
