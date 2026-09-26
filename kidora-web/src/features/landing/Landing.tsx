'use client';

import Link from 'next/link';
import { useRef, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowRight, BarChart3, Bot, BookOpen, Calculator, Check, Code2, FlaskConical, Gamepad2, KeyRound,
  Landmark, Languages, LineChart, School, ShieldCheck, Sparkles, Trophy, UserPlus, Users,
} from 'lucide-react';

import { Navbar } from '@/components/navbar/Navbar';
import { Footer } from '@/components/footer/Footer';
import { KidHero, Person, RobotBuddy, SavannaScene, SchoolBuilding, Sparkle, Star } from '@/components/auth/kidora/illustrations';
import { coursesApi } from '@/lib/api/courses';
import { useIsoLayoutEffect } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { StartLearningButton } from './StartLearningButton';

const WORLDS = [
  { name: 'Math Island', blurb: 'Treasure hunts powered by numbers, fractions and patterns.', icon: Calculator, from: 'from-sky-400', to: 'to-blue-600', href: '/games/math-treasure-rush' },
  { name: 'Word Safari', blurb: 'Read, spell and build sentences with savanna friends.', icon: Languages, from: 'from-emerald-400', to: 'to-green-600', href: '/games/word-safari' },
  { name: 'Science Lab', blurb: 'Cells, food chains and launch experiments you control.', icon: FlaskConical, from: 'from-violet-400', to: 'to-purple-600', href: '/games/science-lab' },
  { name: 'Code City', blurb: 'Program robots with blocks, then see the Python.', icon: Code2, from: 'from-indigo-400', to: 'to-indigo-700', href: '/games/code-city' },
  { name: 'History Quest', blurb: 'Travel to Aksum, the Nile and great African kingdoms.', icon: Landmark, from: 'from-amber-400', to: 'to-orange-600', href: '/games/africa-history-quest' },
];

const STEPS = [
  { icon: UserPlus, title: 'Create an account', body: 'Sign up with email, Google, Facebook or TikTok in under a minute.' },
  { icon: Users, title: 'Choose your role', body: 'Student, parent, teacher or school — each gets their own space.' },
  { icon: Gamepad2, title: 'Learn through play', body: 'Courses, lessons, quizzes and 3D games that adapt to each child.' },
  { icon: LineChart, title: 'Watch progress grow', body: 'XP, badges and streaks for kids; clear reports for grown-ups.' },
];

const AUDIENCES: {
  key: string; eyebrow: string; title: string; body: string; points: string[]; cta: { label: string; href: string };
  bg: string; art: ReactNode;
}[] = [
  {
    key: 'student', eyebrow: 'For students', title: 'Every lesson feels like an adventure',
    body: 'Kids explore learning worlds, earn XP and badges, keep their streak alive and ask Kai for a hint whenever they are stuck.',
    points: ['Join a course with a code from your teacher', 'Games that get harder as you get better', 'Certificates when you finish a course'],
    cta: { label: 'Start as a student', href: '/auth/signup?role=STUDENT' }, bg: 'bg-sky-50',
    art: <Person className="h-full w-full" skin="#8A5234" hair="curls" shirt="#F59E0B" prop="backpack" />,
  },
  {
    key: 'parent', eyebrow: 'For parents', title: 'See how your child is really doing',
    body: 'Follow lessons, game levels, strengths and time spent — and add courses to your child’s list in a tap.',
    points: ['Progress and mastery by subject', 'Weekly learning minutes and streaks', 'A Family plan covers every child'],
    cta: { label: 'Start as a parent', href: '/auth/signup?role=PARENT' }, bg: 'bg-pink-50',
    art: <Person className="h-full w-full" skin="#A86B45" hair="long" hairColor="#3B2314" shirt="#EC4899" />,
  },
  {
    key: 'teacher', eyebrow: 'For teachers', title: 'Build a course, share one code',
    body: 'Create lessons, quizzes and assignments, then give your class a code like CPP-7K4M9X. Students join in seconds.',
    points: ['Course builder with video, reading and quizzes', 'Assign courses to students or whole classes', 'Class mastery and gradebook'],
    cta: { label: 'Start as a teacher', href: '/auth/signup?role=TEACHER' }, bg: 'bg-emerald-50',
    art: <Person className="h-full w-full" skin="#A86B45" hair="short" hairColor="#1F2937" shirt="#FFFFFF" glasses prop="book" />,
  },
  {
    key: 'school', eyebrow: 'For schools & districts', title: 'One place for the whole school',
    body: 'Verified school leaders manage students, teachers and classes, approve courses and see results across grades and schools.',
    points: ['Verified leadership accounts', 'School-only courses and plans', 'Analytics across classes and schools'],
    cta: { label: 'Bring Kidora to your school', href: '/auth/signup?role=SCHOOL_LEADER' }, bg: 'bg-violet-50',
    art: <SchoolBuilding className="h-full w-full" tone="violet" />,
  },
];

