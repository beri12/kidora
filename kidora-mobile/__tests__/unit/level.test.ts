import { didLevelUp, levelFromXp, levelProgress, xpForNextLevel } from '@/lib/level';

describe('gamification level curve (mirrors backend level.util.ts)', () => {
  it('matches the server curve', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(400)).toBe(3);
    expect(levelFromXp(4280)).toBe(7);
    expect(xpForNextLevel(7)).toBe(4900);
  });

  it('computes progress inside a level', () => {
    const p = levelProgress(4280);
    expect(p.level).toBe(7);
    expect(p.remaining).toBe(620);
    expect(p.ratio).toBeGreaterThan(0.5);
    expect(p.ratio).toBeLessThan(0.53);
  });

  it('detects level ups', () => {
    expect(didLevelUp(4880, 20)).toBe(true);
    expect(didLevelUp(4000, 20)).toBe(false);
  });

  it('never goes negative', () => {
    expect(levelFromXp(-50)).toBe(1);
    expect(levelProgress(-10).current).toBe(0);
  });
});
