'use client';

import { Suspense, useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { PhoneField, usePhoneNumber } from '@/components/auth/PhoneField';
import { AuthShell, AuthStep } from '@/components/auth/AuthShell';
import { CodeStep } from '@/components/auth/CodeStep';
import { EmailSignupForm } from '@/components/auth/EmailSignupForm';
import { MethodTabs, type AuthMethod } from '@/components/auth/MethodTabs';
import { SocialButtons } from '@/components/auth/SocialButtons';
import { RolePicker } from '@/components/auth/RolePicker';
import { OrgVerifyForm } from '@/components/auth/OrgVerifyForm';
import { PendingApproval } from '@/components/auth/PendingApproval';
import { Button } from '@/components/ui/button';
import { isValidE164 } from '@/constants/countries';
import { ROLE_HOME } from '@/constants';
import { useAuthStore } from '@/stores/auth.store';
import { apiErrorMessage } from '@/lib/api-error';
import { celebrate } from '@/lib/motion';
import type { EmailPending, Role } from '@/types';

type Step = 'start' | 'phone-code' | 'email-code' | 'role' | 'verify' | 'pending';

/**
 * Create a Kidora account: phone number + texted code, email + emailed code,
 * or Google / Facebook / TikTok.
 *
 * Nobody picks "PARENT / TEACHER / STUDENT" before they have an account — the
 * role question comes after the code is confirmed, and only for accounts that
 * have not answered it yet (`needsRole`).
 */
function JoinInner() {
  const router = useRouter();
  const params = useSearchParams();

  const { startPhone, verifyPhone, verifyEmail, resendEmail } = useAuthStore();
  const phone = usePhoneNumber();

  const [step, setStep] = useState<Step>('start');
  const [method, setMethod] = useState<AuthMethod>(params.get('method') === 'email' ? 'email' : 'phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [invalid, setInvalid] = useState(false);
  // Which administrative role the verification form is collecting for.
  const [verifyRole, setVerifyRole] = useState<'SCHOOL_ADMIN' | 'SCHOOL_LEADER' | 'DISTRICT_ADMIN'>('SCHOOL_LEADER');

  const [sent, setSent] = useState<{ to: string; resendIn: number }>({ to: '', resendIn: 45 });
  const [emailPending, setEmailPending] = useState<EmailPending | null>(null);

  // Where to land once the account is ready. `?next=` survives the whole flow
  // so a deep link that bounced to /join returns the visitor to it.
  const next = params.get('next');

  const goHome = useCallback(
    async (role: Role) => {
      await celebrate();
      router.replace(next || ROLE_HOME[role] || '/');
    },
    [next, router],
  );

  const valid = isValidE164(phone.e164);

  async function sendCode() {
    if (!valid || busy) return;
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

  const afterSignIn = (needsRole: boolean, role: Role) => (needsRole ? setStep('role') : goHome(role));

  return (
    <AuthShell
      title={step === 'start' || step.endsWith('code') ? 'Welcome to Kidora 🌍' : 'Almost there!'}
      subtitle={
        step === 'pending'
          ? "We're verifying your organisation."
          : step === 'verify'
            ? 'One check and your dashboard is ready.'
            : step === 'role'
              ? 'One question and you are in.'
              : 'Learn. Play. Grow.'
      }
    >
      {step === 'start' && (
        <AuthStep key="start">
          <h1 data-stagger className="font-display text-3xl font-extrabold text-brand-900">Join Kidora</h1>
          <p data-stagger className="mb-5 mt-1 font-body font-bold text-brand-500">
            For students, parents, teachers and schools. Free to start.
          </p>

          <div data-stagger>
            <MethodTabs value={method} onChange={(m) => { setMethod(m); setError(''); }} />
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
              <p className="mt-2 font-body-x text-[12px] text-brand-400">We&apos;ll text a 6-digit code to this number. Standard SMS rates may apply.</p>

              <Button size="lg" className="mt-4 w-full" disabled={!valid || busy} onClick={sendCode}>
                {busy ? 'Sending code…' : 'Continue →'}
              </Button>
            </div>
          ) : (
            <div key="email" className="animate-fade-in">
              <EmailSignupForm
                onPending={(p) => { setEmailPending(p); setStep('email-code'); }}
              />
            </div>
          )}

          <SocialButtons disabled={busy} next={next} />

          <p className="mt-6 text-center font-body font-bold text-brand-500">
            Already have an account?{' '}
            <Link href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} className="text-brand-800 underline">
              Sign in
            </Link>
          </p>
          <p className="mt-3 text-center font-body-x text-[11px] leading-relaxed text-brand-400">
            By continuing you agree to Kidora&apos;s Terms and Privacy Policy.
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
          <CodeStep
            channel="email"
            destination={emailPending.maskedEmail}
            resendIn={emailPending.resendIn}
            backLabel="Use a different email"
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

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinInner />
    </Suspense>
  );
}
