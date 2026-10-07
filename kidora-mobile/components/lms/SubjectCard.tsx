import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, ProgressBar, Text } from '@/components/ui';
import { colors, radius, spacing, subjectAccents } from '@/theme';
import type { Subject } from '@/types';

const EMOJI: Record<string, string> = {
  Mathematics: '➗',
  English: '📖',
  Biology: '🌿',
  Physics: '⚛️',
  Coding: '💻',
  History: '🏛️',
  Art: '🎨',
  Science: '🔬',
};

function SubjectCardBase({ subject, percent, accent, onPress }: { subject: Subject; percent: number; accent?: string | null; onPress?: () => void }) {
  const color = accent ?? subjectAccents[subject] ?? colors.primary;
  return (
    <Card tone="dense" onPress={onPress} accessibilityLabel={`${subject}, ${percent}%`} style={styles.card}>
      <View style={[styles.icon, { backgroundColor: `${color}1A` }]}>
        <Text style={styles.emoji}>{EMOJI[subject] ?? '📘'}</Text>
      </View>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <View style={styles.row}>
          <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
            {subject}
          </Text>
          <Text variant="label" color="textMuted">{`${Math.round(percent)}%`}</Text>
        </View>
        <ProgressBar value={percent / 100} color={color} height={8} />
      </View>
    </Card>
  );
}

export const SubjectCard = memo(SubjectCardBase);

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 22, lineHeight: 28 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
