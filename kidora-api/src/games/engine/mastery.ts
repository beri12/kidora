/**
 * Skill mastery and adaptive difficulty, shared by every game.
 *
 * Mastery is an exponential moving average of first-try correctness (0–100),
 * so recent work counts most but one slip never wipes out a skill. Difficulty
 * moves at most one step at a time — no sudden jumps.
 */

/** Weight of the newest attempt. 0.25 ≈ the last 4–6 attempts dominate. */
const WEIGHT = 0.25;

export function nextMastery(current: number, attempts: number, correct: boolean): number {
  const score = correct ? 100 : 0;
  // The first few attempts move faster, so a new skill isn't stuck near 0.
  const w = attempts < 3 ? 1 / (attempts + 1) : WEIGHT;
  return Math.max(0, Math.min(100, Math.round(current * (1 - w) + score * w)));
}

/** Below 40: step down. 40–70: stay. Above 70: step up. Always within 1..7. */
export function nextDifficulty(mastery: number, current: number): number {
  const step = mastery < 40 ? -1 : mastery > 70 ? 1 : 0;
  return Math.max(1, Math.min(7, current + step));
}

/** Stars for a finished level, from first-try accuracy. Never zero: finishing counts. */
export function starsFor(accuracy: number): 1 | 2 | 3 {
  return accuracy >= 90 ? 3 : accuracy >= 60 ? 2 : 1;
}
