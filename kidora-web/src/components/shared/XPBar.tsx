import type { StudentWallet } from '@/types';

/** The student HUD: level, XP into the level, coins, gems and streak. */
export function XPBar({ wallet, streak }: { wallet: StudentWallet; streak?: number }) {
  const into = Math.max(0, wallet.xpIntoLevel);
  const need = Math.max(1, wallet.xpForNextLevel - (wallet.level - 1) * 500);
  const pct = Math.min(100, Math.round((into / need) * 100));

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-[180px] flex-1">
        <div className="mb-1 flex justify-between font-display text-sm font-extrabold text-white/90">
          <span>⭐ Level {wallet.level}</span>
          <span>
            {into} / {need} XP
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Level ${wallet.level} progress`}
          className="h-4 overflow-hidden rounded-full bg-white/25"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 motion-safe:transition-all motion-safe:duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <ul className="flex gap-2 font-display text-sm font-extrabold text-white">
        <li className="rounded-2xl bg-white/20 px-3 py-2">🪙 {wallet.coins}</li>
        <li className="rounded-2xl bg-white/20 px-3 py-2">💎 {wallet.gems}</li>
        {typeof streak === 'number' && <li className="rounded-2xl bg-white/20 px-3 py-2">🔥 {streak}</li>}
      </ul>
    </div>
  );
}
