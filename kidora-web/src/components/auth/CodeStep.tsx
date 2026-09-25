'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { OtpInput } from './OtpInput';
import { Button } from '@/components/ui/button';
import { apiErrorMessage } from '@/lib/api-error';

interface Props {
  /** How the code travelled — changes the copy and turns on SMS autofill. */
  channel: 'sms' | 'email';
  /** Masked phone number or email address, as the API returned it. */
  destination: string;
  /** Seconds before "Resend" works, from the send response. */
  resendIn: number;
  /** Checks the code. Throw to show the error and clear the boxes. */
  onVerify: (code: string) => Promise<void>;
  /** Sends a new code; resolves with the next cooldown. */
  onResend: () => Promise<number>;
  onBack: () => void;
  backLabel: string;
}

/**
 * "Enter your code", for a code sent by SMS or by email.
 *
 * The code is never shown here — it only exists on the person's phone or in
 * their inbox, which is the whole point of asking for it.
 */
export function CodeStep({ channel, destination, resendIn: initialResend, onVerify, onResend, onBack, backLabel }: Props) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [resendIn, setResendIn] = useState(initialResend);
  const [notice, setNotice] = useState('');

  const [verified, setVerified] = useState(false);
  const verifying = useRef(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function submit(value: string) {
    if (verifying.current || value.length < 6) return;
    verifying.current = true;
    setBusy(true);
    setError('');
    try {
      await onVerify(value);
      setVerified(true);
    } catch (e) {
      setError(apiErrorMessage(e, 'That code is not right.'));
      setCode('');
      // OtpInput shakes itself while `invalid` is set.
      setInvalid(true);
      setTimeout(() => setInvalid(false), 600);
    } finally {
      verifying.current = false;
      setBusy(false);
    }
  }

  async function resend() {
    if (busy || resendIn > 0) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      setResendIn(await onResend());
      setCode('');
      setNotice(channel === 'sms' ? 'New code sent. Check your messages.' : 'New code sent. Check your inbox.');
    } catch (e) {
      setError(apiErrorMessage(e, "We couldn't resend the code."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 font-body font-extrabold text-brand-500 transition hover:-translate-x-0.5 hover:text-brand-700"
      >
        ← {backLabel}
      </button>

      {/* Flies in, and spins once when the code is accepted. */}
      <motion.div
        aria-hidden
        initial={{ y: -20, scale: 0.5, rotate: -20, opacity: 0 }}
        animate={verified ? { scale: 1.15, rotate: 360, opacity: 1, y: 0 } : { y: 0, scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15, duration: 0.45 }}
        className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-3xl shadow-btn"
      >
        {verified ? '✅' : channel === 'sms' ? '📱' : '✉️'}
      </motion.div>

      <h1 data-stagger className="font-display text-3xl font-extrabold text-brand-900">
        {channel === 'sms' ? 'Enter your code' : 'Check your inbox'}
      </h1>
      <p data-stagger className="mt-1 font-body font-bold text-brand-500">
        We sent a 6-digit code {channel === 'sms' ? 'by text message' : 'by email'} to{' '}
        <span className="break-words text-brand-800">{destination}</span>
      </p>

      <div data-stagger className="mt-7">
        <OtpInput
          value={code}
          onChange={(v) => { setCode(v); setError(''); }}
          onComplete={submit}
          disabled={busy}
          invalid={invalid}
          webOtp={channel === 'sms'}
          autoFocus
        />
      </div>

      {error && <p role="alert" className="mt-3 animate-slide-down text-center font-body-x text-[13px] text-coral-600">{error}</p>}
      {notice && !error && <p className="mt-3 animate-slide-down text-center font-body-x text-[13px] text-grass-700">{notice}</p>}

      <div data-stagger>
        <Button size="lg" className="mt-5 w-full" disabled={code.length < 6 || busy} onClick={() => submit(code)}>
          {busy ? 'Checking…' : 'Verify & continue →'}
        </Button>
      </div>

      <p data-stagger className="mt-5 text-center font-body font-bold text-brand-500">
        {resendIn > 0 ? (
          <>Didn&apos;t get it? Resend in <span className="tabular-nums text-brand-800">{resendIn}s</span></>
        ) : (
          <button type="button" onClick={resend} disabled={busy} className="text-brand-800 underline">
            Resend code
          </button>
        )}
      </p>
      {channel === 'email' && (
        <p className="mt-2 text-center font-body-x text-[12px] text-brand-400">Can&apos;t find it? Check your spam or promotions folder.</p>
      )}
    </div>
  );
}
