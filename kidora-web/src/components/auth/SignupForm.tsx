'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, User as UserIcon } from 'lucide-react';

import { CodeStep } from './CodeStep';
import { Field, FormError, PasswordField, PrimaryButton, SocialRow } from './kidora/ui';
import { AUTH, authHref, destinationFor, safeNext } from '@/features/auth/routes';
import { emailSchema, passwordSchema } from '@/features/auth/schema';
import { apiErrorMessage } from '@/lib/api-error';
import { useAuthStore } from '@/stores/auth.store';
import type { EmailPending } from '@/types';

/** 0–4 for the strength meter: length and variety, nothing cleverer. */
function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const STRENGTH = [
  { label: 'Too short', bar: 'bg-coral-500' },
  { label: 'Weak', bar: 'bg-coral-500' },
  { label: 'Okay', bar: 'bg-sun-500' },
  { label: 'Good', bar: 'bg-grass-500' },
  { label: 'Strong', bar: 'bg-grass-600' },
];

/**
 * "Create your account": full name, email, password (twice), or a social
 * provider. The account is created unverified and a code is emailed; after
 * the code comes "How will you use Kidora?".
 */
export function SignupForm({ onStepChange }: { onStepChange?: (step: string) => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const roleHint = params.get('role');
  const { register, verifyEmail, resendEmail } = useAuthStore();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<EmailPending | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: '', form: '' }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = 'Please enter your full name';
    const em = emailSchema.safeParse(form.email);
    if (!em.success) errs.email = em.error.issues[0].message;
    const pw = passwordSchema.safeParse(form.password);
    if (!pw.success) errs.password = pw.error.issues[0].message;
    if (!form.confirm) errs.confirm = 'Please confirm your password';
    else if (form.confirm !== form.password) errs.confirm = "Passwords don't match";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setBusy(true);
    try {
      const res = await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      setPending(res);
      onStepChange?.('code');
    } catch (err) {
      setErrors({ form: apiErrorMessage(err, "We couldn't create your account. Please try again.") });
    } finally {
      setBusy(false);
    }
  }

  if (pending) {
    return (
      <CodeStep
        destination={pending.maskedEmail}
        resendIn={pending.resendIn}
        backLabel="Edit my details"
        onBack={() => { setPending(null); onStepChange?.('form'); }}
        onVerify={async (code) => {
          const res = await verifyEmail(pending.email, code);
          router.replace(destinationFor(res.user.role, res.needsRole, next, roleHint));
        }}
        onResend={async () => (await resendEmail(pending.email)).resendIn}
      />
    );
  }

  const s = strength(form.password);

  return (
    <div>
      <p data-anim="row" className="mb-8 hidden text-right font-body text-sm font-semibold text-slate-600 lg:block">
        Already have an account?{' '}
        <Link href={authHref(AUTH.login, { next })} className="font-extrabold text-iris-700 underline underline-offset-2">Log in</Link>
      </p>

      <h1 data-anim="row" className="font-display text-3xl font-extrabold text-ink sm:text-[2rem]">Create your account</h1>
      <p data-anim="row" className="mt-1 font-body font-semibold text-slate-600">Join Kidora and start your learning journey!</p>

      <form onSubmit={submit} noValidate className="mt-7 space-y-4">
        <div data-anim="row">
          <Field label="Full name" icon={<UserIcon className="h-[18px] w-[18px]" />} autoComplete="name" placeholder="Enter your full name"
            value={form.name} onChange={set('name')} error={errors.name} maxLength={120} />
        </div>
        <div data-anim="row">
          <Field label="Email" icon={<Mail className="h-[18px] w-[18px]" />} type="email" autoComplete="email" inputMode="email" placeholder="you@example.com"
            value={form.email} onChange={set('email')} error={errors.email} maxLength={254} />
        </div>
        <div data-anim="row">
          <PasswordField label="Password" icon={<Lock className="h-[18px] w-[18px]" />} autoComplete="new-password" placeholder="Create a strong password"
            value={form.password} onChange={set('password')} error={errors.password} maxLength={72} />
          {form.password && (
            <div className="mt-2 flex items-center gap-2" aria-live="polite">
              <div className="flex flex-1 gap-1" aria-hidden>
                {[0, 1, 2, 3].map((i) => <span key={i} className={'h-1.5 flex-1 rounded-full transition-colors ' + (i < s ? STRENGTH[s].bar : 'bg-slate-200')} />)}
              </div>
              <span className="font-body text-xs font-bold text-slate-500">{STRENGTH[s].label}</span>
            </div>
          )}
        </div>
        <div data-anim="row">
          <PasswordField label="Confirm password" icon={<Lock className="h-[18px] w-[18px]" />} autoComplete="new-password" placeholder="Type your password again"
            value={form.confirm} onChange={set('confirm')} error={errors.confirm} maxLength={72} />
        </div>

        <FormError>{errors.form}</FormError>

        <div data-anim="row" className="pt-1">
          <PrimaryButton type="submit" busy={busy}>{busy ? 'Creating your account…' : 'Sign up'}</PrimaryButton>
        </div>
      </form>

      <div data-anim="row"><SocialRow next={next} /></div>

      <p data-anim="row" className="mt-7 text-center font-body text-xs font-semibold leading-relaxed text-slate-500">
        By creating an account, you agree to our<br />
        <Link href="/terms" className="font-bold text-iris-700 hover:underline">Terms of Service</Link> and{' '}
        <Link href="/privacy" className="font-bold text-iris-700 hover:underline">Privacy Policy</Link>
      </p>
      <p className="mt-4 text-center font-body text-sm font-semibold text-slate-600 lg:hidden">
        Already have an account?{' '}
        <Link href={authHref(AUTH.login, { next })} className="font-extrabold text-iris-700 underline underline-offset-2">Log in</Link>
      </p>
    </div>
  );
}
