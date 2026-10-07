/** 4-pt spacing scale. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
} as const;

export type SpacingToken = keyof typeof spacing;

/** Minimum touch target (Material 48dp / Apple 44pt — take the larger). */
export const MIN_TOUCH = 48;
/** Children get bigger targets in the student world. */
export const KID_TOUCH = 56;

/** Content gutter used by every screen. */
export const SCREEN_GUTTER = spacing.lg;