/**
 * The public home page. GSAP drives the entrance, the floating shapes and the
 * scroll reveals; `gsap.matchMedia` switches all of it off for visitors who
 * asked for reduced motion, so the content is simply there.
 */
export function Landing() {
  const root = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia(root);
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('[data-h="word"]', { yPercent: 110, opacity: 0, rotate: 4, duration: 0.8, stagger: 0.12 })
        .from('[data-h="copy"] > *', { y: 24, opacity: 0, duration: 0.6, stagger: 0.1 }, 0.35)
        .from('[data-h="art"]', { clipPath: 'inset(12% 12% 12% 12% round 40px)', opacity: 0, scale: 0.94, duration: 1 }, 0.2)
        .from('[data-h="kid"]', { y: 120, duration: 0.9, ease: 'back.out(1.3)' }, 0.55)
        .from('[data-h="chip"]', { scale: 0, opacity: 0, duration: 0.5, stagger: 0.08, ease: 'back.out(2)' }, 0.8);

      gsap.to('[data-float]', { y: -14, rotation: 5, duration: 2.6, yoyo: true, repeat: -1, ease: 'sine.inOut', stagger: { each: 0.35, from: 'random' } });
      gsap.to('[data-h="robot"]', { y: -16, duration: 2.1, yoyo: true, repeat: -1, ease: 'sine.inOut' });

      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el, { scrollTrigger: { trigger: el, start: 'top 85%', once: true }, y: 40, opacity: 0, duration: 0.8 });
      });
      gsap.utils.toArray<HTMLElement>('[data-cards]').forEach((group) => {
        gsap.from(group.children, {
          scrollTrigger: { trigger: group, start: 'top 82%', once: true },
          y: 50, opacity: 0, scale: 0.94, duration: 0.7, stagger: 0.09, ease: 'back.out(1.4)',
        });
      });
      gsap.utils.toArray<HTMLElement>('[data-audience]').forEach((el, i) => {
        const [art, text] = el.children;
        gsap.from(art, { scrollTrigger: { trigger: el, start: 'top 80%', once: true }, x: i % 2 ? 80 : -80, opacity: 0, rotate: i % 2 ? 6 : -6, duration: 0.9 });
        gsap.from(text, { scrollTrigger: { trigger: el, start: 'top 80%', once: true }, y: 40, opacity: 0, duration: 0.8, delay: 0.1 });
      });

      // Buttons lean gently towards the pointer.
      const cleanups: (() => void)[] = [];
      gsap.utils.toArray<HTMLElement>('[data-magnetic]').forEach((b) => {
        const move = (e: PointerEvent) => {
          const r = b.getBoundingClientRect();
          gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.18, y: (e.clientY - r.top - r.height / 2) * 0.25, duration: 0.3 });
        };
        const leave = () => gsap.to(b, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
        b.addEventListener('pointermove', move);
        b.addEventListener('pointerleave', leave);
        cleanups.push(() => { b.removeEventListener('pointermove', move); b.removeEventListener('pointerleave', leave); });
      });
      return () => cleanups.forEach((c) => c());
    });
    return () => mm.revert();
  }, []);

  return (
    <div ref={root} className="min-h-screen overflow-x-hidden bg-white font-body text-ink">
      <Navbar />
      <Hero />
      <Worlds />
      <HowItWorks />
      <section aria-label="Kidora for everyone" className="mx-auto max-w-6xl space-y-20 px-4 py-20 sm:px-6">
        {AUDIENCES.map((a, i) => <Audience key={a.key} a={a} flip={i % 2 === 1} />)}
      </section>
      <AiTutor />
      <Games />
      <CourseDiscovery />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ hero */

function Hero() {
  return (
    <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:pt-16">
      <div data-h="copy-wrap">
        <h1 className="font-display font-extrabold leading-[0.95] text-ink" style={{ fontSize: 'clamp(3rem, 7vw, 5.6rem)' }}>
          {['Learn.', 'Play.', 'Grow.'].map((w, i) => (
            <span key={w} className="block overflow-hidden pb-1">
              <span data-h="word" className={cn('inline-block', i === 0 && 'text-iris-600', i === 1 && 'text-amber-500', i === 2 && 'text-emerald-500')}>{w}</span>
            </span>
          ))}
        </h1>
        <div data-h="copy">
          <p className="mt-6 max-w-xl text-lg font-semibold leading-relaxed text-slate-600 sm:text-xl">
            AI-powered gamified learning built to help every child learn through curiosity, play, and personalized education.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <StartLearningButton>Start Learning <ArrowRight className="h-5 w-5" aria-hidden /></StartLearningButton>
            <Link href="/courses" data-magnetic className="inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-iris-200 bg-white px-8 text-lg font-extrabold text-iris-700 transition-colors hover:border-iris-400 hover:bg-iris-50">
              Explore Courses
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-bold text-slate-500">
            {['Free to start', 'Safe for kids', 'Made for African classrooms'].map((t) => (
              <li key={t} className="flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" aria-hidden />{t}</li>
            ))}
          </ul>
        </div>
      </div>

      <div data-h="art" className="relative aspect-[5/4] w-full overflow-hidden rounded-[40px] shadow-[0_40px_90px_-50px_rgba(61,37,174,.7)]" aria-hidden>
        <SavannaScene className="absolute inset-0 h-full w-full" />
        <div data-h="kid" className="absolute bottom-0 left-[6%] w-[46%]"><KidHero className="w-full drop-shadow-xl" /></div>
        <div data-h="robot" className="absolute bottom-[30%] left-[50%] w-[17%]"><RobotBuddy className="w-full drop-shadow-lg" /></div>
        <div className="absolute right-[5%] top-[10%] flex flex-col items-end gap-2.5">
          {[
            { t: 'Math', c: 'bg-sky-500', I: Calculator }, { t: 'Science', c: 'bg-emerald-500', I: FlaskConical },
            { t: 'Coding', c: 'bg-violet-500', I: Code2 }, { t: 'English', c: 'bg-amber-500', I: BookOpen }, { t: 'History', c: 'bg-rose-500', I: Landmark },
          ].map(({ t, c, I }) => (
            <span key={t} data-h="chip" className={cn('flex items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-xs font-extrabold text-white shadow-lg sm:text-sm', c)}>
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white/25 sm:h-7 sm:w-7"><I className="h-3.5 w-3.5" /></span>{t}
            </span>
          ))}
        </div>
        <div data-float className="absolute left-[44%] top-[16%] w-10"><Star className="w-full" /></div>
        <div data-float className="absolute left-[8%] top-[10%] w-6"><Sparkle className="w-full" color="#fff" /></div>
        <div data-float className="absolute bottom-[12%] right-[8%] rounded-2xl bg-white/90 px-3 py-2 text-xs font-extrabold text-ink shadow-lg">
          <Trophy className="mr-1 inline h-4 w-4 text-amber-500" />+120 XP
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- worlds */

function Worlds() {
  return (
    <section id="worlds" className="bg-gradient-to-b from-iris-50 to-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHead eyebrow="Learning worlds" title="Five worlds to explore" body="Each subject is a world with its own quests, characters and rewards." />
        <ul data-cards className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {WORLDS.map(({ name, blurb, icon: Icon, from, to, href }) => (
            <li key={name}>
              <Link href={href} className={cn('group flex h-full flex-col rounded-3xl bg-gradient-to-br p-5 text-white shadow-lg transition-transform duration-300 hover:-translate-y-2 hover:rotate-[-1deg]', from, to)}>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6"><Icon className="h-6 w-6" aria-hidden /></span>
                <span className="mt-4 font-display text-xl font-extrabold">{name}</span>
                <span className="mt-1 flex-1 text-sm font-semibold text-white/90">{blurb}</span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold">Play <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- how it works */

function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <SectionHead eyebrow="How Kidora works" title="From sign-up to “I did it!”" />
      <ol data-cards className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="relative rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <span className="absolute right-5 top-4 font-display text-5xl font-extrabold text-iris-100" aria-hidden>{i + 1}</span>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-iris-100 text-iris-700"><Icon className="h-6 w-6" aria-hidden /></span>
            <h3 className="mt-4 font-display text-lg font-extrabold">{title}</h3>
            <p className="mt-1 text-sm font-semibold text-slate-600">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------ audiences */

function Audience({ a, flip }: { a: (typeof AUDIENCES)[number]; flip: boolean }) {
  return (
    <div id={a.key} data-audience className="grid items-center gap-10 md:grid-cols-2">
      <div className={cn('relative mx-auto aspect-square w-full max-w-sm rounded-[40px] p-10', a.bg, flip && 'md:order-2')} aria-hidden>
        <div className="h-full w-full">{a.art}</div>
        <span data-float className="absolute -right-3 top-8 rounded-2xl bg-white px-3 py-2 text-sm font-extrabold shadow-lg"><Sparkles className="mr-1 inline h-4 w-4 text-amber-500" />Kidora</span>
      </div>
      <div className={cn(flip && 'md:order-1')}>
        <p className="text-sm font-extrabold uppercase tracking-wider text-iris-600">{a.eyebrow}</p>
        <h2 className="mt-2 font-display text-3xl font-extrabold leading-tight sm:text-4xl">{a.title}</h2>
        <p className="mt-3 text-lg font-semibold text-slate-600">{a.body}</p>
        <ul className="mt-5 space-y-2">
          {a.points.map((p) => (
            <li key={p} className="flex items-start gap-2 font-semibold text-slate-700">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Check className="h-3.5 w-3.5" aria-hidden /></span>{p}
            </li>
          ))}
        </ul>
        <Link href={a.cta.href} data-magnetic className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-ink px-6 font-extrabold text-white hover:bg-iris-700">
          {a.cta.label} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- AI tutor */

function AiTutor() {
  return (
    <section id="ai-tutor" className="bg-ink py-20 text-white">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 md:grid-cols-2">
        <div data-reveal>
          <p className="text-sm font-extrabold uppercase tracking-wider text-iris-300">AI tutor</p>
          <h2 className="mt-2 font-display text-4xl font-extrabold">Meet Kai, a tutor who never gives up on you</h2>
          <p className="mt-3 text-lg font-semibold text-white/80">
            Kai explains step by step, gives hints instead of answers, and speaks at your level. Grown-ups can see what their child asked.
          </p>
          <Link href="/ai-tutor" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-6 font-extrabold text-ink hover:bg-iris-100">
            <Bot className="h-5 w-5" aria-hidden /> Learn about Kai
          </Link>
        </div>
        <div data-reveal className="relative rounded-[32px] bg-white/5 p-6 ring-1 ring-white/10">
          <div className="absolute -top-10 right-6 w-20" data-float aria-hidden><RobotBuddy className="w-full" /></div>
          <div className="space-y-3 text-sm font-semibold">
            <p className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-iris-600 px-4 py-3">Why is ¾ bigger than ⅔?</p>
            <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-ink">Great question! Let’s give them the same bottom number first. What do 4 and 3 both fit into? 🤔</p>
            <p className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-iris-600 px-4 py-3">12!</p>
            <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-ink">Yes! So ¾ = 9/12 and ⅔ = 8/12. Which is bigger now? ⭐</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ games */

function Games() {
  return (
    <section id="games" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="grid items-center gap-10 rounded-[40px] bg-gradient-to-br from-amber-100 via-rose-50 to-iris-100 p-8 sm:p-12 md:grid-cols-[1.1fr_1fr]">
        <div data-reveal>
          <p className="text-sm font-extrabold uppercase tracking-wider text-iris-600">Play to learn</p>
          <h2 className="mt-2 font-display text-4xl font-extrabold">3D games where every level teaches something</h2>
          <p className="mt-3 text-lg font-semibold text-slate-600">
            Walk the path, open the gates, solve the challenge. Answers are checked fairly on our servers, levels adapt to each child,
            and rewards are earned — never bought.
          </p>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {['XP, stars and badges', 'Hints from Kai', 'Works without 3D on older phones', 'No ads, no loot boxes'].map((t) => (
              <li key={t} className="flex items-center gap-2 font-bold text-slate-700"><ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />{t}</li>
            ))}
          </ul>
          <Link href="/games" data-magnetic className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-iris-600 px-6 font-extrabold text-white hover:bg-iris-700">
            <Gamepad2 className="h-5 w-5" aria-hidden /> Explore the games
          </Link>
        </div>
        <div data-cards className="grid grid-cols-2 gap-3" aria-hidden>
          {[{ e: '🏝️', t: 'Math Treasure Rush' }, { e: '🦒', t: 'Word Safari' }, { e: '🧪', t: 'Science Lab' }, { e: '🤖', t: 'Code City' }].map((g) => (
            <div key={g.t} className="rounded-3xl bg-white p-4 text-center shadow-md">
              <div className="text-4xl">{g.e}</div>
              <div className="mt-2 font-display text-sm font-extrabold">{g.t}</div>
              <div className="mt-2 flex justify-center gap-0.5 text-amber-400">★★★</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------- course discovery */

function CourseDiscovery() {
  const q = useQuery({ queryKey: ['courses', 'catalogue'], queryFn: coursesApi.catalogue, staleTime: 5 * 60_000 });
  const courses = (q.data ?? []).slice(0, 6);
  return (
    <section id="courses" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHead eyebrow="Course discovery" title="Courses made by real teachers" body="From early reading to C++ — and every course can be joined with a teacher’s code." />
        {courses.length > 0 ? (
          <ul data-cards className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <li key={c.id}>
                <Link href={`/courses/${c.id}`} className="flex h-full flex-col rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg">
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-iris-50 px-3 py-1 text-xs font-extrabold text-iris-700"><BookOpen className="h-3.5 w-3.5" aria-hidden />{c.subject?.name ?? 'Course'}</span>
                  <span className="mt-3 font-display text-lg font-extrabold">{c.title}</span>
                  {c.isPremium && <span className="mt-1 text-xs font-bold text-amber-600">Premium</span>}
                  <span className="mt-auto pt-4 text-sm font-extrabold text-iris-700">View course →</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <ul data-cards className="mt-10 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[{ i: Calculator, t: 'Math' }, { i: FlaskConical, t: 'Science' }, { i: Code2, t: 'Coding' }, { i: Languages, t: 'English' }, { i: Landmark, t: 'History' }, { i: BarChart3, t: 'And more' }].map(({ i: I, t }) => (
              <li key={t} className="flex flex-col items-center rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-100">
                <I className="h-7 w-7 text-iris-600" aria-hidden /><span className="mt-2 font-display font-extrabold">{t}</span>
              </li>
            ))}
          </ul>
        )}
        <div data-reveal className="mt-10 flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-100 sm:flex-row sm:text-left">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-iris-100 text-iris-700"><KeyRound className="h-6 w-6" aria-hidden /></span>
          <p className="font-semibold text-slate-700"><span className="font-extrabold text-ink">Got a course code from your teacher?</span> Sign in and enter it on your dashboard to join straight away.</p>
          <Link href="/courses" className="shrink-0 rounded-2xl bg-ink px-5 py-3 font-extrabold text-white hover:bg-iris-700">Explore Courses</Link>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- final CTA */

function FinalCta() {
  return (
    <section className="px-4 py-20 sm:px-6">
      <div data-reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-[40px] bg-gradient-to-br from-iris-600 via-iris-700 to-iris-900 px-6 py-16 text-center text-white">
        <div data-float className="absolute left-[8%] top-10 w-10" aria-hidden><Star className="w-full" /></div>
        <div data-float className="absolute bottom-10 right-[10%] w-8" aria-hidden><Sparkle className="w-full" color="#fff" /></div>
        <School className="mx-auto h-10 w-10 text-iris-200" aria-hidden />
        <h2 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">Ready to start the adventure?</h2>
        <p className="mx-auto mt-3 max-w-xl text-lg font-semibold text-white/85">Create a free account in a minute. Upgrade only when you want more.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <StartLearningButton className="bg-white text-iris-700 hover:bg-iris-50">Start Learning <ArrowRight className="h-5 w-5" aria-hidden /></StartLearningButton>
          <Link href="/pricing" className="inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-white/40 px-8 text-lg font-extrabold text-white hover:bg-white/10">See plans</Link>
        </div>
      </div>
    </section>
  );
}

function SectionHead({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div data-reveal className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-extrabold uppercase tracking-wider text-iris-600">{eyebrow}</p>
      <h2 className="mt-2 font-display text-4xl font-extrabold leading-tight">{title}</h2>
      {body && <p className="mt-3 text-lg font-semibold text-slate-600">{body}</p>}
    </div>
  );
}
