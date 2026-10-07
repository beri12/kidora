import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { FloatingCharacter } from '@/components/game';
import { Button, Card, Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { colors, spacing } from '@/theme';

function AiTutorCardBase() {
  const { t } = useT();
  return (
    <Card tone="tinted" tint={colors.primarySoft} style={styles.card}>
      <FloatingCharacter emoji="🦊" size={48} />
      <View style={{ flex: 1, gap: spacing.sm }}>
        <Text variant="h3">{t('student.dashboard.askKai')}</Text>
        <Text variant="caption" color="textMuted">
          {t('student.dashboard.askKaiBody')}
        </Text>
        <Button label={t('ai.ask')} icon="sparkles" size="sm" onPress={() => go('/(student)/ai-tutor')} testID="open-kai" />
      </View>
    </Card>
  );
}

export const AiTutorCard = memo(AiTutorCardBase);

const styles = StyleSheet.create({ card: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' } });
