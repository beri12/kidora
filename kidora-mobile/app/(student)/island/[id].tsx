import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { IslandArt } from '@/components/game';
import { Screen, ScreenHeader } from '@/components/layout';
import { Badge, Card, EmptyState, ErrorState, LoadingState, ProgressBar, Text, useToast } from '@/components/ui';
import { analytics } from '@/features/analytics/track';
import { selectRenderer } from '@/features/game/engine';
import { islandSummary } from '@/features/game/map';
import { useIsland } from '@/hooks/game';
import { useReducedMotionPref } from '@/hooks/useReducedMotionPref';
import { useT } from '@/hooks/useT';
import type { TranslationKey } from '@/i18n';
import { haptics } from '@/lib/haptics';
import { go, lessonHref } from '@/lib/navigation';
import { useUserStore } from '@/store/userStore';
import { spacing } from '@/theme';
import type { MapNode } from '@/types';

export default function IslandScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const toast = useToast();
  const reduced = useReducedMotionPref();
  const setLastIsland = useUserStore((s) => s.setLastIsland);
  const q = useIsland(id);
  const island = q.data;
  const renderer = useMemo(() => selectRenderer(), []);
  const summary = useMemo(() => islandSummary(q.nodes), [q.nodes]);

  useEffect(() => {
    if (!island) return;
    setLastIsland(island.key);
    analytics.track('island_opened', { islandKey: island.key });
  }, [island, setLastIsland]);

  const onNodePress = (node: MapNode) => {
    if (node.status === 'LOCKED') {
      haptics.error();
      toast.show(t('game.nodeLocked'), 'info');
      return;
    }
    if (node.type === 'BOSS') go(`/(student)/exam/${node.id}`);
    else go(lessonHref(node.id, node.courseId));
  };

  if (q.isLoading) {
    return (
      <Screen tone="playful">
        <LoadingState />
      </Screen>
    );
  }
  if (q.isError && !island) {
    return (
      <Screen tone="playful">
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      </Screen>
    );
  }
  if (!island) {
    return (
      <Screen tone="playful">
        <ScreenHeader title={t('student.islands.title')} back />
        <EmptyState emoji="🗺️" title={t('errors.notFound')} />
      </Screen>
    );
  }

  const Scene = renderer?.Scene;
  const name = t(island.nameKey as TranslationKey);

  return (
    <Screen tone="playful" refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="island-screen">
      <ScreenHeader title={name} back />
      <Animated.View entering={reduced ? undefined : FadeIn.duration(400)}>
        <Card tone="tinted" tint={`${island.accent}1A`} style={styles.hero}>
          <IslandArt accent={island.accent} emoji={island.emoji} size={120} locked={!island.unlocked} />
          <Text align="center" color="textMuted">
            {t(island.descriptionKey as TranslationKey)}
          </Text>
          <View style={styles.badges}>
            <Badge label={t('common.level', { level: island.level })} tone="brand" icon="star" />
            <Badge label={t('student.islands.characters', { name: island.character.name })} tone="accent" />
            <Badge label={t('common.of', { current: summary.completed, total: summary.total })} tone="success" icon="checkmark-done" />
          </View>
          <ProgressBar value={island.progress / 100} color={island.accent} accessibilityLabel={t('student.islands.progress', { value: island.progress })} />
        </Card>
      </Animated.View>
      {!q.nodes.length ? (
        <EmptyState emoji="🔒" title={t('student.islands.emptyIsland')} body={t('student.islands.emptyIslandBody')} />
      ) : Scene ? (
        <Scene island={island} nodes={q.nodes} reducedMotion={reduced} onNodePress={onNodePress} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
});
