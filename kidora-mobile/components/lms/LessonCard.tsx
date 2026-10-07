import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Card, Icon, ProgressBar, Text, type BadgeTone, type IconName } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { colors, radius, spacing } from '@/theme';
import type { LessonState, LessonType } from '@/types';

const TYPE_ICON: Record<LessonType, IconName> = {
  VIDEO: 'play-circle',
  INTERACTIVE: 'hand-left',
  QUIZ: 'help-circle',
  GAME: 'game-controller',
  TEXT: 'book',
  AUDIO: 'headset',
  MIXED: 'layers',
};

const STATE_TONE: Record<LessonState, BadgeTone> = { NOT_STARTED: 'neutral', IN_PROGRESS: 'info', COMPLETED: 'success', LOCKED: 'neutral' };

export function lessonState(l: { completed: boolean; percent: number; locked?: boolean }): LessonState {
  if (l.locked) return 'LOCKED';
  if (l.completed) return 'COMPLETED';
  if (l.percent > 0) return 'IN_PROGRESS';
  return 'NOT_STARTED';
}

export interface LessonCardProps {
  title: string;
  subtitle?: string;
  type: LessonType;
  state: LessonState;
  percent?: number;
  minutes?: number;
  accent?: string;
  onPress?: () => void;
}

function LessonCardBase({ title, subtitle, type, state, percent = 0, minutes, accent = colors.primary, onPress }: LessonCardProps) {
  const { t } = useT();
  const locked = state === 'LOCKED';
  return (
    <Card
      onPress={locked ? undefined : onPress}
      accessibilityLabel={`${title}. ${t(`student.lesson.state.${state}`)}`}
      style={[styles.card, locked && { opacity: 0.6 }]}
    >
      <View style={[styles.icon, { backgroundColor: `${accent}1A` }]}>
        <Icon name={locked ? 'lock-closed' : TYPE_ICON[type]} tint={locked ? colors.locked : accent} size={24} />
      </View>
      <View style={styles.body}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <View style={styles.meta}>
          <Badge label={t(`student.lesson.state.${state}`)} tone={STATE_TONE[state]} />
          {minutes ? (
            <Text variant="tiny" color="textMuted">
              {t('common.minutes', { count: minutes })}
            </Text>
          ) : null}
        </View>
        {state === 'IN_PROGRESS' ? <ProgressBar value={percent / 100} color={accent} height={6} /> : null}
      </View>
    </Card>
  );
}

export const LessonCard = memo(LessonCardBase);

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  icon: { width: 52, height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: spacing.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
