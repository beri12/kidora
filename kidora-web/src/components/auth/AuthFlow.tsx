'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';

import { AuthShell, AuthStep } from './AuthShell';
import { CodeStep } from './CodeStep';
import { EmailSignupForm } from './EmailSignupForm';
import { OrgVerifyForm } from './OrgVerifyForm';
import { OtpInput } from './OtpInput';
import { PendingApproval } from './PendingApproval';
import { PhoneField, usePhoneNumber } from './PhoneField';
import { RolePicker } from './RolePicker';
import { SignInOptions } from './SignInOptions';
import { SuccessAnimation, useShake } from './scene/KidoraAuthScene';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label } from '@/components/ui/input';
import { ROLE_HOME } from '@/constants';
import { isValidE164 } from '@/constants/countries';
import { loginSchema, passwordSchema } from '@/features/auth/schema';
import { apiErrorMessage } from '@/lib/api-error';
import { celebrate } from '@/lib/motion';
import { emailPendingFrom, useAuthStore } from '@/stores/auth.store';
import type { EmailPending, Role } from '@/types';

type Step =
  | 'choose' | 'phone' | 'phone-code'
  | 'email' | 'email-code' | 'forgot' | 'reset'
  | 'role' | 'verify' | 'pending';

type Mode = 'signin' | 'signup';

/**
 * Sign-in and sign-up are one flow with two front doors (/login, /join):
 *
 *   choose ─┬─ Google / TikTok ──────────────► provider ─► /auth/callback
 *           ├─ Phone ─► number ─► texted code ─┐
 *           └─ email ─► password (sign in)     ├─► role? ─► dashboard
 *                     └ details  (sign up) ─► emailed code ┘
 *
 * Only accounts that have not answered "How will you use Kidora?" see the
 * role step; everyone else goes straight to their dashboard.
 */
