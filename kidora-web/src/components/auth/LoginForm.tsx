'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, Lock, Mail } from 'lucide-react';

import { CodeStep } from './CodeStep';
import { isValidPhone, PhoneField } from './PhoneField';
import { Field, FormError, PasswordField, PrimaryButton, SocialRow } from './kidora/ui';
import { AUTH, authHref, destinationFor, rememberResetEmail, safeNext } from '@/features/auth/routes';
import { emailSchema } from '@/features/auth/schema';
import { apiErrorMessage } from '@/lib/api-error';
import { celebrate } from '@/lib/motion';
import { emailPendingFrom, phonePendingFrom, useAuthStore } from '@/stores/auth.store';
import type { EmailPending, PhonePending } from '@/types';

/** The code step being shown: an emailed code, or a texted one (sign-up verification or phone log-in). */
type Pending =
  | { kind: 'email'; data: EmailPending }
  | { kind: 'sms-verify'; data: PhonePending }
  | { kind: 'sms-login'; data: PhonePending };

/**
 * "Welcome back!": email + password (+ Remember me), "Log in with phone" (a
 * 4-digit code texted to the account's number), Google / Facebook. An
 * account that was never verified is sent a fresh code (by SMS when it has a
 * phone) and asked for it here; an account with an authenticator app is
 * asked for its 6-digit code.
 */
export function LoginForm({ onStepChange }: { onStepChange?: (step: string) => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next') ?? params.get('redirect'));
  const { login, verifyEmail, resendEmail, verifyPhone, resendPhone, requestPhoneLogin, verifyPhoneLogin } = useAuthStore();

  const [mode, setMode] = useState<'email' | 'phone'>(params.get('method') === 'phone' ? 'phone' : 'email');
  const [form, setForm] = useState({ email: '', phone: '', password: '', mfa: '' });
  const [remember, setRemember] = useState(true);
  const [needMfa, setNeedMfa] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors({});
  };

  async function submitPhone(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidPhone(form.phone)) { setErrors({ phone: 'Pick your country and enter the phone number on your account.' }); return; }
    setBusy(true);
    try {
      const res = await requestPhoneLogin(form.phone.trim());
      setPending({ kind: 'sms-login', data: res });
      onStepChange?.('code');
    } catch (err) {
      setErrors({ phone: apiErrorMessage(err, "We couldn't text your code. Please try again.") });
    } finally {
      setBusy(false);
    }
  }

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
      const unverifiedPhone = phonePendingFrom(err);
      if (unverifiedPhone) { setPending({ kind: 'sms-verify', data: unverifiedPhone }); onStepChange?.('code'); return; }
      const unverified = emailPendingFrom(err);
      if (unverified) { setPending({ kind: 'email', data: unverified }); onStepChange?.('code'); return; }
      const msg = apiErrorMessage(err, 'Invalid email or password');
      if (msg === 'MFA_REQUIRED') { setNeedMfa(true); setErrors({}); return; }
      setErrors({ form: msg === 'Invalid credentials' ? 'That email and password don’t match. Try again or reset your password.' : msg });
    } finally {
      setBusy(false);
    }
  }

  if (pending) {
    const back = () => { setPending(null); onStepChange?.('form'); };
    if (pending.kind === 'email') {
      const p = pending.data;
      return (
        <CodeStep
          destination={p.maskedEmail}
          resendIn={p.resendIn}
          backLabel="Back to log in"
          onBack={back}
          onVerify={async (code) => {
            const res = await verifyEmail(p.email, code);
            router.replace(destinationFor(res.user.role, res.needsRole, next));
          }}
          onResend={async () => (await resendEmail(p.email)).resendIn}
        />
      );
    }
    const p = pending.data;
    const isLogin = pending.kind === 'sms-login';
    return (
      <CodeStep
        channel="sms"
        destination={p.maskedPhone}
        resendIn={p.resendIn}
        backLabel="Back to log in"
        onBack={back}
        onVerify={async (code) => {
          const res = isLogin ? await verifyPhoneLogin(p.phone, code) : await verifyPhone(p.phone, code);
          await celebrate(350);
          router.replace(destinationFor(res.user.role, res.needsRole, next));
        }}
        onResend={async () => (isLogin ? await requestPhoneLogin(p.phone) : await resendPhone(p.phone)).resendIn}
      />
    );
  }

  const switchMode = (m: 'email' | 'phone') => { setMode(m); setErrors({}); setNeedMfa(false); };

  const modeTabs = (
    <div data-anim="row" role="tablist" aria-label="How to log in" className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
      {(['email', 'phone'] as const).map((m) => (
        <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => switchMode(m)}
          className={'min-h-10 rounded-lg font-body text-sm font-extrabold transition ' + (mode === m ? 'bg-white text-iris-700 shadow-sm' : 'text-slate-600 hover:text-ink')}>
          {m === 'email' ? 'Email & password' : 'Phone code'}
        </button>
      ))}
    </div>
  );

  if (mode === 'phone') {
    return (
      <div>
        <h1 data-anim="row" className="font-display text-3xl font-extrabold text-ink sm:text-[2rem]">Welcome back!</h1>
        <p data-anim="row" className="mt-1 font-body font-semibold text-slate-600">Log in to continue your learning adventure.</p>
        {modeTabs}
        <form onSubmit={submitPhone} noValidate className="mt-5 space-y-4">
          <div data-anim="row">
            <PhoneField label="Phone number" value={form.phone} error={errors.phone} autoFocus
              onChange={(phone) => { setForm((f) => ({ ...f, phone })); setErrors({}); }}
              hint="The number on your Kidora account. We text you a 4-digit code." />
          </div>
          <div data-anim="row">
            <PrimaryButton type="submit" busy={busy}>{busy ? 'Sending code…' : 'Text me a code'}</PrimaryButton>
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

  return (
    <div>
      <h1 data-anim="row" className="font-display text-3xl font-extrabold text-ink sm:text-[2rem]">Welcome back!</h1>
      <p data-anim="row" className="mt-1 font-body font-semibold text-slate-600">Log in to continue your learning adventure.</p>
      {modeTabs}

      <form onSubmit={submit} noValidate className="mt-5 space-y-4">
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
