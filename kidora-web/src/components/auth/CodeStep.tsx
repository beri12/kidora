'use client';

import { useEffect, useRef, useState } from 'react';
import { MailCheck } from 'lucide-react';
import { OtpInput } from './OtpInput';
import { BackLink, PrimaryButton } from './kidora/ui';
import { apiErrorMessage } from '@/lib/api-error';

interface Props {
  /** Masked email address, as the API returned it. */
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
 * "Check your inbox" — the 6-digit code emailed at sign-up (or to an
 * unverified account signing in). The code is never shown here: it only
 * exists in the person's inbox, which is the whole point of asking for it.
 */
export function CodeStep({ destination, resendIn: initialResend, onVerify, onResend, onBack, backLabel }: Props) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [resendIn, setResendIn] = useState(initialResend);
  const [notice, setNotice] = useState('');
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
    } catch (e) {
      setError(apiErrorMessage(e, 'That code is not right.'));
      setCode('');
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
      setNotice('New code sent. Check your inbox.');
    } catch (e) {
      setError(apiErrorMessage(e, "We couldn't resend the code."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <BackLink onClick={onBack}>{backLabel}</BackLink>
      <div data-anim="row" className="mt-3 grid h-14 w-14 place-items-center rounded-2xl bg-iris-100 text-iris-700" aria-hidden>
        <MailCheck className="h-7 w-7" />
      </div>
      <h1 data-anim="row" className="mt-4 font-display text-3xl font-extrabold text-ink">Check your inbox</h1>
      <p data-anim="row" className="mt-1 font-body font-semibold text-slate-600">
        We sent a 6-digit code to <span className="break-words font-extrabold text-ink">{destination}</span>
      </p>

      <div data-anim="row" className="mt-7">
        <OtpInput value={code} onChange={(v) => { setCode(v); setError(''); }} onComplete={submit} disabled={busy} invalid={invalid} autoFocus />
      </div>

      {error && <p role="alert" className="mt-3 text-center font-body text-sm font-bold text-coral-600">{error}</p>}
      {notice && !error && <p role="status" className="mt-3 text-center font-body text-sm font-bold text-grass-700">{notice}</p>}

      <PrimaryButton className="mt-6" disabled={code.length < 6} busy={busy} onClick={() => submit(code)}>
        {busy ? 'Checking…' : 'Verify & continue'}
      </PrimaryButton>

      <p className="mt-5 text-center font-body text-sm font-bold text-slate-600">
        {resendIn > 0 ? (
          <>Didn&apos;t get it? Resend in <span className="tabular-nums text-ink">{resendIn}s</span></>
        ) : (
          <button type="button" onClick={resend} disabled={busy} className="font-extrabold text-iris-700 underline">Resend code</button>
        )}
      </p>
      <p className="mt-2 text-center font-body text-xs font-semibold text-slate-400">Can&apos;t find it? Check your spam or promotions folder.</p>
    </div>
  );
}
