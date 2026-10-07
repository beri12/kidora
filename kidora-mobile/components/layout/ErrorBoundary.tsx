import type { ErrorBoundaryProps } from 'expo-router';
import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { t } from '@/i18n';
import { logger } from '@/lib/logger';
import { colors, spacing } from '@/theme';

/** Route-level crash screen: friendly copy, no stack traces in release builds. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  logger.error('render error', { message: error.message });
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing['2xl'], backgroundColor: colors.background }}>
      <Text style={{ fontSize: 56, lineHeight: 68 }}>🙈</Text>
      <Text variant="h2" align="center">
        {t('errors.generic')}
      </Text>
      <Text color="textMuted" align="center">
        {t('errors.unknown')}
      </Text>
      {__DEV__ ? (
        <Text variant="caption" color="danger" align="center">
          {error.message}
        </Text>
      ) : null}
      <Button label={t('common.retry')} onPress={() => void retry()} icon="refresh" />
    </View>
  );
}
