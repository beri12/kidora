import paletteData from './palette.json';

/**
 * Kidora palette.
 *
 * Brand violet matches kidora-web so both clients read as one product. The
 * warm accents (terracotta, kente gold, savanna, river) give the student world
 * an African-inspired identity through colour and pattern, not caricature.
 * Every text/background pair used by components clears WCAG AA (4.5:1).
 */
// Single source of truth shared with tailwind.config.js.
export const palette = paletteData.palette;

/** Semantic tokens. Components use these, never raw hex values. */
export const colors = {
  primary: palette.brand[600],
  primaryPressed: palette.brand[700],
  primarySoft: palette.brand[100],
  onPrimary: '#FFFFFF',

  secondary: palette.terracotta[500],
  secondarySoft: palette.terracotta[100],

  accent: palette.kente[500],
  accentSoft: palette.kente[100],

  success: palette.savanna[600],
  successSoft: palette.savanna[100],
  warning: palette.kente[700],
  warningSoft: palette.kente[100],
  danger: palette.coral[700],
  dangerSoft: palette.coral[100],
  info: palette.river[700],
  infoSoft: palette.river[100],

  text: palette.ink,
  textMuted: palette.slate[600],
  textSubtle: palette.slate[500],
  textInverse: '#FFFFFF',

  background: palette.slate[50],
  backgroundPlayful: '#FFF8EE',
  surface: '#FFFFFF',
  surfaceMuted: palette.slate[100],
  border: palette.slate[200],
  borderStrong: palette.slate[300],
  overlay: 'rgba(15, 23, 42, 0.55)',

  xp: palette.kente[500],
  coin: '#F59E0B',
  streak: palette.terracotta[500],
  locked: palette.slate[400],
} as const;

export type ColorToken = keyof typeof colors;

/** Accent per learning world. New islands add an entry here (or come from the API). */
export const worldAccents: Record<string, string> = {
  MATH_ISLAND: palette.brand[600],
  READING_FOREST: palette.savanna[600],
  SCIENCE_PLANET: palette.kente[700],
  CODING_CITY: palette.river[700],
  ART_VALLEY: palette.coral[700],
};

/** Subject accents for LMS cards. */
export const subjectAccents: Record<string, string> = {
  Mathematics: palette.brand[600],
  English: palette.savanna[600],
  Biology: palette.savanna[700],
  Physics: palette.river[700],
  Coding: palette.river[500],
  History: palette.terracotta[700],
  Art: palette.coral[700],
  Science: palette.kente[700],
};
