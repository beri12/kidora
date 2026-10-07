/**
 * Level curve — a mirror of kidora-api/src/lms/gamification/level.util.ts so
 * optimistic UI (offline lesson completion) shows the same numbers the server
 * will. Level n needs 100·(n-1)² total XP.
 */
export function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1);
}

export function xpForLevel(level: number): number {
  return 100 * (level - 1) * (level - 1);
}

export function xpForNextLevel(level: number): number {
  return 100 * level * level;
}

export interface LevelProgress {
  level: number;
  /** XP earned inside the current level */
  current: number;
  /** XP span of the current level */
  span: number;
  /** XP left to the next level */
  remaining: number;
  /** 0..1 */
  ratio: number;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const ceil = xpForNextLevel(level);
  const span = ceil - floor;
  const current = Math.max(0, xp - floor);
  return {
    level,
    current,
    span,
    remaining: Math.max(0, ceil - xp),
    ratio: span > 0 ? Math.min(1, current / span) : 0,
  };
}

/** Did adding `gained` XP cross a level boundary? */
export function didLevelUp(previousXp: number, gained: number): boolean {
  return levelFromXp(previousXp + gained) > levelFromXp(previousXp);
}
