import { StyleSheet, View } from 'react-native';

import { useT } from '@/hooks/useT';
import { toApiError } from '@/lib/errors';
import type { TranslationKey } from '@/i18n';
import { spacing } from '@/theme';

import { Button } from './Button';
import { SkeletonCard } from './Skeleton';
import { Text } from './Text';

export interface EmptyStateProps {
  emoji?: string;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ emoji = '🌱', title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.wrap} accessible accessibilityRole="summary">
      <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no">
        {emoji}
      </Text>
      <Text variant="h3" align="center">
        {title}
      </Text>
      {body ? (
        <Text color="textMuted" align="center">
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" /> : null}
    </View>
  );
}

export interface ErrorStateProps {
  error?: unknown;
  onRetry?: () => void;
  titleKey?: TranslationKey;
}

/** Friendly, localised error — never shows backend internals. */
export function ErrorState({ error, onRetry, titleKey = 'errors.generic' }: ErrorStateProps) {
  const { t } = useT();
  const e = toApiError(error);
  // 4xx server text is user-correctable (e.g. "Daily limit reached"); otherwise use our copy.
  const body = e.serverMessage && e.status && e.status < 500 && e.kind !== 'unauthorized' ? e.serverMessage : t(e.messageKey as TranslationKey);
  const emoji = e.kind === 'offline' || e.kind === 'network' ? '📡' : '🙈';
  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no">
        {emoji}
      </Text>
      <Text variant="h3" align="center">
        {t(titleKey)}
      </Text>
      <Text color="textMuted" align="center">
        {body}
      </Text>
      {onRetry ? <Button label={t('common.retry')} onPress={onRetry} icon="refresh" /> : null}
    </View>
  );
}

export function LoadingState({ cards = 3 }: { cards?: number }) {
  return (
    <View style={{ gap: spacing.lg }} accessibilityLabel="Loading" accessibilityState={{ busy: true }}>
      {Array.from({ length: cards }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing['2xl'] },
  emoji: { fontSize: 48, lineHeight: 60 },
});
