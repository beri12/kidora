import { rewriteIncomingPath } from '@/features/linking/deeplinks';

/** Rewrites system deep links before Expo Router resolves them. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return rewriteIncomingPath(path);
  } catch {
    return '/';
  }
}
