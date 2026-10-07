import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { colors, radius, spacing } from '@/theme';
import type { VideoAsset } from '@/types';

/**
 * Lesson video via expo-video. Never autoplays (data saver friendly); native
 * controls give accessible play/pause/scrub/captions for free.
 */
export function VideoBlock({ url, video, title }: { url?: string | null; video?: VideoAsset | null; title?: string | null }) {
  const { t } = useT();
  const src = video?.url ?? url ?? null;
  const ready = !video?.processingStatus || video.processingStatus === 'READY' || video.processingStatus === 'COMPLETED';
  const player = useVideoPlayer(ready && src ? src : null, (p) => {
    p.loop = false;
    p.muted = false;
  });

  if (!src || !ready) {
    return (
      <View style={[styles.box, styles.placeholder]}>
        <Text style={styles.emoji}>🎬</Text>
        <Text color="textMuted" align="center">
          {t('student.lesson.videoProcessing')}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.box} accessibilityLabel={title ?? undefined}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        nativeControls
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
        allowsPictureInPicture={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: '#000' },
  placeholder: { backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  emoji: { fontSize: 36, lineHeight: 44 },
});
