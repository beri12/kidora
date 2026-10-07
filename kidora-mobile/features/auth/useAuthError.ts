import { useT } from '@/hooks/useT';
import type { TranslationKey } from '@/i18n';
import { isApiError } from '@/lib/errors';
import { UnsupportedRoleError } from '@/services/auth.service';

/** Friendly message for an auth failure (never echoes credentials). */
export function useAuthErrorMessage() {
  const { t } = useT();
  return (e: unknown): string => {
    if (e instanceof UnsupportedRoleError) return t('errors.unsupportedRole');
    if (isApiError(e)) {
      if ((e.kind === 'unauthorized' || e.kind === 'forbidden' || e.kind === 'validation' || e.kind === 'conflict' || e.kind === 'rate_limited') && e.serverMessage) {
        return e.serverMessage;
      }
      return t(e.messageKey as TranslationKey);
    }
    return t('errors.unknown');
  };
}
