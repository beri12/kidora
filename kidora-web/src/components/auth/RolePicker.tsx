'use client';

import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { USE_CASES, type UseCase } from '@/constants/roles';
import { useAuthStore } from '@/stores/auth.store';
import { apiErrorMessage } from '@/lib/api-error';
import { emojiBurst, prefersReducedMotion, shake, useGsap } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import type { Role, SignupRoleKey } from '@/types';

interface Props {
  /** Called with the saved role once the account is ready to be routed. */
  onDone: (role: Role) => void;
  /**
   * Called when the chosen role has to be verified first. The account's role
   * is unchanged at this point — the caller shows the verification form.
   */
  onNeedsVerification: (role: 'SCHOOL_ADMIN' | 'SCHOOL_LEADER' | 'DISTRICT_ADMIN') => void;
  /**
   * Pre-selects a card. Set from `?role=` so a visitor arriving from
   * "For teachers" does not have to say "teacher" twice.
   */
  initialRole?: string | null;
}

const GRADES = ['Pre-K', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];

/**
 * Maps whatever `?role=` carries — a legacy signup key or a backend Role —
 * onto one of the cards. Anything unrecognised pre-selects nothing.
 */
function matchUseCase(raw?: string | null): UseCase | null {
  if (!raw) return null;
  const key = raw.toUpperCase();
  const aliases: Record<string, UseCase['key']> = {
    PARENT: 'PARENT',
    TEACHER: 'TEACHER',
    SCHOOL: 'SCHOOL_LEADER',
    SCHOOL_ADMIN: 'SCHOOL_LEADER',
    SCHOOL_LEADER: 'SCHOOL_LEADER',
    DISTRICT: 'DISTRICT_LEADER',
    DISTRICT_ADMIN: 'DISTRICT_LEADER',
    DISTRICT_LEADER: 'DISTRICT_LEADER',
    CHILD: 'STUDENT',
    STUDENT: 'STUDENT',
  };
  const hit = aliases[key];
  return hit ? USE_CASES.find((c) => c.key === hit) ?? null : null;
}

/**
 * "How will you use Kidora?" — the one question a new account answers, after
 * signing up rather than before.
 *
 * Students and teachers can add the join code their school gave them (and a
 * student their grade); the API links them to that school straight away. A
 * wrong code is reported here and nothing is saved, so they can fix it or
 * leave it blank and join a school later.
 */
