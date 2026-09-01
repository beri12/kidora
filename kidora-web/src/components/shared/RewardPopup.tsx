'use client';
import { useEffect, useRef } from 'react';
import type { RewardResult } from '@/types';
import { Button } from '@/components/ui/button';

/**
 * The celebration beat of the game loop.
 *
 * Confetti and the pop animation are skipped entirely when the visitor prefers
 * reduced motion — the reward still reads clearly as text.
 */
export function RewardPopup({
  reward,
  message,
  onClose,
}: {
  reward: RewardResult | null;
  message?: string;
  onClose: () => void;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (!reward || fired.current) return;
    fired.current = true;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    import('canvas-confetti')
      .then((m) =>
        m.default({
          particleCount: reward.levelUp ? 160 : 90,
          spread: 75,
          origin: { y: 0.65 },
          colors: ['#8B5CF6', '#16A34A', '#FACC15'],
        }),
      )
      .catch(() => {});
  }, [reward]);

  if (!reward) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-brand-900/45 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="Reward earned"
        className="w-full max-w-sm rounded-[28px] border-2 border-brand-100 bg-white p-8 text-center shadow-card motion-safe:animate-modal-pop"
      >
        <div className="text-6xl" aria-hidden>
          {reward.levelUp ? '🎉' : '⭐'}
        </div>
        <h2 className="mt-3 font-display text-2xl font-extrabold text-brand-900">
          {reward.levelUp ? `Level ${reward.level}!` : 'Nice work!'}
        </h2>
        {message && <p className="mt-1 font-body font-bold text-brand-500">{message}</p>}

        <ul className="mt-5 flex justify-center gap-3 font-display text-lg font-extrabold">
          <li className="rounded-2xl bg-amber-100 px-4 py-2 text-amber-700">+{reward.xp} XP</li>
          <li className="rounded-2xl bg-brand-100 px-4 py-2 text-brand-700">+{reward.coins} 🪙</li>
        </ul>

        {reward.badge && (
          <p className="mt-4 font-body font-bold text-grass-600">🏅 Badge unlocked: {reward.badge.name}</p>
        )}

        <Button className="mt-6 w-full" onClick={onClose} autoFocus>
          Keep going →
        </Button>
      </div>
    </div>
  );
}
