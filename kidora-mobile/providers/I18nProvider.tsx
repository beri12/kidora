import { useEffect, type PropsWithChildren } from 'react';

import { detectDeviceLocale, setLocale } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';

/** Applies the chosen (or device) language. */
export function I18nProvider({ children }: PropsWithChildren) {
  const preferred = useSettingsStore((s) => s.locale);
  useEffect(() => {
    setLocale(preferred ?? detectDeviceLocale());
  }, [preferred]);
  return <>{children}</>;
}
