import * as WebBrowser from 'expo-web-browser';

import { env } from '@/config/env';

/**
 * External-link policy for a children's app: only Kidora's own HTTPS hosts
 * open, and they open in an in-app browser (no address bar to wander off
 * from). Everything else is blocked.
 */
const ALLOWED_HOSTS = [env.webHost, `www.${env.webHost}`, `api.${env.webHost}`];

export function isSafeUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return false;
    return ALLOWED_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith(`.${env.webHost}`));
  } catch {
    return false;
  }
}

export async function openSafeUrl(raw: string): Promise<boolean> {
  if (!isSafeUrl(raw)) return false;
  await WebBrowser.openBrowserAsync(raw, { showTitle: true, enableBarCollapsing: true });
  return true;
}
