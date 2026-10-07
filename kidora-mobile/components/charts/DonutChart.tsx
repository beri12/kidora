import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme';

import { Legend } from './Legend';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

function DonutChartBase({ slices, size = 140, thickness = 18, centerLabel, accessibilityLabel }: { slices: DonutSlice[]; size?: number; thickness?: number; centerLabel?: string; accessibilityLabel: string }) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const summary = slices.map((s) => `${s.label} ${s.value}`).join(', ');
  return (
    <View style={styles.row} accessible accessibilityRole="image" accessibilityLabel={`${accessibilityLabel}. ${summary}`}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceMuted} strokeWidth={thickness} fill="none" />
            {total > 0
              ? slices.map((s) => {
                  const len = (s.value / total) * c;
                  const el = (
                    <Circle
                      key={s.label}
                      cx={size / 2}
                      cy={size / 2}
                      r={r}
                      stroke={s.color}
                      strokeWidth={thickness}
                      strokeDasharray={`${len} ${c - len}`}
                      strokeDashoffset={-offset}
                      fill="none"
                    />
                  );
                  offset += len;
                  return el;
                })
              : null}
          </G>
        </Svg>
        {centerLabel ? (
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <Text variant="h2">{centerLabel}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <Legend items={slices.map((s) => ({ label: `${s.label} · ${s.value}`, color: s.color }))} vertical />
      </View>
    </View>
  );
}

export const DonutChart = memo(DonutChartBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, flexWrap: 'wrap' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
