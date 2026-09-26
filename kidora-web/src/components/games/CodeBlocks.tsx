'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { AttemptResult, Block, Dir, GridSetup } from '@/lib/api/games';

const BLOCK: Record<Block, { label: string; icon: string; py: string; js: string }> = {
  F: { label: 'Forward', icon: '⬆️', py: 'move_forward()', js: 'robot.move();' },
  L: { label: 'Turn left', icon: '↩️', py: 'turn_left()', js: 'robot.turnLeft();' },
  R: { label: 'Turn right', icon: '↪️', py: 'turn_right()', js: 'robot.turnRight();' },
};

/** Groups runs of the same block, so repeats can be shown as loops. */
function runs(program: Block[]) {
  const out: { b: Block; n: number }[] = [];
  for (const b of program) {
    const last = out[out.length - 1];
    if (last && last.b === b) last.n++;
    else out.push({ b, n: 1 });
  }
  return out;
}

export function toPython(program: Block[]) {
  if (!program.length) return '# add blocks to write your program';
  return runs(program).map(({ b, n }) => (n > 1 ? `for _ in range(${n}):\n    ${BLOCK[b].py}` : BLOCK[b].py)).join('\n');
}

export function toJavaScript(program: Block[]) {
  if (!program.length) return '// add blocks to write your program';
  return runs(program).map(({ b, n }) => (n > 1 ? `for (let i = 0; i < ${n}; i++) {\n  ${BLOCK[b].js}\n}` : BLOCK[b].js)).join('\n');
}

const ARROW: Record<Dir, string> = { N: '▲', E: '▶', S: '▼', W: '◀' };

interface Props {
  setup: GridSetup;
  busy: boolean;
  solved: boolean;
  result: AttemptResult | null;
  onRun: (program: Block[]) => void;
}

/**
 * Code City's editor: a palette of blocks, the program, the same program in
 * Python and JavaScript, and a grid where the robot replays the path the
 * server computed. The server — not this component — decides success.
 */
