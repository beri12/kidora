/** Animation durations and spring configs shared by every animated component. */
export const duration = {
  instant: 100,
  fast: 180,
  normal: 280,
  slow: 450,
  celebrate: 1200,
} as const;

export const springs = {
  press: { damping: 15, stiffness: 300, mass: 0.6 },
  bouncy: { damping: 9, stiffness: 180, mass: 0.8 },
  gentle: { damping: 18, stiffness: 120, mass: 1 },
} as const;
