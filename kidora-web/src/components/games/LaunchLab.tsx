'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { AttemptResult, LaunchSetup } from '@/lib/api/games';

interface Props {
  setup: LaunchSetup;
  busy: boolean;
  solved: boolean;
  result: AttemptResult | null;
  onLaunch: (a: { angle: number; power: number }) => void;
}

/**
 * The physics playground: choose an angle and a power, launch, and watch the
 * arc. The arc drawn is the same ideal-projectile formula the server uses to
 * judge the shot, so what the child sees is what is scored.
 */
export function LaunchLab({ setup, busy, solved, result, onLaunch }: Props) {
  const [angle, setAngle] = useState(30);
  const [power, setPower] = useState(12);
  const [shot, setShot] = useState<{ angle: number; power: number } | null>(null);

  const maxX = Math.max(setup.target[1] * 1.6, 30);
  const W = 320, H = 170, G = 150; // svg size and ground line

  const arc = useMemo(() => {
    if (!shot) return '';
    const th = (shot.angle * Math.PI) / 180;
    const vx = shot.power * Math.cos(th), vy = shot.power * Math.sin(th);
    const tEnd = (2 * vy) / setup.gravity;
    const pts: string[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = (tEnd * i) / 40;
      const x = vx * t, y = vy * t - 0.5 * setup.gravity * t * t;
      pts.push(`${(x / maxX) * W},${G - (y / maxX) * W}`);
    }
    return `M ${pts.join(' L ')}`;
  }, [shot, setup.gravity, maxX]);

  const tx = (m: number) => (m / maxX) * W;

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-2xl bg-gradient-to-b from-sky-100 to-sky-50" role="img"
        aria-label={`Target between ${setup.target[0]} and ${setup.target[1]} metres.${result?.result.distance !== undefined ? ` Last shot landed at ${result.result.distance} metres.` : ''}`}>
        <rect x="0" y={G} width={W} height={H - G} fill={setup.gravity < 5 ? '#CBD5E1' : '#86EFAC'} />
        <rect x={tx(setup.target[0])} y={G - 4} width={tx(setup.target[1]) - tx(setup.target[0])} height="8" rx="3" fill="#F59E0B" />
        <text x={(tx(setup.target[0]) + tx(setup.target[1])) / 2} y={G - 10} textAnchor="middle" fontSize="16">🧺</text>
        {[0, 10, 20, 30, 40, 50, 60, 70].filter((m) => m <= maxX).map((m) => (
          <text key={m} x={tx(m)} y={H - 4} fontSize="9" fill="#475569" textAnchor="middle">{m}m</text>
        ))}
        <g transform={`translate(4 ${G}) rotate(${-angle})`}><rect x="0" y="-3" width="26" height="6" rx="3" fill="#7C3AED" /></g>
        {shot && <motion.path key={`${shot.angle}-${shot.power}`} d={arc} fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeDasharray="4 3"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: 'easeOut' }} />}
        {setup.gravity < 5 && <text x={W - 24} y="24" fontSize="18">🌙</text>}
      </svg>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="font-body font-bold text-slate-700">
          Angle: <span className="font-display text-brand-700">{angle}°</span>
          <input type="range" min={setup.angle[0]} max={setup.angle[1]} value={angle} onChange={(e) => setAngle(Number(e.target.value))} disabled={solved} className="mt-1 w-full accent-violet-600" />
        </label>
        <label className="font-body font-bold text-slate-700">
          Power: <span className="font-display text-brand-700">{power}</span>
          <input type="range" min={setup.power[0]} max={setup.power[1]} step={0.5} value={power} onChange={(e) => setPower(Number(e.target.value))} disabled={solved} className="mt-1 w-full accent-violet-600" />
        </label>
      </div>
      {!solved && (
        <button type="button" disabled={busy} onClick={() => { setShot({ angle, power }); onLaunch({ angle, power }); }}
          className="mt-3 min-h-12 w-full rounded-full bg-violet-600 font-display text-lg font-extrabold text-white disabled:opacity-50">
          🚀 Launch
        </button>
      )}
      {result?.result.distance !== undefined && (
        <p className="mt-2 text-center font-body font-bold text-slate-600" role="status">Landed at {result.result.distance} m</p>
      )}
    </div>
  );
}
