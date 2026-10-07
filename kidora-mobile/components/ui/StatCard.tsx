import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { Card } from './Card';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface StatCardProps {
  label: string;
  value: string;
  icon?: IconName;
  accent?: string;
  caption?: string;
  /** signed change vs previous period */
  delta?: number;
  onPress?: () => void;
}

function StatCardBase({ label, value, icon, accent = colors.primary, caption, delta, onPress }: StatCardProps) {
  const trendUp = (delta ?? 0) >= 0;
  return (
    <Card tone="dense" onPress={onPress} accessibilityLabel={`${label}: ${value}${caption ? `, ${caption}` : ''}`} style={styles.card}>
      <View style={styles.top}>
        {icon ? (
          <View style={[styles.icon, { backgroundColor: `${accent}1A` }]}>
            <Icon name={icon} size={18} tint={accent} />
          </View>
        ) : null}
        <Text variant="caption" color="textMuted" numberOfLines={2} style={{ flex: 1 }}>
          {label}
        </Text>
      </View>
      <Text variant="h1" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {delta !== undefined ? (
        <View style={styles.trend}>
          <Icon name={trendUp ? 'trending-up' : 'trending-down'} size={14} color={trendUp ? 'success' : 'danger'} />
          <Text variant="tiny" color={trendUp ? 'success' : 'danger'}>
            {`${trendUp ? '+' : ''}${delta}`}
          </Text>
          {caption ? (
            <Text variant="tiny" color="textSubtle" numberOfLines={1}>
              {caption}
            </Text>
          ) : null}
        </View>
      ) : caption ? (
        <Text variant="tiny" color="textSubtle" numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </Card>
  );
}

export const StatCard = memo(StatCardBase);

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 140, gap: spacing.xs },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 32, height: 32, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  trend: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
