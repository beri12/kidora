import { router } from 'expo-router';
import { View } from 'react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { Icon, ListRow, Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { BUNDLED_LOCALES, detectDeviceLocale, type TranslationKey } from '@/i18n';
import { useSettingsStore } from '@/store/settingsStore';
import { spacing } from '@/theme';

/**
 * Language picker. Bundled locales today; backend-delivered bundles
 * (API GAP #9) appear here automatically via availableLocales().
 */
export default function LanguageModal() {
  const { t, locale } = useT();
  const preferred = useSettingsStore((s) => s.locale);
  const set = useSettingsStore((s) => s.set);
  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title={t('languages.title')} back />
      <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
        <ListRow
          title={`📱 ${detectDeviceLocale().toUpperCase()}`}
          subtitle="Device"
          right={preferred === null ? <Icon name="checkmark-circle" color="primary" /> : undefined}
          onPress={() => {
            set({ locale: null });
            router.back();
          }}
          chevron={false}
        />
        {BUNDLED_LOCALES.map((code) => (
          <ListRow
            key={code}
            title={t(`languages.${code}` as TranslationKey)}
            right={preferred === code ? <Icon name="checkmark-circle" color="primary" /> : undefined}
            onPress={() => {
              set({ locale: code });
              router.back();
            }}
            chevron={false}
          />
        ))}
      </View>
      <Text variant="tiny" color="textSubtle">{`Active: ${locale}`}</Text>
    </Screen>
  );
}
