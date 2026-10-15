'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, Lock, Mail } from 'lucide-react';

import { CodeStep } from './CodeStep';
import { Field, FormError, PasswordField, PrimaryButton, SocialRow } from './kidora/ui';
import { AUTH, authHref, destinationFor, rememberResetEmail, safeNext } from '@/features/auth/routes';
import { emailSchema } from '@/features/auth/schema';
import { apiErrorMessage } from '@/lib/api-error';
import { celebrate } from '@/lib/motion';
import { emailPendingFrom, useAuthStore } from '@/stores/auth.store';
import type { EmailPending } from '@/types';

/**
 * "Welcome back!": email + password (+ Remember me), Google / Facebook /
 * TikTok. An account whose email was never confirmed is sent a fresh code
 * and asked for it here; an account with an authenticator app is asked for
 * its 6-digit code.
 */
export function LoginForm({ onStepChange }: { onStepChange?: (step: string) => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next') ?? params.get('redirect'));
  const { login, verifyEmail, resendEmail } = useAuthStore();

  const [form, setForm] = useState({ email: '', password: '', mfa: '' });
  const [remember, setRemember] = useState(true);
  const [needMfa, setNeedMfa] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<EmailPending | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors({});
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const em = emailSchema.safeParse(form.email);
    if (!em.success) errs.email = em.error.issues[0].message;
    if (!form.password) errs.password = 'Enter your password';
    if (needMfa && !/^\d{6}$/.test(form.mfa)) errs.mfa = 'Enter the 6-digit code from your authenticator app';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setBusy(true);
    try {
      const user = await login(form.email.trim(), form.password, { remember, mfaCode: needMfa ? form.mfa : undefined });
      await celebrate(350);
      router.replace(destinationFor(user.role, user.roleConfirmed === false, next));
    } catch (err) {
      const unverified = emailPendingFrom(err);
      if (unverified) { setPending(unverified); onStepChange?.('code'); return; }
      const msg = apiErrorMessage(err, 'Invalid email or password');
      if (msg === 'MFA_REQUIRED') { setNeedMfa(true); setErrors({}); return; }
      setErrors({ form: msg === 'Invalid credentials' ? 'That email and password don’t match. Try again or reset your password.' : msg });
    } finally {
      setBusy(false);
    }
  }

  if (pending) {
    return (
      <CodeStep
        destination={pending.maskedEmail}
        resendIn={pending.resendIn}
        backLabel="Back to log in"
        onBack={() => { setPending(null); onStepChange?.('form'); }}
        onVerify={async (code) => {
          const res = await verifyEmail(pending.email, code);
          router.replace(destinationFor(res.user.role, res.needsRole, next));
        }}
        onResend={async () => (await resendEmail(pending.email)).resendIn}
      />
    );
  }

  return (
    <div>
      <h1 data-anim="row" className="font-display text-3xl font-extrabold text-ink sm:text-[2rem]">Welcome back!</h1>
      <p data-anim="row" className="mt-1 font-body font-semibold text-slate-600">Log in to continue your learning adventure.</p>

      <form onSubmit={submit} noValidate className="mt-7 space-y-4">
        <div data-anim="row">
          <Field label="Email" icon={<Mail className="h-[18px] w-[18px]" />} type="email" autoComplete="email" inputMode="email"
            placeholder="you@example.com" value={form.email} onChange={set('email')} error={errors.email} autoFocus maxLength={254} />
        </div>
        <div data-anim="row">
          <PasswordField label="Password" icon={<Lock className="h-[18px] w-[18px]" />} autoComplete="current-password"
            placeholder="Enter your password" value={form.password} onChange={set('password')} error={errors.password} maxLength={72} />
        </div>
        {needMfa && (
          <div className="animate-slide-down">
            <Field label="Authenticator code" icon={<KeyRound className="h-[18px] w-[18px]" />} inputMode="numeric" autoComplete="one-time-code"
              placeholder="6-digit code" value={form.mfa} onChange={set('mfa')} error={errors.mfa} maxLength={6} autoFocus
              hint="Your account has two-step sign-in turned on." />
          </div>
        )}

        <div data-anim="row" className="flex items-center justify-between gap-3">
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 font-body text-sm font-bold text-slate-700">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
              className="h-5 w-5 rounded-md border-slate-300 accent-iris-600" />
            Remember me
          </label>
          <Link href={AUTH.forgot} onClick={() => rememberResetEmail(form.email.trim())} className="font-body text-sm font-extrabold text-iris-700 hover:underline">
            Forgot password?
          </Link>
        </div>

        <FormError>{errors.form}</FormError>

        <div data-anim="row">
          <PrimaryButton type="submit" busy={busy}>{busy ? 'Logging in…' : 'Log in'}</PrimaryButton>
        </div>
      </form>

      <div data-anim="row"><SocialRow next={next} /></div>

      <p data-anim="row" className="mt-7 text-center font-body text-sm font-semibold text-slate-600">
        Don&apos;t have an account?{' '}
        <Link href={authHref(AUTH.signup, { next })} className="font-extrabold text-iris-700 underline underline-offset-2">Sign up</Link>
      </p>
    </div>
  );
}
