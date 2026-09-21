'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { PhoneField, usePhoneNumber } from '@/components/auth/PhoneField';
import { OtpInput } from '@/components/auth/OtpInput';
import { AuthShell } from '@/components/auth/AuthShell';
import { SocialButtons } from '@/components/auth/SocialButtons';
import { RolePicker } from '@/components/auth/RolePicker';
import { OrgVerifyForm } from '@/components/auth/OrgVerifyForm';
import { PendingApproval } from '@/components/auth/PendingApproval';
import { Button } from '@/components/ui/button';
import { isValidE164 } from '@/constants/countries';
import { ROLE_HOME } from '@/constants';
import { useAuthStore } from '@/stores/auth.store';
import { apiErrorMessage } from '@/lib/api-error';
import type { Role } from '@/types';

type Step = 'phone' | 'code' | 'role' | 'verify' | 'pending';

/**
 * The single entry point for Kidora: one phone number, one code, in or out.
 *
 * Nobody picks "PARENT / TEACHER / SCHOOL" before they have an account any
 * more — the role question comes after sign-in, and only for accounts that
 * have not answered it yet (`needsRole`).
 */
function JoinInner() {
  const router = useRouter();
  const params = useSearchParams();

  const { startPhone, verifyPhone } = useAuthStore();
  const phone = usePhoneNumber();

  const [step, setStep] = useState<Step>('phone');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  // Which administrative role the verification form is collecting for.
  const [verifyRole, setVerifyRole] = useState<'SCHOOL_ADMIN' | 'SCHOOL_LEADER' | 'DISTRICT_ADMIN'>('SCHOOL_LEADER');
  const [error, setError] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [masked, setMasked] = useState('');
  const [devCode, setDevCode] = useState('');
  const [resendIn, setResendIn] = useState(0);

  // Where to land once the account is ready. `?next=` survives the whole flow
  // so a deep link that bounced to /join returns the visitor to it.
  const next = params.get('next');

  const goHome = useCallback(
    (role: Role) => router.replace(next || ROLE_HOME[role] || '/'),
    [next, router],
  );

  // Resend countdown.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const valid = isValidE164(phone.e164);

  async function sendCode(resend = false) {
    if (!valid || busy) return;
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
      setInvalid(true);
      setTimeout(() => setInvalid(false), 500);
    } finally {
      setBusy(false);
    }
  }

  // Guards against the OTP box firing `onComplete` twice (autofill + typing).
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
      setInvalid(true);
      setCode('');
      setTimeout(() => setInvalid(false), 600);
    } finally {
      verifying.current = false;
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={step === 'phone' || step === 'code' ? 'Welcome to Kidora 🌍' : 'Almost there!'}
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
      {step === 'phone' && (
        <div key="phone" className="animate-slide-in-right">
          <h1 className="font-display text-3xl font-extrabold text-brand-900">Join Kidora</h1>
          <p className="mt-1 font-body font-bold text-brand-500">
            Enter your phone number — we&apos;ll text you a code. No password to remember.
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

          <Button
            size="lg"
            className="mt-4 w-full"
            disabled={!valid || busy}
            onClick={() => sendCode()}
          >
            {busy ? 'Sending code…' : 'Continue →'}
          </Button>

          <SocialButtons disabled={busy} next={next} />

          <p className="mt-6 text-center font-body font-bold text-brand-500">
            Already have an account?{' '}
            <Link href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} className="text-brand-800 underline">
              Sign in
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
            We sent a 6-digit code to <span className="text-brand-800">{masked || phone.e164}</span>
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

          {error && (
            <p className="mt-3 animate-slide-down text-center font-body-x text-[13px] text-coral-600">{error}</p>
          )}

          {devCode && (
            <p className="mt-3 rounded-xl bg-sun-300/40 px-3 py-2 text-center font-body-x text-[12px] text-sun-700">
              Twilio is not configured, so here is the code: <b>{devCode}</b>
            </p>
          )}

          <Button
            size="lg"
            className="mt-5 w-full"
            disabled={code.length < 6 || busy}
            onClick={() => submitCode(code)}
          >
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

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinInner />
    </Suspense>
  );
}
