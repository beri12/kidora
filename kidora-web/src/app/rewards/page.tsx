'use client';
import confetti from 'canvas-confetti';
import { Navbar } from '@/components/navbar/Navbar';
import { Button } from '@/components/ui/button';
import { useRewards, usePurchase, useMissions, useAchievements } from '@/features/rewards/hooks';
import { useAvatarItems } from '@/features/avatar/hooks';

export default function RewardsPage() {
  const { data: wallet } = useRewards();
  const purchase = usePurchase();
  const { data: missions, complete } = useMissions();
  const { data: achievements } = useAchievements();
  const { data: items } = useAvatarItems();

  const w = wallet ?? { coins: 0, gems: 0, xp: 0, level: 1 };

  const buy = (id: string) => purchase.mutate(id, { onSuccess: () => confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } }) });

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <div className="max-w-[1240px] mx-auto px-6 py-10">
        {/* wallet header */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-3xl p-6 text-white flex flex-wrap gap-6 items-center">
          <div><div className="text-3xl font-display font-extrabold">🪙 {w.coins}</div><div className="font-body font-bold text-brand-100 text-sm">Coins</div></div>
          <div><div className="text-3xl font-display font-extrabold">💎 {w.gems}</div><div className="font-body font-bold text-brand-100 text-sm">Gems</div></div>
          <div><div className="text-3xl font-display font-extrabold">⭐ {w.xp} XP</div><div className="font-body font-bold text-brand-100 text-sm">Level {w.level}</div></div>
        </div>

        {/* missions */}
        <h2 className="font-display font-extrabold text-2xl text-brand-900 mt-8 mb-3">Daily Missions</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {(missions ?? []).map((m) => (
            <div key={m.id} className="bg-white rounded-2xl border-2 border-brand-100 shadow-card p-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="font-display font-extrabold text-brand-900">{m.title}</div>
                <div className="font-body font-bold text-brand-500 text-sm">+{m.rewardCoins} 🪙 · +{m.rewardXP} XP</div>
              </div>
              <Button size="sm" variant={m.completed ? 'ghost' : 'primary'} disabled={m.completed} onClick={() => complete.mutate(m.id)}>
                {m.completed ? 'Done ✓' : 'Complete'}
              </Button>
            </div>
          ))}
        </div>

        {/* shop */}
        <h2 className="font-display font-extrabold text-2xl text-brand-900 mt-8 mb-3">Shop</h2>
        <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {(items ?? []).map((it: any) => (
            <div key={it.id} className="bg-white rounded-2xl border-2 border-brand-100 shadow-card p-4 text-center">
              <div className="text-4xl mb-2">🎁</div>
              <div className="font-display font-extrabold text-brand-900">{it.name}</div>
              <div className="font-body font-bold text-xs uppercase tracking-wide mt-1" style={{ color: it.rarity === 'legendary' ? '#F59E0B' : '#8B5CF6' }}>{it.rarity}</div>
              <Button size="sm" className="w-full mt-3" onClick={() => buy(it.id)} disabled={w.coins < it.price}>Buy · {it.price} 🪙</Button>
            </div>
          ))}
        </div>

        {/* achievements */}
        <h2 className="font-display font-extrabold text-2xl text-brand-900 mt-8 mb-3">Achievements</h2>
        <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {(achievements ?? []).map((a) => (
            <div key={a.id} className={`rounded-2xl border-2 p-4 text-center ${a.unlockedAt ? 'bg-white border-grass-300' : 'bg-brand-100/50 border-brand-100 opacity-70'}`}>
              <div className="text-4xl mb-1">{a.unlockedAt ? '🏆' : '🔒'}</div>
              <div className="font-display font-extrabold text-brand-900 text-sm">{a.title}</div>
              <div className="font-body font-bold text-brand-500 text-xs mt-1">{a.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
