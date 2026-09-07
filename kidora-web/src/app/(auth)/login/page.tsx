'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { loginSchema, otpRequestSchema, otpVerifySchema, zodErrors } from '@/features/auth/schema';
import { useAuthStore } from '@/stores/auth.store';
import { ROLE_HOME, AREA_ROLES, areaFor } from '@/constants';
import type { Role } from '@/types';
import { Button } from '@/components/ui/button';
import { Input, Label, FieldError } from '@/components/ui/input';
import { SignupModal } from '@/components/shared/SignupModal';

type Mode = 'email' | 'sms';

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, requestOtp, verifyOtp } = useAuthStore();

  const [mode, setMode] = useState<Mode>('email');
  const [form, setForm] = useState({ email: '', password: '' });
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  // The SMS tab is two steps: ask for a code, then enter it.
  const [codeSent, setCodeSent] = useState(false);
  const [notice, setNotice] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);

  function land(role: string) {
    const home = ROLE_HOME[role as keyof typeof ROLE_HOME] ?? '/';

    // Return the user to the page a guard bounced them off, but only if their
    // role may actually enter it — otherwise an old ?next= would bounce them
    // straight back here.
    const next = params.get('next');
    if (next?.startsWith('/') && !next.startsWith('//')) {
      const area = areaFor(next);
      const role_ = role as Role;
      if (!area || (AREA_ROLES[area] ?? []).includes(role_)) {
        router.replace(next);
        return;
      }
    }
    router.replace(home);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setErrors({});
    setNotice('');
    setCodeSent(false);
    setCode('');
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) { setErrors(zodErrors(parsed.error)); return; }

    setErrors({}); setBusy(true);
    try {
      land((await login(form.email, form.password)).role);
    } catch (err) {
      setErrors(loginError(err));
    } finally { setBusy(false); }
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const parsed = otpRequestSchema.safeParse({ phone });
    if (!parsed.success) { setErrors(zodErrors(parsed.error)); return; }

    setErrors({}); setBusy(true);
    try {
      const res = await requestOtp(phone);
      setCodeSent(true);
      // Without Twilio credentials the API echoes the code back in dev, so the
      // flow is testable with no real handset.
      setNotice(res.devCode ? `Dev mode — your code is ${res.devCode}` : `We texted a code to ${phone}.`);
    } catch (err) {
      setErrors(loginError(err, 'phone'));
    } finally { setBusy(false); }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    const parsed = otpVerifySchema.safeParse({ phone, code });
    if (!parsed.success) { setErrors(zodErrors(parsed.error)); return; }

    setErrors({}); setBusy(true);
    try {
      land((await verifyOtp(phone, code)).role);
    } catch (err) {
      setErrors(loginError(err, 'code'));
    } finally { setBusy(false); }
  }

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => switchMode(m)}
      className={
        'flex-1 rounded-xl py-2 font-display font-extrabold text-sm transition ' +
        (mode === m ? 'bg-brand-700 text-white' : 'bg-brand-100 text-brand-600 hover:bg-brand-200')
      }
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col items-center justify-center bg-gradient-to-br from-brand-600 via-brand-800 to-grass-600 text-white p-12 text-center">
        <div className="text-6xl mb-4">🎓</div>
        <h1 className="font-display font-extrabold text-4xl">Welcome back!</h1>
        <p className="font-body font-bold text-brand-100 mt-2">Ready for a new adventure?</p>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h2 className="font-display font-extrabold text-3xl text-brand-900 mb-1">Log in</h2>
          <p className="font-body font-bold text-brand-600 mb-6">
            New here?{' '}
            <button type="button" onClick={() => setSignupOpen(true)} className="text-brand-800 underline">
              Create an account
            </button>
          </p>

          <div className="flex gap-2 mb-6">
            {tab('email', '✉️ Email')}
            {tab('sms', '📱 SMS code')}
          </div>

          {mode === 'email' ? (
            <form onSubmit={submitPassword}>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@family.com" />
              <FieldError>{errors.email}</FieldError>
              <div className="h-4" />
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
              <FieldError>{errors.password}</FieldError>
              <FieldError>{errors.form}</FieldError>
              <Button type="submit" size="lg" className="w-full mt-6" disabled={busy}>{busy ? 'Logging in…' : 'Log in →'}</Button>
            </form>
          ) : !codeSent ? (
            <form onSubmit={sendCode}>
              <Label>Mobile number</Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+251912345678" autoComplete="tel" />
              <p className="text-[12px] font-bold text-brand-400 mt-1">Include your country code.</p>
              <FieldError>{errors.phone}</FieldError>
              <FieldError>{errors.form}</FieldError>
              <Button type="submit" size="lg" className="w-full mt-6" disabled={busy}>{busy ? 'Sending…' : 'Text me a code →'}</Button>
            </form>
          ) : (
            <form onSubmit={submitCode}>
              {notice && <p className="font-body font-bold text-grass-700 mb-3 text-sm">{notice}</p>}
              <Label>6-digit code</Label>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
              />
              <FieldError>{errors.code}</FieldError>
              <FieldError>{errors.form}</FieldError>
              <Button type="submit" size="lg" className="w-full mt-6" disabled={busy}>{busy ? 'Checking…' : 'Log in →'}</Button>
              <button
                type="button"
                onClick={() => { setCodeSent(false); setCode(''); setNotice(''); setErrors({}); }}
                className="w-full mt-3 font-body font-bold text-brand-600 underline text-sm"
              >
                Use a different number
              </button>
            </form>
          )}

          <p className="font-body font-bold text-brand-500 text-center mt-6 text-sm">
            <Link href="/" className="underline">Back to Kidora</Link>
          </p>
        </div>
      </div>

      <SignupModal
        open={signupOpen}
        onClose={() => setSignupOpen(false)}
        onPick={(role) => router.push(`/register?role=${role}`)}
      />
    </div>
  );
}

/**
 * Turns an API failure into a field message. `field` is where an
 * otherwise-unattributed error is shown, since the SMS tab has no password
 * input to hang it on.
 */
function loginError(err: unknown, field = 'password'): Record<string, string> {
  if (!axios.isAxiosError(err)) return { form: 'Something went wrong. Please try again.' };
  if (!err.response) return { form: "Can't reach Kidora right now. Check your connection and try again." };

  const raw = (err.response.data as { message?: string | string[] })?.message;
  const text = Array.isArray(raw) ? raw.join(', ') : raw;

  if (err.response.status === 401 && (!text || text === 'Invalid credentials')) {
    return field === 'password'
      ? { password: 'Invalid email or password' }
      : { [field]: 'That code is not correct or has expired.' };
  }
  return { [field]: text || 'Login failed. Please try again.' };
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
