'use client';
import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ONBOARDING } from '@/constants/roles';
import { ROLE_HOME } from '@/constants';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

const AVATAR_COLORS = ['#8B5CF6', '#22C55E', '#38BDF8', '#FB7185', '#FACC15'];
const PETS = ['🐶', '🐱', '🐉', '🦄', '🐼'];
const GOALS = [
  { key: 'math', name: 'Math', emoji: '🔢' },
  { key: 'reading', name: 'Reading', emoji: '📖' },
  { key: 'science', name: 'Science', emoji: '🔬' },
  { key: 'coding', name: 'Coding', emoji: '💻' },
  { key: 'art', name: 'Art', emoji: '🎨' },
];

function OnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const roleKey = (params.get('role') || 'CHILD').toUpperCase();
  const steps = useMemo(() => ONBOARDING[roleKey] ?? ONBOARDING.CHILD, [roleKey]);
  // The signed-in account is the source of truth for where onboarding ends:
  // ?role= is a UI hint and mapping SCHOOL/DISTRICT onto ADMIN used to land a
  // school leader on the platform-admin dashboard, which their role cannot open.
  const user = useAuthStore((s) => s.user);
  const dashboard =
    (user && ROLE_HOME[user.role]) ??
    ROLE_HOME[roleKey as keyof typeof ROLE_HOME] ??
    '/';

  const [i, setI] = useState(0);
  const [data, setData] = useState<Record<string, string>>({});
  const [avatarColor, setAvatarColor] = useState(0);
  const [pet, setPet] = useState(0);
  const [goals, setGoals] = useState<Record<string, boolean>>({});
  const step = steps[i];
  const isLast = i === steps.length - 1;

  const set = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));
  const next = () => (isLast ? router.replace(dashboard) : setI(i + 1));
  const back = () => setI(Math.max(0, i - 1));

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-10 bg-[radial-gradient(circle_at_70%_0%,#DCFCE7,#F6F2FF_55%)]">
      {/* stepper */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, n) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={'grid h-9 w-9 place-items-center rounded-full font-display font-extrabold text-sm border-2 ' +
              (n <= i ? 'bg-gradient-to-br from-brand-600 to-brand-800 text-white border-brand-700' : 'bg-white text-brand-300 border-brand-100')}>
              {n < i ? '✓' : n + 1}
            </div>
            {n < steps.length - 1 && <div className={'w-8 h-[3px] rounded ' + (n < i ? 'bg-brand-600' : 'bg-brand-100')} />}
          </div>
        ))}
      </div>

      <div className="w-full max-w-lg bg-white rounded-[30px] border-2 border-brand-100 p-9 shadow-card animate-modal-pop">
        <h2 className="font-display font-extrabold text-2xl text-brand-900 text-center">{step.title}</h2>
        <p className="text-sm font-bold text-brand-500 text-center mt-1 mb-6">{step.subtitle}</p>

        {/* FIELDS */}
        {step.kind === 'fields' && step.fields?.map((f) => (
          <div key={f.key} className="mb-3">
            <Label>{f.label}</Label>
            <Input type={f.type ?? 'text'} value={data[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
          </div>
        ))}

        {/* AVATAR */}
        {step.kind === 'avatar' && (
          <div className="text-center">
            <div className="text-[90px] leading-none" style={{ filter: 'drop-shadow(0 10px 0 rgba(0,0,0,.08))' }}>🐵</div>
            <div className="text-4xl -mt-2">{PETS[pet]}</div>
            <div className="mt-4 text-xs font-display font-extrabold text-brand-600">Color</div>
            <div className="flex justify-center gap-2 mt-2">
              {AVATAR_COLORS.map((c, n) => (
                <button key={c} onClick={() => setAvatarColor(n)} style={{ background: c, borderColor: avatarColor === n ? '#3B0764' : '#fff' }} className="w-10 h-10 rounded-full border-4" />
              ))}
            </div>
            <div className="mt-4 text-xs font-display font-extrabold text-brand-600">Companion pet</div>
            <div className="flex justify-center gap-2 mt-2">
              {PETS.map((p, n) => (
                <button key={p} onClick={() => setPet(n)} className={'w-12 h-12 rounded-2xl text-2xl grid place-items-center ' + (pet === n ? 'bg-brand-600' : 'bg-brand-100')}>{p}</button>
              ))}
            </div>
          </div>
        )}

        {/* GOALS */}
        {step.kind === 'goals' && (
          <div className="grid grid-cols-2 gap-3">
            {GOALS.map((g) => {
              const on = !!goals[g.key];
              return (
                <button key={g.key} onClick={() => setGoals((s) => ({ ...s, [g.key]: !s[g.key] }))}
                  className={'flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left ' + (on ? 'bg-grass-50 border-grass-500' : 'bg-brand-50 border-brand-100')}>
                  <span className="text-2xl">{g.emoji}</span>
                  <span className="flex-1 font-display font-extrabold text-brand-900">{g.name}</span>
                  {on && <span className="text-grass-600 font-black">✓</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* INVITE (teacher) */}
        {step.kind === 'invite' && (
          <div className="text-center">
            <div className="text-xs font-display font-extrabold text-brand-600 mb-2">Your class code</div>
            <div className="inline-block rounded-2xl bg-brand-100 px-8 py-4 font-display font-extrabold text-3xl tracking-[0.3em] text-brand-800">KID-7Q2</div>
            <p className="text-sm font-bold text-brand-500 mt-3">Students join at kidora.com/join with this code.</p>
          </div>
        )}

        {/* DONE */}
        {step.kind === 'done' && (
          <div className="text-center">
            <div className="text-6xl animate-bob inline-block">🐵</div>
            <p className="font-body font-bold text-brand-600 mt-2">Everything's ready. Let's go!</p>
          </div>
        )}

        {/* nav */}
        <div className="flex gap-3 mt-8">
          {i > 0 && !isLast && (
            <button onClick={back} className="flex-1 py-3.5 rounded-2xl font-display font-extrabold text-brand-700 bg-brand-100">← Back</button>
          )}
          <Button onClick={next} variant={isLast ? 'grass' : 'primary'} className={i > 0 && !isLast ? 'flex-[2]' : 'w-full'}>
            {isLast ? 'Enter Kidora →' : 'Continue →'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingInner />
    </Suspense>
  );
}
