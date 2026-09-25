'use client';

import { Suspense, useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { AuthShell, AuthStep } from '@/components/auth/AuthShell';
import { CodeStep } from '@/components/auth/CodeStep';
import { MethodTabs, type AuthMethod } from '@/components/auth/MethodTabs';
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
import { celebrate, shake } from '@/lib/motion';
import { emailPendingFrom, useAuthStore } from '@/stores/auth.store';
import type { EmailPending, Role } from '@/types';

type Step = 'start' | 'phone-code' | 'email-code' | 'role' | 'verify' | 'pending';

/**
 * Sign in: phone + texted code, email + password, or a social provider.
 * Students, parents, teachers and schools all use the same screen — the
 * account's role decides which dashboard they land on.
 */
function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();

  const { login, startPhone, verifyPhone, verifyEmail, resendEmail } = useAuthStore();
  const phone = usePhoneNumber();

  const [step, setStep] = useState<Step>('start');
  const [method, setMethod] = useState<AuthMethod>(params.get('method') === 'email' ? 'email' : 'phone');
  const [busy, setBusy] = useState(false);
  // Which administrative role the verification form is collecting for.
  const [verifyRole, setVerifyRole] = useState<'SCHOOL_ADMIN' | 'SCHOOL_LEADER' | 'DISTRICT_ADMIN'>('SCHOOL_LEADER');
  const [error, setError] = useState('');
  const [invalid, setInvalid] = useState(false);

  const [sent, setSent] = useState<{ to: string; resendIn: number }>({ to: '', resendIn: 45 });
  const [emailPending, setEmailPending] = useState<EmailPending | null>(null);

  // Email path
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPw, setShowPw] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // `next` (and the legacy `redirect`) survive the whole flow.
  const next = params.get('next') ?? params.get('redirect');

  const goHome = useCallback(
    async (role: Role) => {
      await celebrate(500);
      router.replace(next || ROLE_HOME[role] || '/');
    },
    [next, router],
  );

  const afterSignIn = (needsRole: boolean, role: Role) => (needsRole ? setStep('role') : goHome(role));

  async function sendCode() {
    if (!isValidE164(phone.e164) || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await startPhone(phone.e164);
      setSent({ to: res.phone, resendIn: res.resendIn ?? 45 });
      setStep('phone-code');
    } catch (e) {
      setError(apiErrorMessage(e, "We couldn't send the code."));
      setInvalid(true);
      setTimeout(() => setInvalid(false), 500);
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      shake(formRef.current);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const user = await login(form.email, form.password);
      afterSignIn(user.roleConfirmed === false, user.role);
    } catch (err) {
      // Right password, address never confirmed: the API has just emailed a
      // fresh code, so go straight to entering it.
      const pending = emailPendingFrom(err);
      if (pending) {
        setEmailPending(pending);
        setStep('email-code');
        return;
      }
      setErrors({ password: apiErrorMessage(err, 'Invalid email or password') });
      shake(formRef.current);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={step === 'start' || step.endsWith('code') ? 'Welcome back 👋' : 'Almost there!'}
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
      {step === 'start' && (
        <AuthStep key="start">
          <h1 data-stagger className="font-display text-3xl font-extrabold text-brand-900">Sign in</h1>
          <p data-stagger className="mb-5 mt-1 font-body font-bold text-brand-500">
            Students, parents, teachers and schools — welcome back.
          </p>

          <div data-stagger>
            <MethodTabs value={method} onChange={(m) => { setMethod(m); setError(''); setErrors({}); }} />
          </div>

          {method === 'phone' ? (
            <div key="phone" className="animate-fade-in">
              <PhoneField
                country={phone.country}
                onCountryChange={phone.setCountry}
                value={phone.national}
                onValueChange={(v) => { phone.setNational(v); setError(''); }}
                onSubmit={sendCode}
                invalid={invalid}
                disabled={busy}
              />
              {error && <p role="alert" className="mt-2 animate-slide-down font-body-x text-[13px] text-coral-600">{error}</p>}

              <Button size="lg" className="mt-4 w-full" disabled={!isValidE164(phone.e164) || busy} onClick={sendCode}>
                {busy ? 'Sending code…' : 'Text me a code →'}
              </Button>
            </div>
          ) : (
            <form key="email" ref={formRef} onSubmit={submitPassword} noValidate className="animate-fade-in">
              <Label htmlFor="li-email">Email</Label>
              <Input
                id="li-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
              <FieldError>{errors.email}</FieldError>

              <div className="mt-3">
                <Label htmlFor="li-password">Password</Label>
                <div className="relative">
                  <Input
                    id="li-password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute inset-y-0 right-3 my-auto h-8 rounded-lg px-2 font-body-x text-[12px] text-brand-600 hover:bg-brand-100"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
                <FieldError>{errors.password}</FieldError>
              </div>

              <Button type="submit" size="lg" className="mt-5 w-full" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in →'}
              </Button>
              <p className="mt-3 text-center font-body-x text-[12px] text-brand-400">
                Forgot your password? Sign in with your phone, or with Google, Facebook or TikTok.
              </p>
            </form>
          )}

          <SocialButtons disabled={busy} next={next} verb="Sign in with" />

          <p className="mt-6 text-center font-body font-bold text-brand-500">
            New to Kidora?{' '}
            <Link href={next ? `/join?next=${encodeURIComponent(next)}` : '/join'} className="text-brand-800 underline">
              Create an account
            </Link>
          </p>
        </AuthStep>
      )}

      {step === 'phone-code' && (
        <AuthStep key="phone-code">
          <CodeStep
            channel="sms"
            destination={sent.to || phone.e164}
            resendIn={sent.resendIn}
            backLabel="Change number"
            onBack={() => { setStep('start'); setError(''); }}
            onVerify={async (code) => {
              const res = await verifyPhone(phone.e164, code);
              afterSignIn(res.needsRole, res.user.role);
            }}
            onResend={async () => {
              const res = await startPhone(phone.e164);
              setSent({ to: res.phone, resendIn: res.resendIn });
              return res.resendIn ?? 45;
            }}
          />
        </AuthStep>
      )}

      {step === 'email-code' && emailPending && (
        <AuthStep key="email-code">
          <p className="mb-4 rounded-2xl bg-sun-300/40 px-3 py-2 font-body-x text-[13px] text-sun-700">
            Please confirm your email to finish signing in.
          </p>
          <CodeStep
            channel="email"
            destination={emailPending.maskedEmail}
            resendIn={emailPending.resendIn}
            backLabel="Back to sign in"
            onBack={() => setStep('start')}
            onVerify={async (code) => {
              const res = await verifyEmail(emailPending.email, code);
              afterSignIn(res.needsRole, res.user.role);
            }}
            onResend={async () => (await resendEmail(emailPending.email)).resendIn}
          />
        </AuthStep>
      )}

      {step === 'role' && (
        <AuthStep key="role">
          <RolePicker
            onDone={goHome}
            onNeedsVerification={(r) => { setVerifyRole(r); setStep('verify'); }}
            initialRole={params.get('role')}
          />
        </AuthStep>
      )}

      {step === 'verify' && (
        <AuthStep key="verify">
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
        </AuthStep>
      )}

      {step === 'pending' && (
        <AuthStep key="pending">
          <PendingApproval />
        </AuthStep>
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