export function CodeBlocks({ setup, busy, solved, result, onRun }: Props) {
  const [program, setProgram] = useState<Block[]>([]);
  const [view, setView] = useState<'blocks' | 'python' | 'javascript'>('blocks');
  const [frame, setFrame] = useState(0);
  const path = result?.result.path ?? [{ x: setup.start[0], y: setup.start[1], dir: setup.dir }];

  // Replay the path step by step when a new result arrives.
  useEffect(() => {
    if (!result?.result.path) return;
    setFrame(0);
    const n = result.result.path.length;
    let i = 0;
    const id = setInterval(() => { i++; setFrame(i); if (i >= n - 1) clearInterval(id); }, 320);
    return () => clearInterval(id);
  }, [result]);

  const at = path[Math.min(frame, path.length - 1)];
  const cell = 100 / setup.size;
  const has = (list: [number, number][], x: number, y: number) => list.some(([a, b]) => a === x && b === y);
  const visited = new Set(path.slice(0, frame + 1).map((p) => `${p.x},${p.y}`));

  const add = (b: Block) => { if (program.length < setup.maxBlocks && !solved) setProgram((p) => [...p, b]); };

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Grid */}
      <div className="relative mx-auto aspect-square w-full max-w-[280px] rounded-2xl bg-slate-800 p-1.5" role="img"
        aria-label={`Grid ${setup.size} by ${setup.size}. Robot at column ${at.x + 1}, row ${at.y + 1}, facing ${({ N: 'up', E: 'right', S: 'down', W: 'left' } as const)[at.dir]}. Station at column ${setup.goal[0] + 1}, row ${setup.goal[1] + 1}.`}>
        <div className="relative h-full w-full">
          {Array.from({ length: setup.size * setup.size }, (_, i) => {
            const x = i % setup.size, y = Math.floor(i / setup.size);
            const wall = has(setup.walls, x, y), goal = setup.goal[0] === x && setup.goal[1] === y, item = has(setup.items, x, y);
            return (
              <div key={i} className="absolute p-0.5" style={{ left: `${x * cell}%`, top: `${y * cell}%`, width: `${cell}%`, height: `${cell}%` }}>
                <div className={`grid h-full w-full place-items-center rounded-lg text-lg ${wall ? 'bg-slate-600' : visited.has(`${x},${y}`) ? 'bg-indigo-400/40' : 'bg-slate-700'}`}>
                  {wall ? '📦' : goal ? '⚡' : item && !visited.has(`${x},${y}`) ? (setup.items.length === 3 ? '🌱' : '🔋') : ''}
                </div>
              </div>
            );
          })}
          <motion.div
            className="absolute grid place-items-center text-2xl"
            style={{ width: `${cell}%`, height: `${cell}%` }}
            animate={{ left: `${at.x * cell}%`, top: `${at.y * cell}%` }}
            transition={{ duration: 0.28 }}
            aria-hidden
          >
            <span className="relative">
              🤖
              {/* Facing direction, so the robot itself stays upright. */}
              <span className="absolute -right-2 -top-2 text-xs text-amber-300">{ARROW[at.dir]}</span>
            </span>
          </motion.div>
        </div>
      </div>

      {/* Editor */}
      <div>
        <div className="mb-2 flex gap-1 rounded-full bg-slate-100 p-1" role="tablist" aria-label="Program view">
          {(['blocks', 'python', 'javascript'] as const).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
              className={`min-h-9 flex-1 rounded-full font-display text-sm font-extrabold capitalize ${view === v ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
              {v === 'javascript' ? 'JavaScript' : v === 'python' ? 'Python' : 'Blocks'}
            </button>
          ))}
        </div>

        {view === 'blocks' ? (
          <ol className="min-h-[7rem] space-y-1 rounded-2xl border-2 border-dashed border-slate-200 p-2" aria-label="Your program">
            {program.length === 0 && <li className="p-2 text-center font-body text-sm font-bold text-slate-400">Tap blocks below to build your program.</li>}
            {program.map((b, i) => (
              <li key={i} className="flex items-center justify-between rounded-xl bg-indigo-100 px-3 py-1.5 font-display font-extrabold text-indigo-900">
                <span>{i + 1}. {BLOCK[b].icon} {BLOCK[b].label}</span>
                {!solved && (
                  <button type="button" onClick={() => setProgram((p) => p.filter((_, j) => j !== i))} aria-label={`Remove step ${i + 1}`} className="grid h-8 w-8 place-items-center rounded-full hover:bg-indigo-200">✕</button>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <pre className="min-h-[7rem] overflow-x-auto rounded-2xl bg-slate-900 p-3 font-mono text-sm leading-relaxed text-emerald-300" aria-label={`Your program in ${view}`}>
            {view === 'python' ? toPython(program) : toJavaScript(program)}
          </pre>
        )}

        <div className="mt-2 grid grid-cols-3 gap-2">
          {(Object.keys(BLOCK) as Block[]).map((b) => (
            <button key={b} type="button" onClick={() => add(b)} disabled={solved || program.length >= setup.maxBlocks}
              className="min-h-12 rounded-2xl bg-indigo-600 px-2 font-display text-sm font-extrabold text-white disabled:opacity-40">
              {BLOCK[b].icon} {BLOCK[b].label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-right font-body text-xs font-bold text-slate-400">{program.length}/{setup.maxBlocks} blocks</p>

        {!solved && (
          <div className="mt-1 flex gap-2">
            <button type="button" onClick={() => setProgram([])} className="min-h-12 flex-1 rounded-full bg-slate-100 font-display font-extrabold text-slate-600">Clear</button>
            <button type="button" onClick={() => onRun(program)} disabled={busy || program.length === 0}
              className="min-h-12 flex-[2] rounded-full bg-emerald-600 font-display text-lg font-extrabold text-white disabled:opacity-50">
              ▶ Run
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
