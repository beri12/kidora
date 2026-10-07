import { Platform, type ViewStyle } from 'react-native';

/**
 * Elevation presets. Android uses `elevation` (cheap, GPU friendly); iOS uses
 * shadow props. Kept shallow on purpose — deep shadows cost overdraw on
 * low-end Android devices.
 */
function make(level: number, opacity: number, blur: number, y: number): ViewStyle {
  return Platform.select<ViewStyle>({
    android: { elevation: level },
    default: {
      shadowColor: '#1E1B4B',
      shadowOpacity: opacity,
      shadowRadius: blur,
      shadowOffset: { width: 0, height: y },
    },
  });
}

export const shadows = {
  none: {} as ViewStyle,
  sm: make(1, 0.06, 4, 1),
  md: make(3, 0.08, 10, 4),
  lg: make(6, 0.12, 18, 8),
  /** Chunky "game button" drop used on student CTAs. */
  game: make(4, 0.18, 0, 4),
} as const;

export type ShadowToken = keyof typeof shadows;
