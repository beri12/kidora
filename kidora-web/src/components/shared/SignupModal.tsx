'use client';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SIGNUP_ROLES } from '@/constants/roles';
import { useI18n } from '@/lib/i18n';
export { SIGNUP_ROLES } from '@/constants/roles';
export type { SignupRole } from '@/constants/roles';

// SIGNUP_ROLES keys are the backend Role enum values; the translation keys are
// the short slugs used in i18n. SCHOOL_ADMIN/DISTRICT_ADMIN were missing here,
// which rendered the literal string "role.undefined" on those two cards.
const ROLE_KEY: Record<string, string> = {
  CHILD: 'child',
  PARENT: 'parent',
  TEACHER: 'teacher',
  SCHOOL_ADMIN: 'school',
  SCHOOL_LEADER: 'school',
  DISTRICT_ADMIN: 'district',
};

export function SignupModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (role: string) => void;
}) {
  const { t } = useI18n();
  // Close on Escape + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  // Portal to <body> so ancestor backdrop-filter (the navbar) can't trap the fixed overlay.
  return createPortal((
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-brand-950/55 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Sign up for Kidora"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[920px] max-h-[92vh] overflow-y-auto rounded-[30px] bg-white p-6 sm:p-10 shadow-2xl animate-modal-pop"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-brand-100 text-brand-700 text-2xl font-black leading-none hover:bg-brand-200"
        >
          ×
        </button>

        <div className="text-center mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-brand-900 leading-tight">
            {t('signup.title')}
          </h1>
          <p className="text-sm sm:text-base font-bold text-brand-500 mt-2">{t('signup.subtitle')}</p>
        </div>

        {/* Role grid — 1 col on phones, 2 on small, up to 4 on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {SIGNUP_ROLES.map((r) => (
            <button
              key={r.key}
              onClick={() => onPick(r.key)}
              className="group flex flex-col items-center text-center rounded-3xl border-2 border-brand-100 bg-white p-6 transition hover:-translate-y-1.5 hover:border-brand-500 hover:shadow-xl"
            >
              <span
                className={`grid h-[92px] w-[92px] place-items-center rounded-3xl bg-gradient-to-br ${r.bg} text-5xl mb-4 transition group-hover:scale-105`}
                style={{ boxShadow: `0 14px 26px -10px ${r.shadow}` }}
              >
                {r.emoji}
              </span>
              <span className="font-display text-xl font-extrabold text-brand-900">
                {ROLE_KEY[r.key] ? t('role.' + ROLE_KEY[r.key]) : r.name}
              </span>
              <span className="text-sm font-bold text-brand-500 leading-snug mt-1">
                {ROLE_KEY[r.key] ? t('role.' + ROLE_KEY[r.key] + '.desc') : r.desc}
              </span>
            </button>
          ))}
        </div>

        <p className="text-center text-sm font-bold text-brand-500 mt-8">
          {t('signup.haveAccount')}{' '}
          <button onClick={onClose} className="text-brand-800 underline">{t('auth.login')}</button>
        </p>
      </div>
    </div>
  ), document.body);
}
