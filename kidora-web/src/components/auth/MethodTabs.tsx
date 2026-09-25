'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { prefersReducedMotion } from '@/lib/motion';

export type AuthMethod = 'phone' | 'email';

const TABS: { id: AuthMethod; label: string; icon: string }[] = [
  { id: 'phone', label: 'Phone', icon: '📱' },
  { id: 'email', label: 'Email', icon: '✉️' },
];

/** Phone | Email switch. The highlight slides between the two with GSAP. */
export function MethodTabs({ value, onChange }: { value: AuthMethod; onChange: (m: AuthMethod) => void }) {
  const pill = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  useEffect(() => {
    const left = value === 'phone' ? '4px' : '50%';
    if (first.current || prefersReducedMotion()) {
      gsap.set(pill.current, { left });
      first.current = false;
      return;
    }
    gsap.to(pill.current, { left, duration: 0.45, ease: 'back.out(1.6)' });
    gsap.fromTo(pill.current, { scaleX: 1.12 }, { scaleX: 1, duration: 0.45, ease: 'elastic.out(1, 0.5)' });
  }, [value]);

  return (
    <div role="tablist" aria-label="Sign-up method" className="relative mb-5 grid grid-cols-2 rounded-2xl bg-brand-100 p-1">
      <span ref={pill} aria-hidden className="absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-card" style={{ left: 4 }} />
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={
            'relative z-10 flex items-center justify-center gap-1.5 rounded-xl py-2.5 font-display font-extrabold transition-colors ' +
            (value === t.id ? 'text-brand-900' : 'text-brand-500 hover:text-brand-700')
          }
        >
          <span aria-hidden>{t.icon}</span> {t.label}
        </button>
      ))}
    </div>
  );
}
