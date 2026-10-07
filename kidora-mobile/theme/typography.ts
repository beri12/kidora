import type { TextStyle } from 'react-native';

/**
 * Type scale. Sizes are in dp and scale with the OS font-size setting
 * (allowFontScaling stays on); `maxFontSizeMultiplier` in the Text component
 * caps runaway scaling so layouts don't break.
 */
export const fontFamily = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  '2xl': 26,
  '3xl': 32,
  '4xl': 40,
} as const;

export const typography = {
  display: { fontSize: fontSize['3xl'], lineHeight: 38, fontWeight: '800' },
  h1: { fontSize: fontSize['2xl'], lineHeight: 32, fontWeight: '800' },
  h2: { fontSize: fontSize.xl, lineHeight: 28, fontWeight: '700' },
  h3: { fontSize: fontSize.lg, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: fontSize.md, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: fontSize.md, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: fontSize.sm, lineHeight: 18, fontWeight: '400' },
  label: { fontSize: fontSize.sm, lineHeight: 18, fontWeight: '600' },
  tiny: { fontSize: fontSize.xs, lineHeight: 16, fontWeight: '500' },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

/** Accessibility: never let text scale beyond this multiple of its base size. */
export const MAX_FONT_SCALE = 1.6;
