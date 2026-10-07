export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 22,
  '2xl': 28,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radius;
