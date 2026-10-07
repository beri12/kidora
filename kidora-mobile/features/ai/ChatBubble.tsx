import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { colors, radius, spacing } from '@/theme';
import type { AIMessage } from '@/types';

export interface ChatBubbleProps {
  message: AIMessage;
  onReport?: (m: AIMessage) => void;
  onRetry?: () => void;
}

/** AI text is rendered as plain text only: no links, no HTML, no markdown execution. */
function ChatBubbleBase({ message, onReport, onRetry }: ChatBubbleProps) {
  const { t } = useT();
  const mine = message.role === 'user';
  return (
    <View style={[styles.row, mine ? styles.right : styles.left]}>
      {!mine ? <Text style={styles.kai}>🦊</Text> : null}
      <View style={{ maxWidth: '82%', gap: spacing.xs }}>
        <View
          style={[styles.bubble, mine ? styles.mine : styles.theirs, message.failed && styles.failed]}
          accessible
          accessibilityLabel={`${mine ? '' : 'Kai: '}${message.content}`}
        >
          <Text color={mine ? 'onPrimary' : 'text'} selectable dataDetectorType="none">
            {message.content}
          </Text>
        </View>
        {message.failed && onRetry ? <Button label={t('ai.failed')} size="sm" variant="ghost" icon="refresh" onPress={onRetry} /> : null}
        {!mine && onReport ? <Button label={t('ai.report')} size="sm" variant="ghost" icon="flag-outline" onPress={() => onReport(message)} /> : null}
      </View>
    </View>
  );
}

export const ChatBubble = memo(ChatBubbleBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  right: { justifyContent: 'flex-end' },
  left: { justifyContent: 'flex-start' },
  kai: { fontSize: 24, lineHeight: 30 },
  bubble: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.xl },
  mine: { backgroundColor: colors.primary, borderBottomRightRadius: radius.sm },
  theirs: { backgroundColor: colors.surface, borderBottomLeftRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  failed: { opacity: 0.6 },
});
