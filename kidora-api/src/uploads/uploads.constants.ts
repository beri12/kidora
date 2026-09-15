// Shared MIME allow-lists for the upload endpoints.
//
// These are intentionally allow-lists rather than a `startsWith('image/')`
// check: the files land in a publicly served directory (see the
// useStaticAssets call in main.ts), so anything the browser might execute
// in the site's origin must not be accepted. That rules out SVG in
// particular — it is an image to a `fileFilter` that only tests the
// `image/` prefix, but it can carry <script>, which would run as
// same-origin JavaScript when opened directly from /uploads/.

export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;

export const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-matroska',
] as const;

export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
] as const;

export const ALL_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
  ...DOCUMENT_MIME_TYPES,
] as const;

// Images (thumbnails, banners, avatars) are capped well below the video
// limit so a stray large photo cannot occupy a 500MB buffer.
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10MB
export const DOCUMENT_MAX_BYTES = 25 * 1024 * 1024; // 25MB
