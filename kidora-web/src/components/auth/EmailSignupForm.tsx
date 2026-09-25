'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label } from '@/components/ui/input';
import { emailSchema, passwordSchema } from '@/features/auth/schema';
import { apiErrorMessage } from '@/lib/api-error';
import { useShake } from './scene/KidoraAuthScene';
import { useAuthStore } from '@/stores/auth.store';
import type { EmailPending } from '@/types';

interface Props {
  /** Called once the account exists and the code has been emailed. */
  onPending: (pending: EmailPending) => void;
  disabled?: boolean;
}

/** 0–4, for the strength meter. Length and variety, nothing cleverer. */
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
 * Sign up with email and password. The account is created unverified and a
 * 6-digit code is emailed — the caller shows the code step next. The role is
 * asked afterwards, the same as for phone and social sign-up.
 */
export function EmailSignupForm({ onPending, disabled }: Props) {
  const register = useAuthStore((s) => s.register);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [ref, shake] = useShake<HTMLFormElement>();

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '', form: '' }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = 'Please tell us your name';
    const em = emailSchema.safeParse(form.email);
    if (!em.success) next.email = em.error.issues[0].message;
    const pw = passwordSchema.safeParse(form.password);
    if (!pw.success) next.password = pw.error.issues[0].message;
    if (Object.keys(next).length) {
      setErrors(next);
      shake();
      return;
    }

    setBusy(true);
    try {
      onPending(await register({ name: form.name.trim(), email: form.email.trim(), password: form.password }));
    } catch (err) {
      setErrors({ form: apiErrorMessage(err, "We couldn't create your account. Please try again.") });
      shake();
    } finally {
      setBusy(false);
    }
  }

  const s = strength(form.password);

  return (
    <form ref={ref} onSubmit={submit} noValidate>
      <div data-stagger>
        <Label htmlFor="su-name">Your name</Label>
        <Input id="su-name" autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Abebe Bekele" />
        <FieldError>{errors.name}</FieldError>
      </div>

      <div data-stagger className="mt-3">
        <Label htmlFor="su-email">Email</Label>
        <Input id="su-email" type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" />
        <FieldError>{errors.email}</FieldError>
      </div>

      <div data-stagger className="mt-3">
        <Label htmlFor="su-password">Password</Label>
        <div className="relative">
          <Input
            id="su-password"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            placeholder="At least 8 characters"
            className="pr-16"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute inset-y-0 right-3 my-auto h-8 rounded-lg px-2 font-body-x text-[12px] text-brand-600 hover:bg-brand-100"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        {form.password && (
          <div className="mt-2 flex items-center gap-2" aria-live="polite">
            <div className="flex flex-1 gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={'h-1.5 flex-1 rounded-full transition-colors duration-300 ' + (i < s ? STRENGTH[s].bar : 'bg-brand-100')} />
              ))}
            </div>
            <span className="font-body-x text-[11px] text-brand-500">{STRENGTH[s].label}</span>
          </div>
        )}
        <FieldError>{errors.password}</FieldError>
      </div>

      {errors.form && <p role="alert" className="mt-3 animate-slide-down font-body-x text-[13px] text-coral-600">{errors.form}</p>}

      <div data-stagger>
        <Button type="submit" size="lg" className="mt-5 w-full" disabled={busy || disabled}>
          {busy ? 'Creating your account…' : 'Create account →'}
        </Button>
      </div>
      <p className="mt-3 text-center font-body-x text-[12px] text-brand-400">We&apos;ll email you a code to confirm it&apos;s you.</p>
    </form>
  );
}
