import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Badge, Card, Icon, ProgressBar, Text } from '@/components/ui';
import { useReducedMotionPref } from '@/hooks/useReducedMotionPref';
import { useT } from '@/hooks/useT';
import type { TranslationKey } from '@/i18n';
import { colors, radius, spacing } from '@/theme';
import type { Island } from '@/types';

import { IslandArt } from './IslandArt';

export interface IslandCardProps {
  island: Island;
  index?: number;
  onPress?: (island: Island) => void;
  compact?: boolean;
}

function IslandCardBase({ island, index = 0, onPress, compact }: IslandCardProps) {
  const { t } = useT();
  const reduced = useReducedMotionPref();
  const name = t(island.nameKey as TranslationKey);
  const label = island.unlocked
    ? `${name}. ${t('student.islands.progress', { value: island.progress })}`
    : `${name}. ${t('student.islands.locked')}`;
  return (
    <Animated.View entering={reduced ? undefined : FadeInDown.delay(index * 70).springify().damping(16)}>
      <Card tone="playful" onPress={onPress ? () => onPress(island) : undefined} accessibilityLabel={label} style={[styles.card, { borderColor: `${island.accent}33` }]} testID={`island-${island.key}`}>
        <View style={[styles.hero, { backgroundColor: `${island.accent}18`, height: compact ? 96 : 132 }]}>
          <IslandArt accent={island.accent} emoji={island.emoji} size={compact ? 88 : 116} locked={!island.unlocked} />
          {!island.unlocked ? (
            <View style={styles.lock}>
              <Icon name="lock-closed" size={18} color="textInverse" />
            </View>
          ) : null}
        </View>
        <View style={{ gap: spacing.xs }}>
          <Text variant="h3" numberOfLines={1}>
            {name}
          </Text>
          {!compact ? (
            <Text variant="caption" color="textMuted" numberOfLines={2}>
              {t(island.descriptionKey as TranslationKey)}
            </Text>
          ) : null}
        </View>
        {island.unlocked ? (
          <View style={{ gap: spacing.xs }}>
            <ProgressBar value={island.progress / 100} color={island.accent} />
            <Text variant="tiny" color="textMuted">
              {t('student.islands.progress', { value: island.progress })}
            </Text>
          </View>
        ) : (
          <Badge label={t('common.locked')} tone="neutral" icon="lock-closed" />
        )}
      </Card>
    </Animated.View>
  );
}

export const IslandCard = memo(IslandCardBase);

const styles = StyleSheet.create({
  card: { gap: spacing.md, padding: spacing.md },
  hero: { borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  lock: { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: colors.overlay, borderRadius: radius.pill, padding: spacing.xs },
});
