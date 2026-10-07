import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useT } from '@/hooks/useT';
import { useOfflineStore } from '@/store/offlineStore';
import { colors, spacing } from '@/theme';

/** Shows when offline, or while queued progress is syncing. */
export function OfflineBanner() {
  const { t } = useT();
  const online = useOfflineStore((s) => s.isOnline);
  const syncing = useOfflineStore((s) => s.isSyncing);
  const queued = useOfflineStore((s) => s.queue.length);
  if (online && !(syncing && queued > 0)) return null;
  return (
    <View style={[styles.bar, { backgroundColor: online ? colors.info : colors.text }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon name={online ? 'sync' : 'cloud-offline'} size={16} color="textInverse" />
      <Text variant="caption" color="textInverse" style={{ flex: 1 }}>
        {online ? t('common.syncing') : t('common.offline')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
});
