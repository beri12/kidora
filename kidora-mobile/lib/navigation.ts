import { router, type Href } from 'expo-router';

/**
 * Navigation helpers. Paths are always group-qualified (e.g. "/(teacher)/class/1")
 * because several role groups share screen names like "dashboard".
 */
export function go(path: string): void {
  router.push(path as Href);
}

export function replace(path: string): void {
  router.replace(path as Href);
}

export function lessonHref(lessonId: string, courseId?: string): string {
  return `/(student)/lesson/${encodeURIComponent(lessonId)}${courseId ? `?courseId=${encodeURIComponent(courseId)}` : ''}`;
}
