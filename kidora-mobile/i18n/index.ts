import { getLocales } from 'expo-localization';

import { am } from './locales/am';
import { en, type TranslationDictionary } from './locales/en';
import type { DeepPartial, LeafPaths, TranslationParams } from './types';

export type TranslationKey = LeafPaths<typeof en>;

/**
 * Translation abstraction.
 *
 * Bundled locales ship in the app (en, am). Further languages arrive from
 * the backend at runtime via `registerBundle` (API GAP #9: GET /i18n/:locale)
 * and are cached by the settings layer, so adding a language never needs an
 * app release. Lookups fall back: active locale → English → the key itself.
 */
type Bundle = DeepPartial<TranslationDictionary>;

const bundles = new Map<string, Bundle>([
  ['en', en],
  ['am', am],
]);

export const BUNDLED_LOCALES = ['en', 'am'] as const;
export type BundledLocale = (typeof BUNDLED_LOCALES)[number];

/** Languages whose script is written right-to-left (future: ar, he, ...). */
const RTL = new Set(['ar', 'he', 'fa', 'ur']);

let activeLocale = 'en';
const listeners = new Set<(locale: string) => void>();

function lookup(bundle: Bundle | undefined, key: string): string | undefined {
  if (!bundle) return undefined;
  let node: unknown = bundle;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

export function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) =>
    params[name] === undefined ? match : String(params[name]),
  );
}

export function translate(key: TranslationKey, params?: TranslationParams, locale = activeLocale): string {
  const base = locale.split('-')[0] ?? 'en';
  const raw = lookup(bundles.get(locale), key) ?? lookup(bundles.get(base), key) ?? lookup(en, key) ?? key;
  return interpolate(raw, params);
}

/** Non-React access (services, notification copy). Components use useT(). */
export const t = (key: TranslationKey, params?: TranslationParams): string => translate(key, params);

export function registerBundle(locale: string, bundle: Bundle): void {
  bundles.set(locale, bundle);
}

export function availableLocales(): string[] {
  return [...bundles.keys()];
}

export function getLocale(): string {
  return activeLocale;
}

export function setLocale(locale: string): void {
  if (locale === activeLocale) return;
  activeLocale = locale;
  listeners.forEach((l) => l(locale));
}

export function subscribeLocale(listener: (locale: string) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isRtl(locale = activeLocale): boolean {
  return RTL.has(locale.split('-')[0] ?? '');
}

/** Best bundled match for the device's preferred languages. */
export function detectDeviceLocale(): string {
  try {
    for (const l of getLocales()) {
      const code = l.languageCode ?? '';
      if (bundles.has(code)) return code;
    }
  } catch {
    // expo-localization unavailable (tests) — fall through.
  }
  return 'en';
}
