'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { LevelSummary } from '@/lib/api/games';
import type { GameSettings, Quality } from '@/lib/games/settings';
import type { WorldTheme } from '@/lib/games/worlds';

/** Top bar during play: who you are, the level, XP and streak, and a pause button. */
export function GameHUD({ name, level, xp, streak, solved, total, progress, onPause }: {
  name: string; level: string; xp: number; streak: number; solved: number; total: number; progress: number; onPause: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/90 py-1 pl-1 pr-3 shadow">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-lg" aria-hidden>🧒</span>
          <span className="max-w-[7rem] truncate font-display text-sm font-extrabold text-slate-800">{name}</span>
        </div>
        <div className="rounded-full bg-white/90 px-4 py-2 text-center font-display text-sm font-extrabold text-slate-800 shadow">{level}</div>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-white/90 px-3 py-2 font-display text-sm font-extrabold text-amber-600 shadow" aria-label={`${xp} XP earned`}>⭐ {xp} XP</div>
          {streak >= 2 && <div className="rounded-full bg-orange-500 px-3 py-2 font-display text-sm font-extrabold text-white shadow" aria-label={`Streak ${streak}`}>🔥 ×{streak}</div>}
          <button type="button" onClick={onPause} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-white/90 text-xl shadow outline-none focus-visible:ring-4 focus-visible:ring-brand-300" aria-label="Pause">⏸</button>
        </div>
      </div>
      <div className="mx-auto mt-2 max-w-md" aria-label={`${solved} of ${total} challenges done`}>
        <div className="h-3 overflow-hidden rounded-full bg-white/70">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" animate={{ width: `${Math.max(progress * 100, (solved / total) * 100)}%` }} transition={{ duration: 0.3 }} />
        </div>
        <p className="mt-1 text-center font-body text-xs font-extrabold text-slate-700 drop-shadow">🗝️ {solved}/{total} gates open</p>
      </div>
    </div>
  );
}

/** Hold-to-walk buttons for touch screens (and mice). Keyboard: ↑/W and ↓/S. */
export function WalkPad({ onChange, disabled }: { onChange: (dir: 'forward' | 'back', on: boolean) => void; disabled: boolean }) {
  const bind = (dir: 'forward' | 'back') => ({
    onPointerDown: (e: React.PointerEvent) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); onChange(dir, true); },
    onPointerUp: () => onChange(dir, false),
    onPointerCancel: () => onChange(dir, false),
    onPointerLeave: () => onChange(dir, false),
  });
  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-20 flex flex-col items-center gap-2 select-none" style={{ touchAction: 'none' }}>
      <button type="button" disabled={disabled} {...bind('forward')} className="grid h-20 w-20 place-items-center rounded-full bg-white/90 text-3xl shadow-lg active:scale-95 disabled:opacity-40" aria-label="Walk forward (hold)">⬆️</button>
      <button type="button" disabled={disabled} {...bind('back')} className="grid h-14 w-14 place-items-center rounded-full bg-white/80 text-xl shadow active:scale-95 disabled:opacity-40" aria-label="Walk back (hold)">⬇️</button>
    </div>
  );
}