export function AuthFlow({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const store = useAuthStore();
  const phone = usePhoneNumber();

  const initial = params.get('method');
  const [step, setStep] = useState<Step>(initial === 'phone' ? 'phone' : initial === 'email' ? 'email' : 'choose');
  const [back, setBack] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [verifyRole, setVerifyRole] = useState<'SCHOOL_ADMIN' | 'SCHOOL_LEADER' | 'DISTRICT_ADMIN'>('SCHOOL_LEADER');

  const [sent, setSent] = useState({ to: '', resendIn: 45 });
  const [emailPending, setEmailPending] = useState<EmailPending | null>(null);
  const [creds, setCreds] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reset, setReset] = useState({ email: '', masked: '', code: '', password: '' });
  const [formRef, shakeForm] = useShake<HTMLFormElement>();

  // `next` (and the legacy `redirect`) survive the whole flow.
  const next = params.get('next') ?? params.get('redirect');

  const go = (s: Step, isBack = false) => { setBack(isBack); setError(''); setErrors({}); setStep(s); };

  const goHome = useCallback(async (role: Role) => {
    setSuccess(true);
    await celebrate(550);
    router.replace(next || ROLE_HOME[role] || '/');
  }, [next, router]);

  const afterSignIn = (needsRole: boolean, role: Role) => (needsRole ? go('role') : goHome(role));

  async function sendPhoneCode() {
    if (!isValidE164(phone.e164) || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await store.startPhone(phone.e164);
      setSent({ to: res.phone, resendIn: res.resendIn ?? 45 });
      go('phone-code');
    } catch (e) {
      setError(apiErrorMessage(e, "We couldn't send the code."));
    } finally {
      setBusy(false);
    }
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse(creds);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      shakeForm();
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      const user = await store.login(creds.email, creds.password);
      afterSignIn(user.roleConfirmed === false, user.role);
    } catch (err) {
      // Right password, address never confirmed: the API has just emailed a
      // fresh code, so go straight to entering it.
      const pending = emailPendingFrom(err);
      if (pending) { setEmailPending(pending); go('email-code'); return; }
      setErrors({ password: apiErrorMessage(err, 'Invalid email or password') });
      shakeForm();
    } finally {
      setBusy(false);
    }
  }

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    if (!reset.email.trim()) { setErrors({ email: 'Enter your email' }); shakeForm(); return; }
    setBusy(true);
    try {
      const res = await store.forgotPassword(reset.email.trim());
      setReset((r) => ({ ...r, masked: res.maskedEmail, code: '', password: '' }));
      go('reset');
    } catch (err) {
      setErrors({ email: apiErrorMessage(err, "We couldn't send the reset code.") });
      shakeForm();
    } finally {
      setBusy(false);
    }
  }

  async function doReset(e: React.FormEvent) {
    e.preventDefault();
    const pw = passwordSchema.safeParse(reset.password);
    if (reset.code.length !== 6 || !pw.success) {
      setErrors({
        ...(reset.code.length !== 6 ? { code: 'Enter the 6-digit code' } : {}),
        ...(!pw.success ? { password: pw.error.issues[0].message } : {}),
      });
      shakeForm();
      return;
    }
    setBusy(true);
    try {
      const res = await store.resetPassword(reset.email.trim(), reset.code, reset.password);
      afterSignIn(res.needsRole, res.user.role);
    } catch (err) {
      setErrors({ code: apiErrorMessage(err, "We couldn't reset your password.") });
      setReset((r) => ({ ...r, code: '' }));
      shakeForm();
    } finally {
      setBusy(false);
    }
  }

  const greeting: Record<Step, string> = {
    choose: mode === 'signin' ? 'Welcome back! 👋' : 'Hi there! 👋',
    phone: "What's your number? 📱",
    'phone-code': 'Check your phone! 📬',
    email: mode === 'signin' ? 'Welcome back! 👋' : "Let's get you set up! ✏️",
    'email-code': 'Check your inbox! ✉️',
    forgot: 'No worries! 🔑',
    reset: 'Almost done! 🔑',
    role: 'Nice to meet you! 🌟',
    verify: 'Almost there! 🔍',
    pending: 'Almost there! ⏳',
  };

  const backButton = (to: Step, label: string) => (
    <button
      type="button"
      onClick={() => go(to, true)}
      className="mb-3 inline-flex min-h-11 items-center gap-1 font-body font-extrabold text-brand-500 hover:text-brand-700"
    >
      ← {label}
    </button>
  );

  return (
    <AuthShell title={greeting[step]} wide={step === 'role'}>
      <AnimatePresence mode="wait" initial={false}>
        {step === 'choose' && (
          <AuthStep key="choose" back={back}>
            <div className="text-center">
              <h1 className="font-display text-3xl font-extrabold text-brand-900">🌈 Welcome to Kidora!</h1>
              <p className="mb-6 mt-1 font-body text-lg font-bold text-brand-500">
                {mode === 'signin' ? '🚀 Ready to keep learning?' : '🚀 Ready to start learning?'}
              </p>
            </div>
            <SignInOptions
              onPhone={() => go('phone')}
              onEmail={() => go('email')}
              emailLabel={mode === 'signin' ? 'Sign in with email' : 'Sign up with email'}
              next={next}
            />
            <p className="mt-5 text-center font-body font-bold text-brand-500">
              {mode === 'signin' ? (
                <>✨ New to Kidora?{' '}
                  <Link href={next ? `/join?next=${encodeURIComponent(next)}` : '/join'} className="text-brand-800 underline">Create account</Link>
                </>
              ) : (
                <>Already have an account?{' '}
                  <Link href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} className="text-brand-800 underline">Sign in</Link>
                </>
              )}
            </p>
            {mode === 'signup' && (
              <p className="mt-3 text-center font-body-x text-[11px] leading-relaxed text-brand-400">
                By continuing you agree to Kidora&apos;s Terms and Privacy Policy. Children under 13 should sign up with a parent.
              </p>
            )}
          </AuthStep>
        )}

        {step === 'phone' && (
          <AuthStep key="phone" back={back}>
            {backButton('choose', 'Other ways')}
            <h1 className="font-display text-2xl font-extrabold text-brand-900">Your phone number</h1>
            <p className="mb-5 mt-1 font-body font-bold text-brand-500">We&apos;ll text you a 6-digit code. No password needed.</p>
            <PhoneField
              country={phone.country}
              onCountryChange={phone.setCountry}
              value={phone.national}
              onValueChange={(v) => { phone.setNational(v); setError(''); }}
              onSubmit={sendPhoneCode}
              invalid={Boolean(error)}
              disabled={busy}
              autoFocus
            />
            {error && <p role="alert" className="mt-2 font-body-x text-[13px] text-coral-600">{error}</p>}
            <Button size="lg" className="mt-4 min-h-14 w-full" disabled={!isValidE164(phone.e164) || busy} onClick={sendPhoneCode}>
              {busy ? 'Sending code…' : 'Text me a code →'}
            </Button>
            <p className="mt-2 text-center font-body-x text-[12px] text-brand-400">Standard SMS rates may apply.</p>
          </AuthStep>
        )}

        {step === 'phone-code' && (
          <AuthStep key="phone-code" back={back}>
            <CodeStep
              channel="sms"
              destination={sent.to || phone.e164}
              resendIn={sent.resendIn}
              backLabel="Change number"
              onBack={() => go('phone', true)}
              onVerify={async (code) => {
                const res = await store.verifyPhone(phone.e164, code);
                afterSignIn(res.needsRole, res.user.role);
              }}
              onResend={async () => {
                const res = await store.startPhone(phone.e164);
                setSent({ to: res.phone, resendIn: res.resendIn });
                return res.resendIn ?? 45;
              }}
            />
          </AuthStep>
        )}

        {step === 'email' && mode === 'signin' && (
          <AuthStep key="email-signin" back={back}>
            {backButton('choose', 'Other ways')}
            <h1 className="mb-4 font-display text-2xl font-extrabold text-brand-900">Sign in with email</h1>
            <form ref={formRef} onSubmit={signInWithPassword} noValidate>
              <Label htmlFor="li-email">Email</Label>
              <Input id="li-email" type="email" autoComplete="email" autoFocus value={creds.email}
                onChange={(e) => setCreds({ ...creds, email: e.target.value })} placeholder="you@example.com" />
              <FieldError>{errors.email}</FieldError>
              <div className="mt-3">
                <Label htmlFor="li-password">Password</Label>
                <Input id="li-password" type="password" autoComplete="current-password" value={creds.password}
                  onChange={(e) => setCreds({ ...creds, password: e.target.value })} placeholder="••••••••" />
                <FieldError>{errors.password}</FieldError>
              </div>
              <Button type="submit" size="lg" className="mt-5 min-h-14 w-full" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in →'}
              </Button>
            </form>
            <button
              type="button"
              onClick={() => { setReset((r) => ({ ...r, email: creds.email })); go('forgot'); }}
              className="mt-3 min-h-11 w-full font-body font-extrabold text-brand-600 hover:text-brand-800"
            >
              Forgot password?
            </button>
          </AuthStep>
        )}

        {step === 'email' && mode === 'signup' && (
          <AuthStep key="email-signup" back={back}>
            {backButton('choose', 'Other ways')}
            <h1 className="mb-4 font-display text-2xl font-extrabold text-brand-900">Create your account</h1>
            <EmailSignupForm onPending={(p) => { setEmailPending(p); go('email-code'); }} />
          </AuthStep>
        )}

        {step === 'email-code' && emailPending && (
          <AuthStep key="email-code" back={back}>
            <CodeStep
              channel="email"
              destination={emailPending.maskedEmail}
              resendIn={emailPending.resendIn}
              backLabel={mode === 'signin' ? 'Back to sign in' : 'Use a different email'}
              onBack={() => go('email', true)}
              onVerify={async (code) => {
                const res = await store.verifyEmail(emailPending.email, code);
                afterSignIn(res.needsRole, res.user.role);
              }}
              onResend={async () => (await store.resendEmail(emailPending.email)).resendIn}
            />
          </AuthStep>
        )}

        {step === 'forgot' && (
          <AuthStep key="forgot" back={back}>
            {backButton('email', 'Back to sign in')}
            <h1 className="font-display text-2xl font-extrabold text-brand-900">Reset your password</h1>
            <p className="mb-4 mt-1 font-body font-bold text-brand-500">Enter your email and we&apos;ll send you a code.</p>
            <form ref={formRef} onSubmit={sendReset} noValidate>
              <Label htmlFor="fp-email">Email</Label>
              <Input id="fp-email" type="email" autoComplete="email" autoFocus value={reset.email}
                onChange={(e) => setReset({ ...reset, email: e.target.value })} placeholder="you@example.com" />
              <FieldError>{errors.email}</FieldError>
              <Button type="submit" size="lg" className="mt-5 min-h-14 w-full" disabled={busy}>
                {busy ? 'Sending…' : 'Send reset code →'}
              </Button>
            </form>
          </AuthStep>
        )}

        {step === 'reset' && (
          <AuthStep key="reset" back={back}>
            {backButton('forgot', 'Use a different email')}
            <h1 className="font-display text-2xl font-extrabold text-brand-900">Choose a new password</h1>
            <p className="mb-5 mt-1 font-body font-bold text-brand-500">
              If an account uses <span className="break-words text-brand-800">{reset.masked}</span>, we emailed it a 6-digit code.
            </p>
            <form ref={formRef} onSubmit={doReset} noValidate>
              <Label>Code</Label>
              <OtpInput value={reset.code} onChange={(v) => { setReset({ ...reset, code: v }); setErrors({}); }} invalid={Boolean(errors.code)} />
              <FieldError>{errors.code}</FieldError>
              <div className="mt-4">
                <Label htmlFor="rs-password">New password</Label>
                <Input id="rs-password" type="password" autoComplete="new-password" value={reset.password}
                  onChange={(e) => setReset({ ...reset, password: e.target.value })} placeholder="At least 8 characters" />
                <FieldError>{errors.password}</FieldError>
              </div>
              <Button type="submit" size="lg" className="mt-5 min-h-14 w-full" disabled={busy}>
                {busy ? 'Saving…' : 'Save and sign in →'}
              </Button>
            </form>
          </AuthStep>
        )}

        {step === 'role' && (
          <AuthStep key="role" back={back}>
            <RolePicker
              onDone={goHome}
              onNeedsVerification={(r) => { setVerifyRole(r); go('verify'); }}
              initialRole={params.get('role')}
            />
          </AuthStep>
        )}

        {step === 'verify' && (
          <AuthStep key="verify" back={back}>
            <OrgVerifyForm
              role={verifyRole}
              onBack={() => go('role', true)}
              onSubmitted={(res) => {
                // An organisation code is approved on the spot.
                if (res.roleGranted) goHome(res.request.requestedRole as Role);
                else go('pending');
              }}
            />
          </AuthStep>
        )}

        {step === 'pending' && (
          <AuthStep key="pending" back={back}>
            <PendingApproval />
          </AuthStep>
        )}
      </AnimatePresence>

      <SuccessAnimation show={success} />
    </AuthShell>
  );
}
