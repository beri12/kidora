import { StyleSheet, View } from 'react-native';

import { useT } from '@/hooks/useT';
import { spacing } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

export function SectionHeader({ title, onSeeAll, actionLabel }: { title: string; onSeeAll?: () => void; actionLabel?: string }) {
  const { t } = useT();
  return (
    <View style={styles.row}>
      <Text variant="h3" accessibilityRole="header" style={{ flex: 1 }}>
        {title}
      </Text>
      {onSeeAll ? <Button label={actionLabel ?? t('common.seeAll')} variant="ghost" size="sm" onPress={onSeeAll} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm } });
