'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { USE_CASES, type UseCase } from '@/constants/roles';
import { useAuthStore } from '@/stores/auth.store';
import { apiErrorMessage } from '@/lib/api-error';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { useShake } from './scene/KidoraAuthScene';
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
  const hit = aliases[raw.toUpperCase()];
  return hit ? USE_CASES.find((c) => c.key === hit) ?? null : null;
}

const list: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const card: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};

/**
 * "How will you use Kidora?" — the one question a new account answers, after
 * signing up rather than before. Cards, not a form: a radio group the
 * keyboard can walk with the arrow keys.
 *
 * Students and teachers can add the join code their school gave them (and a
 * student their grade); the API links them to that school straight away. A
 * wrong code is reported here and nothing is saved.
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
  const [nameRef, shakeName] = useShake<HTMLDivElement>();
  const [ctaRef, shakeCta] = useShake<HTMLDivElement>();
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const nameInput = useRef<HTMLInputElement>(null);

  const isStudent = picked?.role === 'CHILD';
  const takesSchoolCode = isStudent || picked?.role === 'TEACHER';

  // Arrow keys move between cards, like any radio group.
  function onKeyDown(e: KeyboardEvent, i: number) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + USE_CASES.length) % USE_CASES.length;
    cards.current[next]?.focus();
    setPicked(USE_CASES[next]);
  }

  async function save() {
    if (!picked || busy) return;
    if (name.trim().length < 2) {
      setError(isStudent ? 'Please tell us your first name' : 'Please tell us your name');
      shakeName();
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
      onDone(saved.role);
    } catch (e) {
      setError(apiErrorMessage(e, "We couldn't save that. Please try again."));
      shakeCta();
    } finally {
      setBusy(false);
    }
  }

  const selectedIndex = picked ? USE_CASES.findIndex((c) => c.key === picked.key) : -1;

  return (
    <div>
      <h1 id="role-title" className="text-center font-display text-3xl font-extrabold text-brand-900">
        🌟 How will you use Kidora?
      </h1>
      <p className="mt-1 text-center font-body font-bold text-brand-500">Pick one — it sets up the right world for you.</p>

      <motion.div
        role="radiogroup"
        aria-labelledby="role-title"
        variants={list}
        initial="hidden"
        animate="show"
        className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3"
      >
        {USE_CASES.map((c, i) => {
          const isPicked = picked?.key === c.key;
          return (
            <motion.button
              key={c.key}
              ref={(el) => { cards.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={isPicked}
              // Roving tab stop: one card in the tab order, arrows for the rest.
              tabIndex={isPicked || (selectedIndex === -1 && i === 0) ? 0 : -1}
              // A click moves on to the name field; arrowing through the cards
              // must not (the field appearing would steal focus mid-choice).
              onClick={(e) => {
                setPicked(c);
                setError('');
                if (e.detail > 0) setTimeout(() => nameInput.current?.focus(), 320);
              }}
              onKeyDown={(e) => onKeyDown(e, i)}
              variants={card}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.97 }}
              className={
                'relative flex min-h-[9.5rem] flex-col items-center rounded-3xl border-2 p-4 text-center outline-none focus-visible:ring-4 focus-visible:ring-brand-300 ' +
                (isPicked ? 'border-brand-600 bg-brand-50 shadow-card' : 'border-brand-100 bg-white hover:border-brand-300')
              }
            >
              <motion.span
                className={`grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br ${c.bg} text-4xl`}
                style={{ boxShadow: `0 10px 18px -10px ${c.shadow}` }}
                animate={isPicked ? { rotate: [0, -12, 10, 0], scale: [1, 1.15, 1] } : { rotate: 0, scale: 1 }}
                transition={{ duration: 0.45 }}
                aria-hidden
              >
                {c.emoji}
              </motion.span>
              <span className="mt-2 font-display text-lg font-extrabold text-brand-900">{c.label}</span>
              <span className="mt-0.5 font-body-x text-[13px] leading-snug text-brand-500">{c.blurb}</span>
              <AnimatePresence>
                {isPicked && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-grass-500 text-sm text-white"
                    aria-hidden
                  >
                    ✓
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </motion.div>

      <AnimatePresence mode="wait">
        {picked && (
          <motion.div
            key={picked.key}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mx-auto max-w-md overflow-hidden"
          >
            {picked.needsVerification && (
              <div className="mt-5 rounded-2xl border-2 border-brand-100 bg-brand-50 p-4">
                <p className="font-body font-bold text-brand-800">We verify this one 🔍</p>
                <p className="mt-1 font-body-x text-[13px] leading-relaxed text-brand-600">
                  Next you can enter your organisation&apos;s code, which lets you in immediately, or
                  send your details for a quick check — usually within two working days.
                </p>
              </div>
            )}

            <div className="mt-5 space-y-3">
              <div ref={nameRef}>
                <Label htmlFor="rp-name">{isStudent ? 'Your first name' : 'What should we call you?'}</Label>
                <Input
                  id="rp-name"
                  ref={nameInput}
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  placeholder={isStudent ? 'e.g. Leo' : 'Your name'}
                />
              </div>

              {isStudent && (
                <div>
                  <Label htmlFor="rp-grade">Your grade <span className="text-brand-400">(optional)</span></Label>
                  <select
                    id="rp-grade"
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="min-h-12 w-full rounded-2xl border-2 border-brand-200 bg-brand-50 px-4 py-3 font-body font-bold text-brand-900 outline-none focus:border-brand-600"
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
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p role="alert" className="mx-auto mt-3 max-w-md font-body-x text-[13px] text-coral-600">{error}</p>}

      <div ref={ctaRef} className="mx-auto mt-5 max-w-md">
        <Button size="lg" variant="grass" className="min-h-14 w-full" disabled={!picked || busy} onClick={save}>
          {busy ? 'Setting up…' : picked?.needsVerification ? 'Continue →' : isStudent ? "✨ Let's learn!" : 'Enter Kidora 🎉'}
        </Button>
      </div>
    </div>
  );
}
