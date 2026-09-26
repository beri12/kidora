/**
 * Pure answer checkers for each challenge kind. The API is the only judge:
 * the web app sends what the child did (an option, a program, a launch), and
 * these decide whether it worked. They are pure functions so they are easy to
 * test and cannot be influenced by anything but the answer and the setup.
 */

export type Dir = 'N' | 'E' | 'S' | 'W';
export type Block = 'F' | 'L' | 'R';
type Cell = [number, number];

export interface GridSetup {
  size: number;
  start: Cell;
  dir: Dir;
  goal: Cell;
  walls: Cell[];
  items: Cell[];
  maxBlocks: number;
}

export interface GridRun {
  ok: boolean;
  /** Every position the robot visited, for the replay animation. */
  path: { x: number; y: number; dir: Dir }[];
  collected: number;
  /** Why it failed, in words a child can act on. */
  reason?: string;
}

const LEFT: Record<Dir, Dir> = { N: 'W', W: 'S', S: 'E', E: 'N' };
const RIGHT: Record<Dir, Dir> = { N: 'E', E: 'S', S: 'W', W: 'N' };
const STEP: Record<Dir, Cell> = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
const key = ([x, y]: Cell) => `${x},${y}`;

/**
 * Runs a block program on the grid. y grows downwards; N is up the screen.
 * Hitting a wall or the edge stops the run where it happened.
 */
export function runGrid(setup: GridSetup, program: unknown): GridRun {
  let [x, y] = setup.start;
  let dir = setup.dir;
  const path = [{ x, y, dir }];

  if (!Array.isArray(program) || program.some((b) => b !== 'F' && b !== 'L' && b !== 'R')) {
    return { ok: false, path, collected: 0, reason: 'The program can only use Forward, Left and Right blocks.' };
  }
  if (program.length === 0) return { ok: false, path, collected: 0, reason: 'Add some blocks first!' };
  if (program.length > setup.maxBlocks) {
    return { ok: false, path, collected: 0, reason: `Use at most ${setup.maxBlocks} blocks.` };
  }

  const walls = new Set(setup.walls.map(key));
  const items = new Set(setup.items.map(key));
  const got = new Set<string>();

  for (const b of program as Block[]) {
    if (b === 'L') dir = LEFT[dir];
    else if (b === 'R') dir = RIGHT[dir];
    else {
      const nx = x + STEP[dir][0];
      const ny = y + STEP[dir][1];
      if (nx < 0 || ny < 0 || nx >= setup.size || ny >= setup.size) {
        return { ok: false, path, collected: got.size, reason: 'Oops — the robot tried to drive off the edge.' };
      }
      if (walls.has(key([nx, ny]))) {
        return { ok: false, path, collected: got.size, reason: 'Bump! Something is blocking that square.' };
      }
      x = nx; y = ny;
      if (items.has(key([x, y]))) got.add(key([x, y]));
    }
    path.push({ x, y, dir });
  }

  const atGoal = x === setup.goal[0] && y === setup.goal[1];
  if (got.size < items.size) return { ok: false, path, collected: got.size, reason: `Collect all ${items.size} items on the way.` };
  if (!atGoal) return { ok: false, path, collected: got.size, reason: 'Close! The robot stopped before the station.' };
  return { ok: true, path, collected: got.size };
}

export interface LaunchSetup {
  gravity: number;
  target: [number, number];
  power: [number, number];
  angle: [number, number];
}

/**
 * Ideal projectile (no air): range = v² · sin(2θ) / g. Inputs outside the
 * sliders' ranges are refused rather than clamped, so a crafted request
 * cannot "win" with an impossible launch.
 */
export function runLaunch(setup: LaunchSetup, answer: unknown): { ok: boolean; distance: number; reason?: string } {
  const a = answer as { angle?: unknown; power?: unknown } | null;
  const angle = Number(a?.angle);
  const power = Number(a?.power);
  if (!Number.isFinite(angle) || !Number.isFinite(power)
    || angle < setup.angle[0] || angle > setup.angle[1]
    || power < setup.power[0] || power > setup.power[1]) {
    return { ok: false, distance: 0, reason: 'Choose an angle and power on the sliders.' };
  }
  const distance = (power * power * Math.sin((2 * angle * Math.PI) / 180)) / setup.gravity;
  const rounded = Math.round(distance * 10) / 10;
  const [min, max] = setup.target;
  if (rounded < min) return { ok: false, distance: rounded, reason: `It landed at ${rounded} m — too short. Try more power, or an angle closer to 45°.` };
  if (rounded > max) return { ok: false, distance: rounded, reason: `It landed at ${rounded} m — too far. Try less power.` };
  return { ok: true, distance: rounded };
}

/** Multiple choice: the answer is an option index. */
export function runChoice(solution: { index?: number }, answer: unknown): boolean {
  return Number.isInteger(answer) && answer === solution.index;
}
