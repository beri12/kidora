'use client';
import Link from 'next/link';

const WORLDS = [
  { key: 'reading', name: 'Reading Forest', emoji: '🌲', color: 'from-grass-400 to-grass-600', done: 3, total: 4, lessons: ['Alphabet Adventure', 'Word Builder', 'Story Explorer', 'Reading Master'] },
  { key: 'math', name: 'Math Island', emoji: '🏝️', color: 'from-sky-400 to-sky-600', done: 2, total: 4, lessons: ['Numbers', 'Addition Adventure', 'Multiplication Mountain', 'Math Champion'] },
  { key: 'science', name: 'Science Planet', emoji: '🚀', color: 'from-brand-400 to-brand-700', done: 1, total: 4, lessons: ['Space Explorer', 'Animals', 'Human Body', 'Experiments'] },
  { key: 'coding', name: 'Coding City', emoji: '💻', color: 'from-amber-400 to-amber-600', done: 0, total: 4, lessons: ['Logic Games', 'Scratch Coding', 'Algorithms', 'Create Your Game'] },
  { key: 'art', name: 'Art Valley', emoji: '🎨', color: 'from-rose-400 to-rose-600', done: 0, total: 4, lessons: ['Drawing', 'Colors', 'Creativity', 'Digital Art'] },
];

export default function KidLearnPage() {
  return (
    <div className="min-h-screen font-body text-brand-900 relative overflow-hidden" style={{ background: 'linear-gradient(180deg,#DBEAFE,#F1ECFF 40%)' }}>
      {/* ambient */}
      <div className="pointer-events-none absolute top-10 left-[8%] text-6xl opacity-80 animate-bob">☁️</div>
      <div className="pointer-events-none absolute top-24 right-[12%] text-7xl opacity-80 animate-bob" style={{ animationDelay: '1s' }}>☀️</div>

      {/* header */}
      <div className="max-w-[900px] mx-auto px-5 pt-7 flex items-center gap-3 flex-wrap relative z-10">
        <div className="flex items-center gap-2.5 bg-white rounded-2xl border-2 border-brand-100 px-4 py-2 shadow-card">
          <span className="text-2xl">🐵</span>
          <div><div className="font-display font-extrabold leading-none">Leo</div><div className="text-xs font-bold text-brand-500">Level 8</div></div>
        </div>
        <div className="flex gap-2 ml-auto font-display font-extrabold text-sm">
          <span className="bg-white rounded-2xl border-2 border-brand-100 px-3 py-2">⭐ 760</span>
          <span className="bg-white rounded-2xl border-2 border-brand-100 px-3 py-2">🪙 250</span>
          <span className="bg-white rounded-2xl border-2 border-brand-100 px-3 py-2">🔥 7</span>
        </div>
        <Link href="/kid/dashboard" className="px-4 py-2 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white font-display font-extrabold text-sm">🏠 Dashboard</Link>
      </div>

      <h1 className="font-display font-extrabold text-4xl text-center mt-6 mb-2 relative z-10">Your learning adventure 🗺️</h1>
      <p className="text-center font-bold text-brand-500 mb-8 relative z-10">Travel through magical worlds. Finish lessons to unlock the next!</p>

      {/* vertical path */}
      <div className="max-w-[720px] mx-auto px-5 pb-20 relative z-10">
        {WORLDS.map((w, i) => {
          const locked = i > 0 && WORLDS[i - 1].done < WORLDS[i - 1].total && w.done === 0;
          const pct = Math.round((w.done / w.total) * 100);
          const stars = Math.max(1, Math.round((w.done / w.total) * 3));
          return (
            <div key={w.key} className={'relative mb-6 ' + (i % 2 ? 'ml-auto mr-0' : '')} style={{ maxWidth: 480 }}>
              <div className={'rounded-[28px] p-6 text-white shadow-card animate-[fadeup_.5s_both] bg-gradient-to-br ' + w.color} style={{ animationDelay: i * 0.08 + 's', opacity: locked ? 0.6 : 1 }}>
                <div className="flex items-center gap-4">
                  <div className="text-6xl animate-bob" style={{ animationDelay: i * 0.3 + 's' }}>{locked ? '🔒' : w.emoji}</div>
                  <div className="flex-1">
                    <h3 className="font-display font-extrabold text-2xl leading-tight">{w.name}</h3>
                    <div className="text-lg">{'⭐'.repeat(stars)}<span className="opacity-40">{'⭐'.repeat(3 - stars)}</span></div>
                    <div className="font-bold text-sm opacity-90">{w.done}/{w.total} lessons · Next: {w.lessons[Math.min(w.done, w.total - 1)]}</div>
                  </div>
                </div>
                <div className="mt-4 h-3 rounded-full bg-white/25 overflow-hidden"><div className="h-full rounded-full bg-white/80" style={{ width: pct + '%' }} /></div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {w.lessons.map((l, li) => {
                    const lessonDone = li < w.done;
                    const lessonLock = li > w.done || locked;
                    return (
                      <div key={l} className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2 font-bold text-sm">
                        <span>{lessonDone ? '✅' : lessonLock ? '🔒' : '▶️'}</span><span className="truncate">{l}</span>
                      </div>
                    );
                  })}
                </div>
                {!locked && <Link href="/kid/dashboard" className="inline-block mt-4 px-5 py-2.5 rounded-2xl bg-white text-brand-800 font-display font-extrabold text-sm">Continue mission →</Link>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
