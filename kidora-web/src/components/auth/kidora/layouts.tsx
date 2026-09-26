'use client';

import { useRef, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { BookOpen, Calculator, Code2, FlaskConical, Landmark } from 'lucide-react';
import { useGsap } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { KidHero, RobotBuddy, SavannaScene, Sparkle, Star } from './illustrations';
import { KidoraLogo } from './ui';

const SUBJECTS = [
  { name: 'Math', icon: Calculator, cls: 'bg-sky-500' },
  { name: 'Science', icon: FlaskConical, cls: 'bg-emerald-500' },
  { name: 'Coding', icon: Code2, cls: 'bg-violet-500' },
  { name: 'English', icon: BookOpen, cls: 'bg-amber-500' },
  { name: 'History', icon: Landmark, cls: 'bg-rose-500' },
];

/**
 * The page entrance every auth screen shares: the card rises in, its rows
 * stagger after it. Elements opt in with data-anim="card" / data-anim="row".
 * Under prefers-reduced-motion useGsap does nothing and everything is simply there.
 */
function useAuthEntrance(scope: React.RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useGsap(() => {
    gsap.from('[data-anim="card"]', { y: 28, opacity: 0, duration: 0.6, ease: 'power3.out' });
    gsap.from('[data-anim="row"]', { y: 14, opacity: 0, duration: 0.45, ease: 'power2.out', stagger: 0.05, delay: 0.15 });
  }, scope, deps);
}

/**
 * Sign-up: the illustrated world on the left (laptop and up), the form on the
 * right. On a phone the world shrinks to a header above the form.
 */
export function SplitAuthLayout({ children, stepKey }: { children: ReactNode; stepKey?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useGsap(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('[data-hero="scene"]', { scale: 1.08, opacity: 0, duration: 1 })
      .from('[data-hero="text"] > *', { y: 24, opacity: 0, stagger: 0.08, duration: 0.6 }, 0.2)
      .from('[data-hero="kid"]', { y: 80, opacity: 0, duration: 0.8, ease: 'back.out(1.4)' }, 0.35)
      .from('[data-hero="robot"]', { x: 60, opacity: 0, duration: 0.7 }, 0.55)
      .from('[data-hero="pill"]', { x: 40, opacity: 0, stagger: 0.08, duration: 0.5, ease: 'back.out(1.6)' }, 0.6);
    // Gentle, endless floating once they are in.
    gsap.to('[data-hero="robot"]', { y: -12, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1.3 });
    gsap.to('[data-hero="star"]', { rotation: 18, scale: 1.12, duration: 1.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    gsap.utils.toArray<HTMLElement>('[data-hero="pill"]').forEach((el, i) => {
      gsap.to(el, { y: i % 2 ? 6 : -6, duration: 2 + i * 0.25, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1.4 + i * 0.1 });
    });
  }, root);
  useAuthEntrance(root, [stepKey]);

  return (
    <div ref={root} className="min-h-[100dvh] bg-[#F4F2FB] lg:p-5">
      <div className="mx-auto grid min-h-[100dvh] max-w-[1280px] overflow-hidden bg-white lg:min-h-[calc(100dvh-2.5rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:rounded-[28px] lg:shadow-[0_30px_80px_-40px_rgba(61,37,174,.45)]">
        {/* The world (laptop and up) */}
        <aside className="relative hidden overflow-hidden lg:block" aria-label="About Kidora">
          <div data-hero="scene" className="absolute inset-0"><SavannaScene className="h-full w-full" /></div>
          <div className="relative z-10 flex h-full flex-col p-10 xl:p-12">
            <div data-hero="text" className="max-w-sm">
              <KidoraLogo size="lg" className="items-start" />
              <h2 className="mt-8 font-display text-[2.6rem] font-extrabold leading-[1.05] text-[#101340]">A brighter future<br />for every child</h2>
              <p className="mt-4 font-body text-base font-semibold leading-relaxed text-[#1E2455]">
                AI-powered, gamified learning for African children. Explore, learn and grow through fun games,
                interactive lessons and personalised support.
              </p>
            </div>

            <ul className="absolute right-8 top-[38%] flex flex-col items-end gap-3 xl:right-12" aria-label="Subjects">
              {SUBJECTS.map(({ name, icon: Icon, cls }) => (
                <li key={name} data-hero="pill" className={cn('flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 font-body text-sm font-extrabold text-white shadow-lg', cls)}>
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white/25"><Icon className="h-4 w-4" aria-hidden /></span>
                  {name}
                </li>
              ))}
              <li data-hero="pill" className="pr-2 font-body text-sm font-extrabold italic text-[#101340]">… and more!</li>
            </ul>

            <div data-hero="kid" className="absolute bottom-0 left-2 w-[58%] max-w-[360px]"><KidHero className="w-full drop-shadow-xl" /></div>
            <div data-hero="robot" className="absolute bottom-[26%] left-[52%] w-24 xl:w-28"><RobotBuddy className="w-full drop-shadow-lg" /></div>
            <div data-hero="star" className="absolute left-[46%] top-[44%] w-12"><Star className="w-full drop-shadow" /></div>
            <Sparkle className="absolute right-[34%] top-[8%] w-5" color="#fff" />
            <Sparkle className="absolute right-8 top-[70%] w-4" color="#60A5FA" />
          </div>
        </aside>

        {/* The form */}
        <main className="relative flex flex-col justify-center px-4 py-8 sm:px-10 lg:px-14 xl:px-20">
          <div className="mb-6 flex flex-col items-center lg:hidden">
            <KidoraLogo size="md" />
            <div className="relative mt-3 h-28 w-40" aria-hidden>
              <div className="absolute inset-0 rounded-[40px] bg-gradient-to-br from-sky-200 via-iris-100 to-amber-100" />
              <KidHero className="absolute bottom-0 left-2 h-32 w-auto" />
              <RobotBuddy className="absolute -right-2 top-2 h-14 w-auto" />
              <Star className="absolute -left-3 top-1 h-6 w-6" />
            </div>
          </div>
          <div data-anim="card" className="mx-auto w-full max-w-[440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

/**
 * Log in, role choice, profile, codes: one white card on a soft background
 * with a few floating learning shapes.
 */
export function CenteredAuthLayout({ children, wide, logo = true, stepKey }: { children: ReactNode; wide?: boolean; logo?: boolean; stepKey?: string }) {
  const root = useRef<HTMLDivElement>(null);
  useGsap(() => {
    gsap.utils.toArray<HTMLElement>('[data-float]').forEach((el, i) => {
      gsap.to(el, { y: i % 2 ? 14 : -14, rotation: i % 2 ? -8 : 8, duration: 3 + i * 0.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    });
  }, root);
  useAuthEntrance(root, [stepKey]);

  return (
    <div ref={root} className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-br from-[#F1EEFF] via-[#F8F7FF] to-[#EAF6FF] px-4 py-8 sm:py-12">
      {/* Floating shapes (decorative) */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div data-float className="absolute left-[6%] top-[12%] font-display text-4xl font-extrabold text-sky-300">+</div>
        <div data-float className="absolute left-[10%] top-[62%] h-14 w-14 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 opacity-70" />
        <div data-float className="absolute right-[8%] top-[18%] font-display text-4xl font-extrabold text-violet-300">÷</div>
        <div data-float className="absolute right-[12%] top-[70%] h-16 w-16 rounded-full bg-gradient-to-br from-violet-300 to-fuchsia-300 opacity-60 shadow-[inset_-6px_-6px_0_rgba(0,0,0,.08)]" />
        <div data-float className="absolute left-[18%] top-[86%] font-mono text-2xl font-bold text-emerald-300">{'</>'}</div>
        <div data-float className="absolute right-[22%] top-[6%]"><Star className="h-8 w-8" /></div>
        <div data-float className="absolute left-[24%] top-[4%]"><Sparkle className="h-5 w-5" color="#A78BFA" /></div>
      </div>

      <div
        data-anim="card"
        className={cn(
          'relative mx-auto w-full rounded-[28px] border border-white bg-white px-5 py-7 shadow-[0_24px_70px_-36px_rgba(61,37,174,.45)] sm:px-10 sm:py-10',
          wide ? 'max-w-[760px]' : 'max-w-[480px]',
        )}
      >
        {logo && <div className="mb-5 flex justify-center"><KidoraLogo size="md" /></div>}
        {children}
      </div>
    </div>
  );
}