export function PauseMenu({ settings, onChange, onResume, onRestart, exitHref }: {
  settings: GameSettings; onChange: (p: Partial<GameSettings>) => void; onResume: () => void; onRestart: () => void; exitHref: string;
}) {
  const [tab, setTab] = useState<'menu' | 'settings'>('menu');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onResume(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onResume]);
  const toggle = (k: keyof GameSettings, label: string) => (
    <label className="flex min-h-12 items-center justify-between gap-3 font-body font-bold text-slate-700">
      {label}
      <input type="checkbox" checked={Boolean(settings[k])} onChange={(e) => onChange({ [k]: e.target.checked } as Partial<GameSettings>)} className="h-6 w-6 accent-violet-600" />
    </label>
  );
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2 }} className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl">
        <h2 id="pause-title" className="text-center font-display text-3xl font-extrabold text-slate-900">⏸ Paused</h2>
        <p className="mt-1 text-center font-body text-sm font-bold text-slate-500">Take your time — pausing never costs anything.</p>
        {tab === 'menu' ? (
          <div className="mt-5 space-y-3">
            <button autoFocus onClick={onResume} className="min-h-14 w-full rounded-full bg-emerald-600 font-display text-lg font-extrabold text-white">▶ Resume</button>
            <button onClick={onRestart} className="min-h-12 w-full rounded-full bg-slate-100 font-display font-extrabold text-slate-700">↻ Restart level</button>
            <button onClick={() => setTab('settings')} className="min-h-12 w-full rounded-full bg-slate-100 font-display font-extrabold text-slate-700">⚙️ Settings & accessibility</button>
            <Link href={exitHref} className="flex min-h-12 w-full items-center justify-center rounded-full bg-slate-100 font-display font-extrabold text-slate-700">🚪 Exit to world</Link>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {toggle('sound', '🔊 Sound effects')}
            {toggle('reducedMotion', '🧘 Reduce motion')}
            {toggle('largeText', '🔠 Bigger text')}
            {toggle('highContrast', '🌓 High contrast')}
            <label className="flex min-h-12 items-center justify-between gap-3 font-body font-bold text-slate-700">
              🎮 Graphics
              <select value={settings.quality} onChange={(e) => onChange({ quality: e.target.value as Quality })} className="min-h-10 rounded-xl border-2 border-slate-200 px-2 font-bold">
                <option value="LOW">Low (faster)</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option>
              </select>
            </label>
            <p className="pt-3 font-body text-xs font-bold text-slate-400">Keys: ↑/W walk · ↓/S back · 1–4 answer · Esc pause</p>
            <button onClick={() => setTab('menu')} className="mt-3 min-h-12 w-full rounded-full bg-slate-100 font-display font-extrabold text-slate-700">← Back</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/** 30-second interactive tutorial: walk, reach a gate, answer. */
export function Tutorial({ theme, onDone }: { theme: WorldTheme; onDone: () => void }) {
  const steps = [
    { icon: '⬆️', text: 'Hold the ⬆️ button (or ↑ / W) to walk along the path.' },
    { icon: '🔒', text: 'Every glowing gate has a challenge. Solve it to open the gate.' },
    { icon: '🤖', text: 'Stuck? Ask Kai for a hint — mistakes help you learn!' },
    { icon: '💰', text: `Open every gate to reach the treasure chest in ${theme.name}!` },
  ];
  const [i, setI] = useState(0);
  const s = steps[i];
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label="How to play">
      <motion.div key={i} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.25 }} className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-2xl">
        <div className="text-6xl" aria-hidden>{s.icon}</div>
        <p className="mt-3 font-display text-xl font-extrabold text-slate-900">{s.text}</p>
        <p className="mt-2 font-body text-sm font-bold text-slate-400">{i + 1} / {steps.length}</p>
        <div className="mt-4 flex gap-2">
          <button onClick={onDone} className="min-h-12 flex-1 rounded-full bg-slate-100 font-display font-extrabold text-slate-600">Skip</button>
          <button autoFocus onClick={() => (i + 1 < steps.length ? setI(i + 1) : onDone())} className="min-h-12 flex-[2] rounded-full bg-brand-700 font-display text-lg font-extrabold text-white">
            {i + 1 < steps.length ? 'Next →' : "I'm ready! 🚀"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function LoadingScreen({ theme, progress }: { theme: WorldTheme; progress: number }) {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center" style={{ background: `linear-gradient(${theme.sky[0]}, ${theme.sky[1]})` }} role="status" aria-live="polite">
      <div className="w-full max-w-xs text-center">
        <motion.div className="text-7xl" animate={{ y: [0, -10, 0] }} transition={{ duration: 1.2, repeat: Infinity }} aria-hidden>{theme.emoji}</motion.div>
        <p className="mt-3 font-display text-2xl font-extrabold text-slate-900">🌟 Preparing your adventure…</p>
        <div className="mx-auto mt-4 h-3 w-full overflow-hidden rounded-full bg-white/70">
          <motion.div className="h-full rounded-full bg-brand-600" animate={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 font-body text-sm font-bold text-slate-600">{progress < 60 ? 'Loading world' : 'Getting your character ready…'}</p>
      </div>
    </div>
  );
}

export function ErrorScreen({ message, onRetry, backHref, onSimple }: { message?: string; onRetry: () => void; backHref: string; onSimple?: () => void }) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-sky-50 p-4" role="alert">
      <div className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-xl">
        <div className="text-6xl" aria-hidden>🌧️</div>
        <p className="mt-3 font-display text-2xl font-extrabold text-slate-900">Something went wrong loading this adventure.</p>
        {message && <p className="mt-1 font-body font-bold text-slate-500">{message}</p>}
        <div className="mt-5 space-y-2">
          <button onClick={onRetry} className="min-h-12 w-full rounded-full bg-brand-700 font-display text-lg font-extrabold text-white">↻ Try again</button>
          {onSimple && <button onClick={onSimple} className="min-h-12 w-full rounded-full bg-slate-100 font-display font-extrabold text-slate-700">Play without 3D</button>}
          <Link href={backHref} className="flex min-h-12 w-full items-center justify-center rounded-full bg-slate-100 font-display font-extrabold text-slate-700">← Back to games</Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Level complete. The bonus wheel only appears when it was earned by
 * learning, and it spins to the prize the server already chose — nothing is
 * bought, wagered or random at the child's expense.
 */
export function LevelComplete({ summary, gameHref, onNext, onReplay }: { summary: LevelSummary; gameHref: string; onNext?: () => void; onReplay: () => void }) {
  const [spun, setSpun] = useState(!summary.bonus);
  return (
    <div className="absolute inset-0 z-40 grid place-items-center overflow-y-auto bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="done-title">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }} className="w-full max-w-md rounded-[32px] bg-white p-6 text-center shadow-2xl">
        <h2 id="done-title" className="font-display text-3xl font-extrabold text-slate-900">🎉 Level complete!</h2>
        <div className="mt-2 text-4xl" aria-label={`${summary.stars} of 3 stars`}>
          {[1, 2, 3].map((n) => (
            <motion.span key={n} className="inline-block" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15 * n }}>{n <= summary.stars ? '⭐' : '☆'}</motion.span>
          ))}
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="XP" value={`+${summary.xpEarned}`} />
          <Stat label="Accuracy" value={`${summary.accuracy}%`} />
          <Stat label="Best streak" value={`🔥 ${summary.bestStreak}`} />
        </dl>

        {summary.bonus && <BonusWheel labels={summary.bonusWheel} index={summary.bonus.index} onDone={() => setSpun(true)} />}
        {spun && summary.bonus && <p className="mt-2 font-display text-lg font-extrabold text-amber-600" role="status">Bonus: {summary.bonus.label}!</p>}
        {summary.badge && spun && (
          <motion.p initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-3 rounded-2xl bg-amber-50 p-3 font-display text-lg font-extrabold text-amber-800">
            🏆 New badge: {summary.badge.glyph} {summary.badge.name}
          </motion.p>
        )}
        {summary.xpEarned === 0 && (
          <p className="mt-3 font-body text-sm font-bold text-slate-500">Take your time on each challenge to earn XP next round.</p>
        )}

        <div className="mt-5 space-y-2">
          {onNext && <button autoFocus onClick={onNext} className="min-h-14 w-full rounded-full bg-emerald-600 font-display text-lg font-extrabold text-white">Continue →</button>}
          <button onClick={onReplay} className="min-h-12 w-full rounded-full bg-slate-100 font-display font-extrabold text-slate-700">↻ Practice again</button>
          <Link href={gameHref} className="flex min-h-12 w-full items-center justify-center rounded-full bg-slate-100 font-display font-extrabold text-slate-700">← Back to world</Link>
        </div>
      </motion.div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-2">
      <dt className="font-body text-xs font-bold text-slate-500">{label}</dt>
      <dd className="font-display text-lg font-extrabold text-slate-900">{value}</dd>
    </div>
  );
}

