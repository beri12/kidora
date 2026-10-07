import { useCallback, useSyncExternalStore } from 'react';

import { getLocale, subscribeLocale, translate, type TranslationKey } from '@/i18n';
import type { TranslationParams } from '@/i18n/types';

/** Re-renders on language change; returns a stable `t` per locale. */
export function useT(): { t: (key: TranslationKey, params?: TranslationParams) => string; locale: string } {
  const locale = useSyncExternalStore(subscribeLocale, getLocale, getLocale);
  const t = useCallback((key: TranslationKey, params?: TranslationParams) => translate(key, params, locale), [locale]);
  return { t, locale };
}
