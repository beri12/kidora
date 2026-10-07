import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useResponsive } from '@/hooks/useResponsive';
import { colors, SCREEN_GUTTER, spacing } from '@/theme';

import { OfflineBanner } from './OfflineBanner';

export interface ScreenProps {
  children: ReactNode;
  /** playful = student world (warm background), professional = adult dashboards */
  tone?: 'playful' | 'professional';
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  header?: ReactNode;
  footer?: ReactNode;
  testID?: string;
}

/**
 * Screen shell: safe areas, offline banner, pull-to-refresh, gutters, and a
 * max content width so tablets get readable line lengths.
 */
export function Screen({
  children,
  tone = 'professional',
  scroll = true,
  refreshing = false,
  onRefresh,
  edges = ['top'],
  contentStyle,
  header,
  footer,
  testID,
}: ScreenProps) {
  const { contentWidth } = useResponsive();
  const bg = tone === 'playful' ? colors.backgroundPlayful : colors.background;
  const inner = [styles.content, { maxWidth: contentWidth, gap: tone === 'playful' ? spacing.xl : spacing.lg }, contentStyle];
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bg }]} edges={edges} testID={testID}>
      <OfflineBanner />
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scroll]}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
        >
          <View style={inner}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.fill, inner]}>{children}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', paddingBottom: spacing['4xl'] },
  content: { width: '100%', alignSelf: 'center', paddingHorizontal: SCREEN_GUTTER, paddingTop: spacing.md },
});
