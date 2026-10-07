import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

import { colors, radius, spacing } from '@/theme';

import { useChartWidth } from './useChartWidth';

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

export interface BarChartProps {
  data: BarDatum[];
  height?: number;
  max?: number;
  color?: string;
  accessibilityLabel: string;
  unit?: string;
}

function BarChartBase({ data, height = 160, max, color = colors.primary, accessibilityLabel, unit = '' }: BarChartProps) {
  const { width, onLayout } = useChartWidth();
  if (!data.length) return null;
  const top = max ?? Math.max(1, ...data.map((d) => d.value));
  const labelH = 18;
  const valueH = 14;
  const ih = height - labelH - valueH;
  const slot = width / data.length;
  const bw = Math.min(36, slot * 0.6);
  const summary = data.map((d) => `${d.label} ${d.value}${unit}`).join(', ');
  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={`${accessibilityLabel}. ${summary}`} style={{ paddingTop: spacing.xs }}>
      <Svg width={width} height={height}>
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / top) * ih);
          const x = i * slot + (slot - bw) / 2;
          const yTop = valueH + ih - h;
          return (
            <Rect key={`${d.label}-${i}`} x={x} y={yTop} width={bw} height={h} rx={Math.min(radius.sm, bw / 2)} fill={d.color ?? color} />
          );
        })}
        {data.map((d, i) => (
          <SvgText key={`v-${i}`} x={i * slot + slot / 2} y={valueH + ih - Math.max(2, (d.value / top) * ih) - 3} fontSize={10} fill={colors.textMuted} textAnchor="middle">
            {data.length <= 8 ? `${Math.round(d.value)}${unit}` : ''}
          </SvgText>
        ))}
        {data.map((d, i) => (
          <SvgText key={`l-${i}`} x={i * slot + slot / 2} y={height - 4} fontSize={10} fill={colors.textSubtle} textAnchor="middle">
            {d.label.length > 8 ? `${d.label.slice(0, 7)}…` : d.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

export const BarChart = memo(BarChartBase);
