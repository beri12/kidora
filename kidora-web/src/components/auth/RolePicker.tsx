'use client';

import { useState } from 'react';
import { USE_CASES, type UseCase } from '@/constants/roles';
import { useAuthStore } from '@/stores/auth.store';
import { apiErrorMessage } from '@/lib/api-error';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import type { Role, SignupRoleKey } from '@/types';

interface Props {
  /** Called with the saved role once the account is ready to be routed. */
  onDone: (role: Role) => void;
  /**
   * Pre-selects a card. Set from `?role=` so a visitor arriving from
   * "For teachers" does not have to say "teacher" twice.
   */
  initialRole?: string | null;
}

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
 * signing in rather than before. Students are listed but not selectable:
 * children join through a parent or a school code, never by self-registering.
 */
export function RolePicker({ onDone, initialRole }: Props) {
  const selectRole = useAuthStore((s) => s.selectRole);
  const user = useAuthStore((s) => s.user);

  const [picked, setPicked] = useState<UseCase | null>(() => matchUseCase(initialRole));
  const [name, setName] = useState(user?.name && user.name !== 'Kidora member' ? user.name : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!picked?.role || busy) return;
    if (name.trim().length < 2) {
      setError('Please tell us your name');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const saved = await selectRole(picked.role as SignupRoleKey, { name: name.trim() });
      onDone(saved.role);
    } catch (e) {
      setError(apiErrorMessage(e, "We couldn't save that. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-brand-900">How will you use Kidora?</h1>
      <p className="mt-1 font-body font-bold text-brand-500">This sets up the right dashboard for you.</p>

      <div className="mt-6 space-y-2.5">
        {USE_CASES.map((c, i) => {
          const isPicked = picked?.key === c.key;
          const selectable = c.role !== null;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => { setPicked(c); setError(''); }}
              aria-pressed={isPicked}
              className={
                'flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left animate-slide-up transition-all duration-200 ' +
                (isPicked
                  ? 'border-brand-600 bg-brand-50 shadow-card'
                  : 'border-brand-100 bg-white hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card')
              }
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <span
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${c.bg} text-2xl ` + (isPicked ? 'animate-pop' : '')}
                style={{ boxShadow: `0 8px 16px -8px ${c.shadow}` }}
              >
                {c.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display font-extrabold text-brand-900">{c.label}</span>
                <span className="block font-body-x text-[12px] leading-snug text-brand-500">{c.blurb}</span>
              </span>
              {isPicked && <span className="text-xl text-grass-600">✓</span>}
              {!selectable && <span className="font-body-x text-[11px] text-brand-400">code</span>}
            </button>
          );
        })}
      </div>

      {/* Students can't self-register — say what to do instead. */}
      {picked && !picked.role && (
        <div className="mt-4 animate-slide-down rounded-2xl border-2 border-brand-100 bg-brand-50 p-4">
          <p className="font-body font-bold text-brand-800">Students join through a grown-up 🧒</p>
          <p className="mt-1 font-body-x text-[13px] leading-relaxed text-brand-600">
            Ask a parent to add you from their Kidora account, or ask your teacher for your school&apos;s
            student code. Then sign in with that code instead.
          </p>
        </div>
      )}

      {picked?.role && (
        <div className="mt-5 animate-slide-down">
          <Label>What should we call you?</Label>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            placeholder="Your name"
            autoFocus
          />
        </div>
      )}

      {error && <p className="mt-3 animate-slide-down font-body-x text-[13px] text-coral-600">{error}</p>}

      <Button
        size="lg"
        variant="grass"
        className="mt-5 w-full"
        disabled={!picked?.role || busy}
        onClick={save}
      >
        {busy ? 'Setting up…' : 'Enter Kidora 🎉'}
      </Button>
    </div>
  );
}
