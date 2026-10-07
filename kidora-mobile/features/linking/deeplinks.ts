import { resolveIslandKey } from '@/features/game/islands';

/**
 * Normalise incoming deep links (kidora://… and https://justkidora.com/app/…)
 * to app routes. Groups are transparent in Expo Router URLs, so most paths
 * already match; this handles friendly aliases.
 *
 *   kidora://lesson/123          → /lesson/123
 *   kidora://island/math         → /island/MATH_ISLAND
 *   kidora://achievement/456     → /achievements?highlight=456
 *   https://justkidora.com/app/lesson/123 → /lesson/123
 */
export function rewriteIncomingPath(path: string): string {
  let p = path;
  // Universal link prefix.
  p = p.replace(/^https?:\/\/(www\.)?justkidora\.com/i, '');
  p = p.replace(/^kidora:\/\//i, '/');
  if (p.startsWith('/app/')) p = p.slice(4);
  if (!p.startsWith('/')) p = `/${p}`;

  const [pathname = '/', query = ''] = p.split('?');
  const parts = pathname.split('/').filter(Boolean);
  const head = parts[0];
  const id = parts[1];
  const qs = query ? `?${query}` : '';

  if (head === 'island' && id) return `/island/${encodeURIComponent(resolveIslandKey(decodeURIComponent(id)))}${qs}`;
  if (head === 'achievement' && id) return `/achievements?highlight=${encodeURIComponent(decodeURIComponent(id))}`;
  return `${pathname}${qs}`;
}
