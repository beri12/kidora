import { Lottie as LottieView } from './Lottie';
import { useEffect } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Button, LevelBadge, Text } from '@/components/ui';
import BURST from '@/assets/lottie/star-burst.json';
import { audio } from '@/features/audio/audio';
import { analytics } from '@/features/analytics/track';
import { useReducedMotionPref } from '@/hooks/useReducedMotionPref';
import { useT } from '@/hooks/useT';
import { haptics } from '@/lib/haptics';
import { useGameStore, type Celebration } from '@/store/gameStore';
import { colors, radius, shadows, spacing } from '@/theme';

import { Confetti } from './Confetti';


/**
 * Plays queued celebrations (XP, level up, achievement) one at a time.
 * Mounted once at the root of the student experience.
 */
export function CelebrationOverlay() {
  const current = useGameStore((s) => s.celebrations[0]);
  const dismiss = useGameStore((s) => s.dismiss);
  if (!current) return null;
  return <CelebrationCard key={current.id} celebration={current} onDone={() => dismiss(current.id)} />;
}

function CelebrationCard({ celebration, onDone }: { celebration: Celebration; onDone: () => void }) {
  const { t } = useT();
  const reduced = useReducedMotionPref();
  const big = celebration.kind !== 'xp';

  useEffect(() => {
    haptics.reward();
    void audio.play(celebration.kind === 'level_up' ? 'levelUp' : 'reward');
    if (celebration.kind === 'achievement') analytics.track('achievement_unlocked', { kind: 'achievement' });
    if (!big) {
      const timer = setTimeout(onDone, 1800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [celebration, big, onDone]);

  if (!big && celebration.kind === 'xp') {
    return (
      <View pointerEvents="none" style={styles.toastHost}>
        <Animated.View entering={reduced ? undefined : ZoomIn.springify()} style={[styles.xpPill, shadows.md]} accessibilityLiveRegion="polite" accessibilityRole="alert">
          <Text variant="h2" color="text">
            {t('game.plusXp', { xp: celebration.xp })}
          </Text>
          {celebration.coins > 0 ? (
            <Text variant="bodyStrong" color="warning">
              {`🪙 ${t('game.plusCoins', { coins: celebration.coins })}`}
            </Text>
          ) : null}
        </Animated.View>
      </View>
    );
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDone} statusBarTranslucent>
      <View style={styles.backdrop}>
        {!reduced ? <Confetti /> : null}
        <Animated.View entering={reduced ? undefined : ZoomIn.springify().damping(12)} style={[styles.card, shadows.lg]} accessibilityViewIsModal accessibilityLiveRegion="assertive">
          {!reduced ? <LottieView source={BURST} autoPlay loop={false} style={styles.lottie} /> : null}
          {celebration.kind === 'level_up' ? (
            <>
              <Text variant="display" color="primary" align="center">
                {t('game.levelUp')}
              </Text>
              <LevelBadge level={celebration.level} size={88} />
              <Text variant="h3" align="center">
                {t('game.congrats')}
              </Text>
              <Text align="center" color="textMuted">
                {t('game.reachedLevel', { level: celebration.level })}
              </Text>
            </>
          ) : celebration.kind === 'achievement' ? (
            <>
              <Text style={styles.trophy}>🏆</Text>
              <Text variant="h2" align="center">
                {t('game.achievementUnlocked')}
              </Text>
              <Text variant="bodyStrong" align="center" color="textMuted">
                {celebration.title}
              </Text>
            </>
          ) : null}
          <Button label={t('game.awesome')} variant="game" onPress={onDone} fullWidth />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toastHost: { position: 'absolute', top: 90, left: 0, right: 0, alignItems: 'center', zIndex: 999 },
  xpPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.accent, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill },
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: { width: '100%', maxWidth: 380, backgroundColor: colors.surface, borderRadius: radius['2xl'], padding: spacing['2xl'], alignItems: 'center', gap: spacing.md },
  lottie: { position: 'absolute', width: 260, height: 260, top: -40 },
  trophy: { fontSize: 72, lineHeight: 88 },
});