const WHEEL_COLORS = ['#FDE68A', '#BFDBFE', '#BBF7D0', '#FBCFE8', '#DDD6FE', '#FED7AA'];

function BonusWheel({ labels, index, onDone }: { labels: string[]; index: number; onDone: () => void }) {
  const n = labels.length;
  const seg = 360 / n;
  // Land the chosen segment under the pointer at the top.
  const end = 360 * 4 + (360 - (index * seg + seg / 2));
  return (
    <div className="mt-4">
      <p className="font-display text-lg font-extrabold text-amber-600">⭐ Bonus challenge earned! ⭐</p>
      <div className="relative mx-auto mt-2 h-44 w-44">
        <div className="absolute left-1/2 top-[-6px] z-10 -translate-x-1/2 text-2xl" aria-hidden>🔻</div>
        <motion.svg viewBox="-100 -100 200 200" className="h-full w-full" initial={{ rotate: 0 }} animate={{ rotate: end }} transition={{ duration: 2.2, ease: [0.15, 0.85, 0.3, 1] }} onAnimationComplete={onDone} aria-hidden>
          {labels.map((l, i) => {
            const a0 = ((i * seg - 90) * Math.PI) / 180, a1 = (((i + 1) * seg - 90) * Math.PI) / 180;
            const mid = ((i + 0.5) * seg - 90) * (Math.PI / 180);
            return (
              <g key={i}>
                <path d={`M0 0 L${95 * Math.cos(a0)} ${95 * Math.sin(a0)} A95 95 0 0 1 ${95 * Math.cos(a1)} ${95 * Math.sin(a1)} Z`} fill={WHEEL_COLORS[i % WHEEL_COLORS.length]} stroke="#fff" strokeWidth="2" />
                <text x={58 * Math.cos(mid)} y={58 * Math.sin(mid)} fontSize="11" fontWeight="800" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${(i + 0.5) * seg} ${58 * Math.cos(mid)} ${58 * Math.sin(mid)})`}>
                  {l.replace('Treasure: ', '💰')}
                </text>
              </g>
            );
          })}
          <circle r="14" fill="#fff" stroke="#F59E0B" strokeWidth="3" />
        </motion.svg>
      </div>
      <p className="mt-1 font-body text-xs font-bold text-slate-400">Earned by learning — always free.</p>
    </div>
  );
}