export function RolePicker({ onDone, onNeedsVerification, initialRole }: Props) {
  const selectRole = useAuthStore((s) => s.selectRole);
  const user = useAuthStore((s) => s.user);

  const [picked, setPicked] = useState<UseCase | null>(() => matchUseCase(initialRole));
  const [name, setName] = useState(user?.name && !/^(Kidora member|.* User)$/.test(user.name) ? user.name : '');
  const [schoolCode, setSchoolCode] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const root = useRef<HTMLDivElement>(null);
  // Wraps the button: GSAP moves this, the button keeps its CSS transitions.
  const cta = useRef<HTMLDivElement>(null);

  useGsap(() => {
    gsap.from('[data-usecase]', { y: 22, autoAlpha: 0, scale: 0.96, stagger: 0.07, duration: 0.45, ease: 'back.out(1.7)' });
  }, root);

  const isStudent = picked?.role === 'CHILD';
  const takesSchoolCode = isStudent || picked?.role === 'TEACHER';

  function pick(c: UseCase, el: HTMLElement) {
    setPicked(c);
    setError('');
    if (prefersReducedMotion()) return;
    gsap.fromTo(el.querySelector('[data-usecase-icon]'), { scale: 0.6, rotation: -25 }, { scale: 1, rotation: 0, duration: 0.55, ease: 'elastic.out(1.1, 0.45)' });
  }

  async function save() {
    if (!picked || busy) return;
    if (name.trim().length < 2) {
      setError(isStudent ? 'Please tell us your first name' : 'Please tell us your name');
      shake(root.current?.querySelector('[data-name]') ?? null);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const extra: Record<string, string> = { name: name.trim() };
      if (takesSchoolCode && schoolCode.trim()) extra.schoolCode = schoolCode.trim().toUpperCase();
      if (isStudent && gradeLevel) extra.gradeLevel = gradeLevel;

      const { user: saved, needsVerification } = await selectRole(picked.role as SignupRoleKey, extra);
      if (needsVerification) {
        onNeedsVerification(picked.role as 'SCHOOL_ADMIN' | 'SCHOOL_LEADER' | 'DISTRICT_ADMIN');
        return;
      }
      emojiBurst(cta.current, 16);
      onDone(saved.role);
    } catch (e) {
      setError(apiErrorMessage(e, "We couldn't save that. Please try again."));
      shake(cta.current);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={root}>
      <h1 className="font-display text-3xl font-extrabold text-brand-900">How will you use Kidora?</h1>
      <p className="mt-1 font-body font-bold text-brand-500">This sets up the right dashboard for you.</p>

      <div className="mt-6 space-y-2.5">
        {USE_CASES.map((c) => {
          const isPicked = picked?.key === c.key;
          // GSAP animates the wrapper; the button keeps its CSS hover
          // transitions. Both on one element would fight frame by frame.
          return (
            <div key={c.key} data-usecase>
            <button
              type="button"
              onClick={(e) => pick(c, e.currentTarget)}
              aria-pressed={isPicked}
              className={
                'flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all duration-200 ' +
                (isPicked
                  ? 'border-brand-600 bg-brand-50 shadow-card'
                  : 'border-brand-100 bg-white hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card')
              }
            >
              <span
                data-usecase-icon
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${c.bg} text-2xl`}
                style={{ boxShadow: `0 8px 16px -8px ${c.shadow}` }}
              >
                {c.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display font-extrabold text-brand-900">{c.label}</span>
                <span className="block font-body-x text-[12px] leading-snug text-brand-500">{c.blurb}</span>
              </span>
              {isPicked && <span className="text-xl text-grass-600">✓</span>}
            </button>
            </div>
          );
        })}
      </div>

      {/* Administrative roles are checked before they are granted — say so
          here rather than surprising the applicant on the next screen. */}
      {picked?.needsVerification && (
        <div className="mt-4 animate-slide-down rounded-2xl border-2 border-brand-100 bg-brand-50 p-4">
          <p className="font-body font-bold text-brand-800">We verify this one 🔍</p>
          <p className="mt-1 font-body-x text-[13px] leading-relaxed text-brand-600">
            Next you can enter your organisation&apos;s code, which lets you in immediately, or
            send your details for a quick check — usually within two working days.
          </p>
        </div>
      )}

      {picked && (
        <div key={picked.key} className="mt-5 animate-slide-down space-y-3">
          <div data-name>
            <Label htmlFor="rp-name">{isStudent ? 'Your first name' : 'What should we call you?'}</Label>
            <Input
              id="rp-name"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder={isStudent ? 'e.g. Leo' : 'Your name'}
              autoFocus
            />
          </div>

          {isStudent && (
            <div>
              <Label htmlFor="rp-grade">Your grade <span className="text-brand-400">(optional)</span></Label>
              <select
                id="rp-grade"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full rounded-2xl border-2 border-brand-200 bg-brand-50 px-4 py-3 font-body font-bold text-brand-900 outline-none focus:border-brand-600"
              >
                <option value="">Choose your grade</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          )}

          {takesSchoolCode && (
            <div>
              <Label htmlFor="rp-code">School code <span className="text-brand-400">(optional)</span></Label>
              <Input
                id="rp-code"
                value={schoolCode}
                onChange={(e) => { setSchoolCode(e.target.value.toUpperCase()); setError(''); }}
                placeholder="K7M2QP"
                maxLength={24}
                autoCapitalize="characters"
                className="uppercase tracking-widest"
              />
              <p className="mt-1 font-body-x text-[12px] text-brand-400">
                {isStudent
                  ? 'From your teacher. Learning at home? Leave it blank.'
                  : 'From your school admin. You can join a school later, too.'}
              </p>
            </div>
          )}
        </div>
      )}

      {error && <p role="alert" className="mt-3 animate-slide-down font-body-x text-[13px] text-coral-600">{error}</p>}

      <div ref={cta} className="mt-5">
        <Button
          size="lg"
          variant="grass"
          className="w-full"
          disabled={!picked || busy}
          onClick={save}
        >
          {busy ? 'Setting up…' : picked?.needsVerification ? 'Continue →' : isStudent ? "Let's start learning 🚀" : 'Enter Kidora 🎉'}
        </Button>
      </div>
    </div>
  );
}
