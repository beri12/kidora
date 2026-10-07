import { memo, useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { colors, palette, spacing } from '@/theme';

import { Legend } from './Legend';
import { useChartWidth } from './useChartWidth';

export interface LineSeries {
  label: string;
  values: number[];
  color?: string;
}

export interface LineChartProps {
  series: LineSeries[];
  labels: string[];
  height?: number;
  /** fixed max (e.g. 100 for percentages); defaults to data max */
  max?: number;
  accessibilityLabel: string;
  unit?: string;
}

const DEFAULT_COLORS = [palette.brand[600], palette.terracotta[500], palette.savanna[600], palette.river[500], palette.kente[700]];
const PAD = { top: 12, right: 12, bottom: 24, left: 32 };

/** Thinned labels and ≤ 60 points per series keep this cheap on phones. */
function downsample(values: number[], max = 60): number[] {
  if (values.length <= max) return values;
  const step = values.length / max;
  return Array.from({ length: max }, (_, i) => values[Math.floor(i * step)] ?? 0);
}

function LineChartBase({ series, labels, height = 180, max, accessibilityLabel, unit = '' }: LineChartProps) {
  const { width, onLayout } = useChartWidth();
  const data = useMemo(() => series.map((s, i) => ({ ...s, values: downsample(s.values), color: s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length] })), [series]);
  const n = Math.max(1, ...data.map((s) => s.values.length));
  const top = max ?? Math.max(1, ...data.flatMap((s) => s.values));
  const iw = Math.max(1, width - PAD.left - PAD.right);
  const ih = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => PAD.top + ih - (v / top) * ih;
  const step = Math.max(1, Math.ceil(labels.length / 5));

  const summary = data.map((s) => `${s.label}: ${s.values[s.values.length - 1] ?? 0}${unit}`).join(', ');

  if (!data.length || data.every((s) => s.values.length === 0)) return null;
  return (
    <View onLayout={onLayout} accessible accessibilityRole="image" accessibilityLabel={`${accessibilityLabel}. ${summary}`} style={{ gap: spacing.sm }}>
      <Svg width={width} height={height}>
        {[0, 0.5, 1].map((f) => (
          <G key={f}>
            <Line x1={PAD.left} x2={width - PAD.right} y1={y(top * f)} y2={y(top * f)} stroke={colors.border} strokeDasharray="4 4" />
            <SvgText x={PAD.left - 6} y={y(top * f) + 4} fontSize={10} fill={colors.textSubtle} textAnchor="end">
              {`${Math.round(top * f)}`}
            </SvgText>
          </G>
        ))}
        {data.map((s) => {
          const d = s.values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
          const last = s.values.length - 1;
          return (
            <G key={s.label}>
              <Path d={d} stroke={s.color} strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round" />
              {last >= 0 ? <Circle cx={x(last)} cy={y(s.values[last] ?? 0)} r={4} fill={s.color} /> : null}
            </G>
          );
        })}
        {labels.map((l, i) =>
          i % step === 0 && i < n ? (
            <SvgText key={`${l}-${i}`} x={x(Math.round((i / Math.max(1, labels.length - 1)) * (n - 1)))} y={height - 6} fontSize={10} fill={colors.textSubtle} textAnchor="middle">
              {l}
            </SvgText>
          ) : null,
        )}
      </Svg>
      {data.length > 1 ? <Legend items={data.map((s) => ({ label: s.label, color: s.color ?? colors.primary }))} /> : null}
    </View>
  );
}

export const LineChart = memo(LineChartBase);
