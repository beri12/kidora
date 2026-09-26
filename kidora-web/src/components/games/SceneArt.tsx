'use client';

import { motion } from 'framer-motion';

/**
 * A labelled animal cell. Each organelle is a button with its name, so the
 * child can answer by tapping the part itself (or use the option buttons).
 */
export function CellDiagram({ options, onPick, disabled }: { options: string[]; onPick: (i: number) => void; disabled: boolean }) {
  const parts: { name: string; el: React.ReactNode; label: [number, number] }[] = [
    { name: 'Cell membrane', el: <ellipse cx="160" cy="95" rx="150" ry="82" fill="#FDE68A" stroke="#D97706" strokeWidth="6" />, label: [40, 26] },
    { name: 'Cytoplasm', el: <ellipse cx="160" cy="95" rx="142" ry="74" fill="#FEF3C7" />, label: [230, 150] },
    { name: 'Nucleus', el: <circle cx="150" cy="92" r="32" fill="#A78BFA" stroke="#6D28D9" strokeWidth="3" />, label: [150, 96] },
    { name: 'Mitochondria', el: <g><ellipse cx="240" cy="70" rx="26" ry="12" fill="#FB923C" /><path d="M218 70 q6 -8 12 0 t12 0 t12 0 t10 0" stroke="#9A3412" fill="none" strokeWidth="2" /></g>, label: [240, 48] },
  ];
  return (
    <svg viewBox="0 0 320 190" className="mt-3 w-full" role="group" aria-label="Animal cell. Tap a part.">
      {parts.map((p) => {
        const i = options.indexOf(p.name);
        return (
          <motion.g key={p.name} role="button" aria-label={p.name} tabIndex={disabled || i < 0 ? -1 : 0}
            whileHover={disabled ? undefined : { scale: 1.03 }} style={{ cursor: disabled ? 'default' : 'pointer', transformOrigin: 'center' }}
            onClick={() => !disabled && i >= 0 && onPick(i)}
            onKeyDown={(e) => { if (!disabled && i >= 0 && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onPick(i); } }}>
            {p.el}
          </motion.g>
        );
      })}
      {parts.map((p) => (
        <text key={`t-${p.name}`} x={p.label[0]} y={p.label[1]} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1F2937" pointerEvents="none">{p.name}</text>
      ))}
    </svg>
  );
}

/** Sun → grass → zebra → lion, with energy flowing along the arrows. */
export function SavannaChain() {
  const steps = [['☀️', 'Sun'], ['🌾', 'Grass'], ['🦓', 'Zebra'], ['🦁', 'Lion']];
  return (
    <div className="mt-3 flex items-center justify-between rounded-2xl bg-gradient-to-r from-amber-50 to-lime-50 p-3" aria-label="Food chain: sun, grass, zebra, lion">
      {steps.map(([e, n], i) => (
        <div key={n} className="flex items-center gap-1 sm:gap-3">
          <motion.div className="text-center" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.12 }}>
            <div className="text-3xl sm:text-4xl" aria-hidden>{e}</div>
            <div className="font-body text-xs font-extrabold text-slate-600">{n}</div>
          </motion.div>
          {i < steps.length - 1 && <span className="font-display text-xl text-amber-600" aria-hidden>→</span>}
        </div>
      ))}
    </div>
  );
}
