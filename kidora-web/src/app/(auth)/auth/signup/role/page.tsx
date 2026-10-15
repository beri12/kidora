'use client';

import { Suspense, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';

import { CenteredAuthLayout } from '@/components/auth/kidora/layouts';
import { ROLE_ART } from '@/components/auth/kidora/illustrations';
import { BackLink, FormError, PrimaryButton } from '@/components/auth/kidora/ui';
import { AUTH, authHref, safeNext } from '@/features/auth/routes';
import { useSignupAccount } from '@/features/auth/useSignupAccount';
import { apiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

type Key = keyof typeof ROLE_ART;

const CARDS: { key: Key; title: string; blurb: string; bg: string; ring: string; title2: string }[] = [
  { key: 'STUDENT', title: 'Student', blurb: 'Learn and play games', bg: 'bg-sky-50', ring: 'ring-sky-400', title2: 'text-sky-900' },
  { key: 'PARENT', title: 'Parent', blurb: 'Track progress and support your child', bg: 'bg-pink-50', ring: 'ring-pink-400', title2: 'text-pink-900' },
  { key: 'TEACHER', title: 'Teacher', blurb: 'Create courses and manage your class', bg: 'bg-emerald-50', ring: 'ring-emerald-400', title2: 'text-emerald-900' },
  { key: 'SCHOOL_LEADER', title: 'School Leader', blurb: 'Manage your school and students', bg: 'bg-violet-50', ring: 'ring-violet-400', title2: 'text-violet-900' },
  { key: 'DISTRICT_LEADER', title: 'District Leader', blurb: 'Oversee multiple schools', bg: 'bg-orange-50', ring: 'ring-orange-400', title2: 'text-orange-900' },
];

/** `?role=` from a landing page ("For teachers" etc.) pre-selects a card. */
function fromHint(raw: string | null): Key | null {
  const map: Record<string, Key> = {
    STUDENT: 'STUDENT', CHILD: 'STUDENT', PARENT: 'PARENT', TEACHER: 'TEACHER',
    SCHOOL: 'SCHOOL_LEADER', SCHOOL_LEADER: 'SCHOOL_LEADER', SCHOOL_ADMIN: 'SCHOOL_LEADER',
    DISTRICT: 'DISTRICT_LEADER', DISTRICT_LEADER: 'DISTRICT_LEADER', DISTRICT_ADMIN: 'DISTRICT_LEADER',
  };
  return raw ? map[raw.toUpperCase()] ?? null : null;
}

const PROFILE_ROLE: Partial<Record<Key, string>> = {
  STUDENT: 'student', TEACHER: 'teacher', SCHOOL_LEADER: 'school-leader', DISTRICT_LEADER: 'district-leader',
};

function RoleScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const user = useSignupAccount(AUTH.role);
  const selectRole = useAuthStore((s) => s.selectRole);
  const logout = useAuthStore((s) => s.logout);

  const [picked, setPicked] = useState<Key | null>(() => fromHint(params.get('role')));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: KeyboardEvent, i: number) {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + CARDS.length) % CARDS.length;
    refs.current[n]?.focus();
    setPicked(CARDS[n].key);
  }

  async function next_() {
    if (!picked || busy) return;
    setError('');
    // A parent has nothing more to tell us; everyone else has a profile step,
    // where the role is saved together with it.
    if (picked === 'PARENT') {
      setBusy(true);
      try {
        await selectRole('PARENT');
        router.push(authHref(AUTH.complete, { next }));
      } catch (e) {
        setError(apiErrorMessage(e, "We couldn't save that. Please try again."));
      } finally {
        setBusy(false);
      }
      return;
    }
    router.push(authHref(AUTH.profile, { role: PROFILE_ROLE[picked], next }));
  }

  if (!user) return null;
  const selectedIndex = picked ? CARDS.findIndex((c) => c.key === picked) : -1;

  return (
    <CenteredAuthLayout wide>
      <div className="-mt-2 mb-2">
        <BackLink onClick={() => { logout(); router.replace(AUTH.login); }}>Back</BackLink>
      </div>
      <h1 id="role-title" data-anim="row" className="text-center font-display text-3xl font-extrabold text-ink">How will you use Kidora?</h1>
      <p data-anim="row" className="mt-1 text-center font-body font-semibold text-slate-600">Select your role to get the best experience.</p>

      <div role="radiogroup" aria-labelledby="role-title" className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-6 sm:gap-4">
        {CARDS.map((c, i) => {
          const on = picked === c.key;
          return (
            <button
              key={c.key}
              ref={(el) => { refs.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on || (selectedIndex === -1 && i === 0) ? 0 : -1}
              onClick={() => { setPicked(c.key); setError(''); }}
              onKeyDown={(e) => onKey(e, i)}
              data-anim="row"
              className={cn(
                'group relative flex flex-col items-center rounded-2xl p-3 pb-4 text-center outline-none transition duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:ring-4 focus-visible:ring-iris-300 sm:p-4',
                c.bg,
                i < 3 ? 'sm:col-span-2' : 'sm:col-span-3',
                i === 4 && 'col-span-2 sm:col-span-3',
                on ? `ring-2 ${c.ring} shadow-lg` : 'ring-1 ring-black/5',
              )}
            >
              <span className="h-20 w-20 transition-transform duration-300 group-hover:scale-110 sm:h-24 sm:w-24">{ROLE_ART[c.key]('h-full w-full')}</span>
              <span className={cn('mt-2 font-display text-lg font-extrabold', c.title2)}>{c.title}</span>
              <span className="mt-0.5 font-body text-xs font-semibold leading-snug text-slate-600">{c.blurb}</span>
              {on && (
                <span className="absolute right-2.5 top-2.5 grid h-6 w-6 animate-pop place-items-center rounded-full bg-grass-500 text-white" aria-hidden>
                  <Check className="h-4 w-4" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {picked && (picked === 'SCHOOL_LEADER' || picked === 'DISTRICT_LEADER') && (
        <p className="mx-auto mt-4 max-w-md animate-slide-down text-center font-body text-sm font-semibold text-slate-600">
          We verify leadership accounts before they can manage students. Next you can enter your organisation&apos;s code or send your details for a quick check.
        </p>
      )}

      <div className="mx-auto mt-6 max-w-sm space-y-3">
        <FormError>{error}</FormError>
        <PrimaryButton onClick={next_} disabled={!picked} busy={busy}>Continue</PrimaryButton>
      </div>

      <p className="mt-6 text-center font-body text-sm font-semibold text-slate-600">
        Signed in as <span className="font-extrabold text-ink">{user.email ?? user.name}</span>.{' '}
        <Link href={AUTH.login} onClick={() => logout()} className="font-extrabold text-iris-700 underline underline-offset-2">Not you?</Link>
      </p>
    </CenteredAuthLayout>
  );
}

export default function RolePage() {
  return <Suspense fallback={null}><RoleScreen /></Suspense>;
}
