import { GAME_CONTENT } from '../content/game-content';
import { GridSetup, LaunchSetup, runChoice, runGrid, runLaunch } from './checkers';
import { nextDifficulty, nextMastery, starsFor } from './mastery';

const base: GridSetup = { size: 5, start: [0, 2], dir: 'E', goal: [3, 2], walls: [], items: [], maxBlocks: 6 };

describe('runGrid', () => {
  it('drives the robot to the goal', () => {
    const r = runGrid(base, ['F', 'F', 'F']);
    expect(r.ok).toBe(true);
    expect(r.path.at(-1)).toEqual({ x: 3, y: 2, dir: 'E' });
  });
  it('stops at walls and edges with a reason', () => {
    expect(runGrid({ ...base, walls: [[1, 2]] }, ['F']).reason).toMatch(/blocking/);
    expect(runGrid({ ...base, start: [4, 2] }, ['F']).reason).toMatch(/edge/);
  });
  it('turns left and right correctly', () => {
    expect(runGrid({ ...base, goal: [0, 1] }, ['L', 'F']).ok).toBe(true);
    expect(runGrid({ ...base, goal: [0, 3] }, ['R', 'F']).ok).toBe(true);
  });
  it('requires every item', () => {
    expect(runGrid({ ...base, items: [[0, 0]] }, ['F', 'F', 'F']).ok).toBe(false);
  });
  it('refuses unknown blocks and oversized programs', () => {
    expect(runGrid(base, ['F', 'JUMP']).ok).toBe(false);
    expect(runGrid(base, 'FFF').ok).toBe(false);
    expect(runGrid(base, Array(7).fill('L')).reason).toMatch(/at most 6/);
  });
});

describe('runLaunch', () => {
  const s: LaunchSetup = { gravity: 9.8, target: [20, 24], power: [5, 25], angle: [10, 80] };
  it('hits with 45° / 15', () => expect(runLaunch(s, { angle: 45, power: 15 }).ok).toBe(true));
  it('explains a short shot', () => expect(runLaunch(s, { angle: 45, power: 10 }).reason).toMatch(/too short/));
  it('refuses values off the sliders (no crafted wins)', () => {
    expect(runLaunch(s, { angle: 45, power: 999 }).ok).toBe(false);
    expect(runLaunch(s, { angle: 'x', power: 15 }).ok).toBe(false);
  });
});

describe('runChoice', () => {
  it('matches only the exact index', () => {
    expect(runChoice({ index: 2 }, 2)).toBe(true);
    expect(runChoice({ index: 2 }, '2')).toBe(false);
    expect(runChoice({ index: 2 }, 1)).toBe(false);
  });
});

describe('mastery and difficulty', () => {
  it('moves quickly at first, then smoothly', () => {
    expect(nextMastery(0, 0, true)).toBe(100);
    expect(nextMastery(100, 5, false)).toBe(75);
  });
  it('changes difficulty one step at a time within 1..7', () => {
    expect(nextDifficulty(20, 3)).toBe(2);
    expect(nextDifficulty(55, 3)).toBe(3);
    expect(nextDifficulty(90, 7)).toBe(7);
    expect(nextDifficulty(10, 1)).toBe(1);
  });
  it('never gives zero stars for finishing', () => expect(starsFor(0)).toBe(1));
});

/** Parses the block sequence written in a hint ("Forward ×3, turn right, …"). */
function programFromHint(text: string): string[] | null {
  const out: string[] = [];
  for (const part of text.replace(/\.$/, '').split(/,\s*/)) {
    const m = part.trim().match(/^(forward|turn left|turn right|left|right)\s*(?:[×x](\d+))?$/i);
    if (!m) return null;
    const b = /forward/i.test(m[1]) ? 'F' : /left/i.test(m[1]) ? 'L' : 'R';
    out.push(...Array(Number(m[2] ?? 1)).fill(b));
  }
  return out;
}

describe('built-in content', () => {
  const all = GAME_CONTENT.flatMap((g) => g.levels.flatMap((l) => l.challenges.map((c) => ({ g: g.slug, l: l.name, c }))));

  it('has 5 games × 3 levels × 6 challenges', () => {
    expect(GAME_CONTENT).toHaveLength(5);
    for (const g of GAME_CONTENT) {
      expect(g.levels).toHaveLength(3);
      for (const l of g.levels) expect(l.challenges).toHaveLength(6);
    }
  });

  it('every multiple-choice item has 4 distinct options and hints', () => {
    for (const { c } of all.filter((x) => (x.c.kind ?? 'MULTIPLE_CHOICE') === 'MULTIPLE_CHOICE')) {
      expect(new Set(c.options).size).toBe(4);
      expect(c.hints.length).toBeGreaterThanOrEqual(2);
      expect(c.explanation.length).toBeGreaterThan(5);
    }
  });

  it('every grid puzzle is solvable by the program its hint describes', () => {
    for (const { g, l, c } of all.filter((x) => x.c.kind === 'CODE_PATH')) {
      const setup = c.setup as unknown as GridSetup;
      const program = c.hints.map(programFromHint).find((p) => p) ?? programFromHint(c.explanation);
      expect({ where: `${g} / ${l}`, program: Boolean(program) }).toEqual({ where: `${g} / ${l}`, program: true });
      const run = runGrid(setup, program);
      expect({ where: `${g} / ${l}: ${c.prompt}`, ok: run.ok, reason: run.reason }).toEqual({ where: `${g} / ${l}: ${c.prompt}`, ok: true, reason: undefined });
    }
  });

  it('every launch target is reachable at 45° within the slider range', () => {
    for (const { c } of all.filter((x) => x.c.kind === 'PHYSICS_LAUNCH')) {
      const s = c.setup as unknown as LaunchSetup;
      const hit: number[] = [];
      for (let p = s.power[0]; p <= s.power[1]; p += 0.5) if (runLaunch(s, { angle: 45, power: p }).ok) hit.push(p);
      expect(hit.length).toBeGreaterThan(0);
    }
  });
});
