import type { FieldError } from 'react-hook-form';

import { useT } from '@/hooks/useT';
import type { TranslationKey } from '@/i18n';

/** Translate a Zod/RHF error message (an i18n key) for display. */
export function useFieldError() {
  const { t } = useT();
  return (e: FieldError | undefined): string | undefined => (e?.message ? t(e.message as TranslationKey) : undefined);
}
