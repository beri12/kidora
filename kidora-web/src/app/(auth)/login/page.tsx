'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { AuthShell } from '@/components/auth/AuthShell';
import { OtpInput } from '@/components/auth/OtpInput';
import { PhoneField, usePhoneNumber } from '@/components/auth/PhoneField';
import { RolePicker } from '@/components/auth/RolePicker';
import { OrgVerifyForm } from '@/components/auth/OrgVerifyForm';
import { PendingApproval } from '@/components/auth/PendingApproval';
import { SocialButtons } from '@/components/auth/SocialButtons';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label } from '@/components/ui/input';
import { ROLE_HOME } from '@/constants';
import { isValidE164 } from '@/constants/countries';
import { loginSchema } from '@/features/auth/schema';
import { apiErrorMessage } from '@/lib/api-error';
import { useAuthStore } from '@/stores/auth.store';
import type { Role } from '@/types';

type Step = 'phone' | 'code' | 'password' | 'role' | 'verify' | 'pending';

/**
 * Sign in. Phone + code is the default path; email and password are still
 * there for accounts that were created that way, one tap behind "Use email
 * instead".
 */
function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();

  const { login, startPhone, verifyPhone } = useAuthStore();
  const phone = usePhoneNumber();

  const [step, setStep] = useState<Step>('phone');
  const [busy, setBusy] = useState(false);
  // Which administrative role the verification form is collecting for.
  const [verifyRole, setVerifyRole] = useState<'SCHOOL_ADMIN' | 'SCHOOL_LEADER' | 'DISTRICT_ADMIN'>('SCHOOL_LEADER');
  const [error, setError] = useState('');
  const [invalid, setInvalid] = useState(false);

  // Phone path
  const [code, setCode] = useState('');
  const [masked, setMasked] = useState('');
  const [devCode, setDevCode] = useState('');
  const [resendIn, setResendIn] = useState(0);

  // Email path
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // `next` (and the legacy `redirect`) survive the whole flow.
  const next = params.get('next') ?? params.get('redirect');

  const goHome = useCallback(
    (role: Role) => router.replace(next || ROLE_HOME[role] || '/'),
    [next, router],
  );

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  function flashInvalid(ms = 600) {
    setInvalid(true);
    setTimeout(() => setInvalid(false), ms);
  }

  async function sendCode(resend = false) {
    if (!isValidE164(phone.e164) || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await startPhone(phone.e164);
      setMasked(res.phone);
      setResendIn(res.resendIn ?? 45);
      setDevCode(res.devCode ?? '');
      setCode('');
      setStep('code');
    } catch (e) {
      setError(apiErrorMessage(e, resend ? "We couldn't resend the code." : "We couldn't send the code."));
      flashInvalid(500);
    } finally {
      setBusy(false);
    }
  }

  const verifying = useRef(false);

  async function submitCode(value: string) {
    if (verifying.current) return;
    verifying.current = true;
    setBusy(true);
    setError('');
    try {
      const res = await verifyPhone(phone.e164, value);
      if (res.needsRole) setStep('role');
      else goHome(res.user.role);
    } catch (e) {
      setError(apiErrorMessage(e, 'That code is not right.'));
      setCode('');
      flashInvalid();
    } finally {
      verifying.current = false;
      setBusy(false);
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const user = await login(form.email, form.password);
      goHome(user.role);
    } catch (err) {
      setErrors({ password: apiErrorMessage(err, 'Invalid email or password') });
      flashInvalid();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={step === 'phone' || step === 'code' || step === 'password' ? 'Welcome back 👋' : 'Almost there!'}
      subtitle={
        step === 'pending'
          ? "We're verifying your organisation."
          : step === 'verify'
            ? 'One check and your dashboard is ready.'
            : step === 'role'
              ? 'One question and you are in.'
              : 'Your next adventure is waiting.'
      }
    >
      {step === 'phone' && (
        <div key="phone" className="animate-slide-in-right">
          <h1 className="font-display text-3xl font-extrabold text-brand-900">Sign in</h1>
          <p className="mt-1 font-body font-bold text-brand-500">
            We&apos;ll text you a code — no password needed.
          </p>

          <div className="mt-6">
            <PhoneField
              country={phone.country}
              onCountryChange={phone.setCountry}
              value={phone.national}
              onValueChange={(v) => { phone.setNational(v); setError(''); }}
              onSubmit={() => sendCode()}
              invalid={invalid}
              disabled={busy}
            />
            {error && <p className="mt-2 animate-slide-down font-body-x text-[13px] text-coral-600">{error}</p>}
          </div>

          <Button size="lg" className="mt-4 w-full" disabled={!isValidE164(phone.e164) || busy} onClick={() => sendCode()}>
            {busy ? 'Sending code…' : 'Send me a code →'}
          </Button>

          <SocialButtons disabled={busy} next={next} />

          <button
            type="button"
            onClick={() => { setStep('password'); setError(''); }}
            className="mt-4 w-full font-body font-extrabold text-brand-500 transition hover:text-brand-700"
          >
            Use email and password instead
          </button>

          <p className="mt-5 text-center font-body font-bold text-brand-500">
            New to Kidora?{' '}
            <Link href={next ? `/join?next=${encodeURIComponent(next)}` : '/join'} className="text-brand-800 underline">
              Create an account
            </Link>
          </p>
        </div>
      )}

      {step === 'code' && (
        <div key="code" className="animate-slide-in-right">
          <button
            type="button"
            onClick={() => { setStep('phone'); setError(''); setCode(''); }}
            className="mb-4 inline-flex items-center gap-1 font-body font-extrabold text-brand-500 transition hover:-translate-x-0.5 hover:text-brand-700"
          >
            ← Change number
          </button>

          <h1 className="font-display text-3xl font-extrabold text-brand-900">Enter your code</h1>
          <p className="mt-1 font-body font-bold text-brand-500">
            Sent to <span className="text-brand-800">{masked || phone.e164}</span>
          </p>

          <div className="mt-7">
            <OtpInput
              value={code}
              onChange={(v) => { setCode(v); setError(''); }}
              onComplete={submitCode}
              disabled={busy}
              invalid={invalid}
              autoFocus
            />
          </div>

          {error && <p className="mt-3 animate-slide-down text-center font-body-x text-[13px] text-coral-600">{error}</p>}

          {devCode && (
            <p className="mt-3 rounded-xl bg-sun-300/40 px-3 py-2 text-center font-body-x text-[12px] text-sun-700">
              Twilio is not configured, so here is the code: <b>{devCode}</b>
            </p>
          )}

          <Button size="lg" className="mt-5 w-full" disabled={code.length < 6 || busy} onClick={() => submitCode(code)}>
            {busy ? 'Checking…' : 'Verify & continue →'}
          </Button>

          <p className="mt-5 text-center font-body font-bold text-brand-500">
            {resendIn > 0 ? (
              <>Resend code in <span className="tabular-nums text-brand-800">{resendIn}s</span></>
            ) : (
              <button type="button" onClick={() => sendCode(true)} disabled={busy} className="text-brand-800 underline">
                Resend code
              </button>
            )}
          </p>
        </div>
      )}

      {step === 'password' && (
        <form key="password" onSubmit={submitPassword} className={'animate-slide-in-right ' + (invalid ? 'animate-shake' : '')}>
          <button
            type="button"
            onClick={() => { setStep('phone'); setErrors({}); }}
            className="mb-4 inline-flex items-center gap-1 font-body font-extrabold text-brand-500 transition hover:-translate-x-0.5 hover:text-brand-700"
          >
            ← Back to phone sign-in
          </button>

          <h1 className="font-display text-3xl font-extrabold text-brand-900">Sign in with email</h1>
          <p className="mt-1 font-body font-bold text-brand-500">For accounts created with a password.</p>

          <div className="mt-6">
            <Label>Email</Label>
            <Input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@family.com"
            />
            <FieldError>{errors.email}</FieldError>
          </div>

          <div className="mt-3">
            <Label>Password</Label>
            <Input
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
            <FieldError>{errors.password}</FieldError>
          </div>

          <Button type="submit" size="lg" className="mt-6 w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in →'}
          </Button>
        </form>
      )}

      {step === 'role' && (
        <div key="role" className="animate-slide-in-right">
          <RolePicker
            onDone={goHome}
            onNeedsVerification={(r) => { setVerifyRole(r); setStep('verify'); }}
            initialRole={params.get('role')}
          />
        </div>
      )}
      {step === 'verify' && (
        <div key="verify">
          <OrgVerifyForm
            role={verifyRole}
            onBack={() => setStep('role')}
            onSubmitted={(res) => {
              // An organisation code is approved on the spot, so there is
              // nothing to wait for — go straight to the dashboard.
              if (res.roleGranted) goHome(res.request.requestedRole as Role);
              else setStep('pending');
            }}
          />
        </div>
      )}

      {step === 'pending' && (
        <div key="pending" className="animate-slide-in-right">
          <PendingApproval />
        </div>
      )}

    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
