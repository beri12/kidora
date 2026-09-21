import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

export type UploadKind = 'image' | 'video' | 'file' | 'subtitle';

const MB = 1024 * 1024;

/** Ceiling for video, shared with the storage config's UPLOAD_MAX_BYTES. */
export const maxVideoBytes = () => Number(process.env.UPLOAD_MAX_BYTES ?? 500 * MB);

interface Policy {
  /** Allowed file extensions, lower-case, including the dot. */
  extensions: string[];
  /** Allowed MIME types as reported by the browser. */
  mimeTypes: string[];
  /**
   * Some formats have no agreed MIME type and browsers send
   * `application/octet-stream` or `text/plain` for them. Where that is true,
   * the extension is the thing we trust.
   */
  allowGenericMime?: boolean;
  maxBytes: number;
  label: string;
}

/**
 * What each upload route accepts.
 *
 * The lists are allow-lists, never deny-lists, and SVG is deliberately absent
 * from `image`: an SVG is a script container, and uploaded files are served
 * from the API's own origin, so accepting one would be stored XSS. The same
 * reasoning keeps .html, .htm and .xml out of `file`.
 */
export const POLICIES: Record<UploadKind, Policy> = {
  image: {
    label: 'an image',
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],
    maxBytes: 10 * MB,
  },
  video: {
    label: 'a video',
    extensions: ['.mp4', '.webm', '.mov', '.m4v', '.mkv'],
    mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/x-matroska'],
    maxBytes: maxVideoBytes(),
  },
  file: {
    label: 'a document',
    extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.zip'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/zip',
      'application/x-zip-compressed',
    ],
    maxBytes: 50 * MB,
  },
  subtitle: {
    label: 'a subtitle file',
    extensions: ['.vtt', '.srt'],
    // .srt in particular arrives as octet-stream or text/plain from most browsers.
    mimeTypes: ['text/vtt', 'application/x-subrip', 'text/plain'],
    allowGenericMime: true,
    maxBytes: 2 * MB,
  },
};

/**
 * Accepts a file only when BOTH its extension and its MIME type are on the
 * kind's allow-list. Checking only the MIME type would let `evil.html` through
 * under a claimed `image/png`, and the stored file keeps its extension.
 */
export function assertAllowed(kind: UploadKind, file: { originalname: string; mimetype: string }) {
  const policy = POLICIES[kind];
  const ext = extname(file.originalname || '').toLowerCase();

  if (!ext || !policy.extensions.includes(ext)) {
    throw new BadRequestException(
      `That file has to be ${policy.label} (${policy.extensions.join(', ')})`,
    );
  }

  const mime = (file.mimetype || '').toLowerCase().split(';')[0].trim();
  const genericOk = policy.allowGenericMime && (!mime || mime === 'application/octet-stream');
  if (!policy.mimeTypes.includes(mime) && !genericOk) {
    throw new BadRequestException(`That file has to be ${policy.label}`);
  }
}

/**
 * Strips directories and control characters from the name the browser sent.
 * The stored filename is a UUID either way, but this name is echoed back and
 * may end up rendered, so it should not carry a path or a newline.
 */
export function safeName(originalname: string): string {
  const base = (originalname || 'file').replace(/\\/g, '/').split('/').pop() || 'file';
  // eslint-disable-next-line no-control-regex
  return base.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 200) || 'file';
}

/**
 * Works out which kind a file is, for the generic upload route that does not
 * say up front. Returns null when it matches none of them, so the caller can
 * refuse it rather than guess.
 */
export function detectKind(file: { originalname: string; mimetype: string }): UploadKind | null {
  for (const kind of ['image', 'video', 'file', 'subtitle'] as UploadKind[]) {
    try {
      assertAllowed(kind, file);
      return kind;
    } catch {
      // Not this kind; try the next.
    }
  }
  return null;
}

/** The largest ceiling of any kind, used by the generic route's interceptor. */
export const maxAnyBytes = () =>
  Math.max(...(Object.values(POLICIES).map((p) => p.maxBytes)));
