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

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/uploads`);

    const token = getAuthToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener("load", () => {
      let body: unknown = null;
      try { body = JSON.parse(xhr.responseText); } catch { /* handled below */ }
      if (xhr.status >= 200 && xhr.status < 300 && body) {
        resolve(body as UploadedFile);
        return;
      }
      // The API nests its message; fall back to something a teacher can act on.
      const nested = (body as { error?: { message?: string | string[] }; message?: string } | null);
      const raw = nested?.error?.message ?? nested?.message;
      const message = Array.isArray(raw) ? raw[0] : raw;
      reject(new Error(message || `Upload failed (${xhr.status}).`));
    });

    xhr.addEventListener("error", () => reject(new Error("Upload failed. Check your connection and try again.")));
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
