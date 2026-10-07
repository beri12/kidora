import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { StyleSheet, View } from 'react-native';

import { IconButton, ProgressBar, Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, radius, spacing } from '@/theme';

/** Lesson narration / audio content. Respects the "Voice" channel setting. */
export function AudioBlock({ url, title }: { url: string; title?: string | null }) {
  const { t } = useT();
  const voiceOn = useSettingsStore((s) => s.voice);
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);
  const ratio = status.duration > 0 ? status.currentTime / status.duration : 0;
  const playing = status.playing;
  return (
    <View style={styles.box}>
      <IconButton
        icon={playing ? 'pause' : 'play'}
        label={playing ? 'Pause' : t('student.lesson.audio')}
        background={colors.primary}
        color="onPrimary"
        onPress={() => {
          if (!voiceOn) return;
          if (playing) player.pause();
          else {
            if (status.didJustFinish || ratio >= 1) void player.seekTo(0);
            player.play();
          }
        }}
      />
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text variant="label" numberOfLines={1}>
          {title ?? t('student.lesson.audio')}
        </Text>
        <ProgressBar value={ratio} height={6} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.primarySoft, borderRadius: radius.xl },
});
