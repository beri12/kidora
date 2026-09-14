/**
 * Which features this build carries, served from /api and /api/health.
 *
 * A route that 404s because the running process is an older build is
 * indistinguishable, from the browser, from one that 404s for any other
 * reason. Listing the features makes it one request to tell apart.
 *
 * Add a name here in the same commit that adds endpoints the frontend starts
 * depending on.
 */
export const FEATURES = [
  'auth.sms-otp',
  'lms.authoring',
  'lms.learning',
  'lms.studio',
  'uploads.file',
  'uploads.video-presign',
  'uploads.video-processing',
  'learning.content-progress',
] as const;
