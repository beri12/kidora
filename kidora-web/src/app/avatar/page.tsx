'use client';
import { useState } from 'react';
import { Navbar } from '@/components/navbar/Navbar';
import { Button } from '@/components/ui/button';
import { useAvatar } from '@/features/avatar/hooks';

const HAIR = ['short', 'long', 'curly', 'fantasy'];
const CLOTHES = ['school', 'explorer', 'scientist', 'space', 'magic'];
const SKIN = ['#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#FFDBAC'];
const PETS = ['🐶', '🐱', '🐉', '🦄', '🐼'];

export default function AvatarPage() {
  const { data: avatar, update } = useAvatar();
  const [saved, setSaved] = useState(false);

  // Local optimistic view falls back to server data.
  const a = avatar ?? { skinColor: SKIN[0], hair: 'short', clothes: 'school', pet: '🐶', accessories: [] as string[] };

  const set = (patch: Record<string, unknown>) => { update.mutate(patch); setSaved(false); };

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <div className="max-w-[1240px] mx-auto px-6 py-10 grid lg:grid-cols-[1fr_1.1fr_1fr] gap-6">
        {/* LEFT — categories */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border-2 border-brand-100 shadow-card p-5">
            <h3 className="font-display font-extrabold text-brand-900 mb-3">Skin</h3>
            <div className="flex gap-2 flex-wrap">
              {SKIN.map((c) => (
                <button key={c} onClick={() => set({ skinColor: c })}
                  className={`w-10 h-10 rounded-full border-4 ${a.skinColor === c ? 'border-brand-500' : 'border-white'}`} style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-3xl border-2 border-brand-100 shadow-card p-5">
            <h3 className="font-display font-extrabold text-brand-900 mb-3">Hair</h3>
            <div className="grid grid-cols-2 gap-2">
              {HAIR.map((h) => (
                <button key={h} onClick={() => set({ hair: h })}
                  className={`py-2 rounded-xl font-display font-extrabold text-sm capitalize ${a.hair === h ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-700'}`}>{h}</button>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER — preview */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-[2rem] p-8 flex flex-col items-center justify-center text-white">
          <div className="text-[140px] leading-none animate-bounce" style={{ filter: `drop-shadow(0 12px 0 rgba(0,0,0,.15))` }}>🐵</div>
          <div className="mt-4 text-6xl">{a.pet}</div>
          <div className="mt-6 px-5 py-2 rounded-full bg-white/20 font-display font-extrabold capitalize">{a.clothes} outfit</div>
        </div>

        {/* RIGHT — clothing, pets, save */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border-2 border-brand-100 shadow-card p-5">
            <h3 className="font-display font-extrabold text-brand-900 mb-3">Outfit</h3>
            <div className="grid grid-cols-2 gap-2">
              {CLOTHES.map((c) => (
                <button key={c} onClick={() => set({ clothes: c })}
                  className={`py-2 rounded-xl font-display font-extrabold text-sm capitalize ${a.clothes === c ? 'bg-grass-600 text-white' : 'bg-brand-100 text-brand-700'}`}>{c}</button>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-3xl border-2 border-brand-100 shadow-card p-5">
            <h3 className="font-display font-extrabold text-brand-900 mb-3">Companion pet</h3>
            <div className="flex gap-2 flex-wrap">
              {PETS.map((p) => (
                <button key={p} onClick={() => set({ pet: p })}
                  className={`w-12 h-12 rounded-2xl text-2xl grid place-items-center ${a.pet === p ? 'bg-brand-600' : 'bg-brand-100'}`}>{p}</button>
              ))}
            </div>
          </div>
          <Button variant="grass" className="w-full" onClick={() => { update.mutate({}, { onSuccess: () => setSaved(true) }); }}>
            {saved ? 'Saved! 🎉' : 'Save Avatar'}
          </Button>
          <p className="text-center font-body font-bold text-brand-400 text-xs">Synced to Kidora API · PUT /avatar</p>
        </div>
      </div>
    </div>
  );
}
