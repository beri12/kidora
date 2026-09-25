'use client';

import { useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Fired as soon as the last digit lands, so nobody hunts for a button. */
  onComplete?: (v: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  /**
   * Listen for the code arriving by SMS (WebOTP). Supported browsers — Chrome
   * on Android — offer to fill it in with one tap. Needs the SMS to end with
   * "@<this site's domain> #<code>", which the API adds on an https deploy.
   */
  webOtp?: boolean;
}

/**
 * The 6-digit code, one box per digit.
 *
 * Handles the things people actually do with an OTP: typing, pasting the
 * whole code into any box, backspacing across boxes, arrowing back to fix a
 * digit, and the browser auto-filling the code straight from the SMS
 * (autoComplete="one-time-code" on the first box).
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled,
  invalid,
  autoFocus,
  webOtp,
}: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.split('');

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  // Latest callbacks, so the WebOTP listener below is set up once per mount.
  const latest = useRef({ onChange, onComplete });
  latest.current = { onChange, onComplete };

  useEffect(() => {
    if (!webOtp || typeof window === 'undefined' || !('OTPCredential' in window)) return;
    const abort = new AbortController();
    navigator.credentials
      .get({ otp: { transport: ['sms'] }, signal: abort.signal } as CredentialRequestOptions)
      .then((cred) => {
        const code = (cred as unknown as { code?: string } | null)?.code?.replace(/\D/g, '').slice(0, length);
        if (!code) return;
        latest.current.onChange(code);
        if (code.length === length) latest.current.onComplete?.(code);
      })
      .catch(() => { /* dismissed, aborted or unsupported — typing still works */ });
    return () => abort.abort();
  }, [webOtp, length]);

  // Focus the first empty box whenever the code is cleared (wrong code, resend).
  useEffect(() => {
    if (value === '') refs.current[0]?.focus();
  }, [value]);

  function commit(next: string) {
    // A trailing gap (box 3 cleared while 4 is filled) collapses on the way
    // out, so `value` is always a prefix of the code with no holes in it.
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
    return clean;
  }

  function handleChange(i: number, raw: string) {
    const typed = raw.replace(/\D/g, '');
    if (!typed) return;

    // More than one digit in a single event means a paste or an SMS autofill,
    // never typing. Those always carry the code from its first digit, so they
    // fill from box one — dropping them at the caret would scatter the code
    // when someone pastes into the middle of an empty row.
    const start = typed.length > 1 ? 0 : i;

    // Rebuilt rather than `value.split('')` so writing past the end can't
    // leave holes in the array (a hole would silently shift every later digit).
    const chars = Array.from({ length }, (_, k) => value[k] ?? '');
    for (let k = 0; k < typed.length && start + k < length; k++) chars[start + k] = typed[k];

    const next = commit(chars.join(''));

    const focusAt = Math.min(start + typed.length, length - 1);
    refs.current[focusAt]?.focus();
    if (next.length === length) refs.current[length - 1]?.blur();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const chars = value.split('');
      if (chars[i]) {
        chars[i] = '';
        commit(chars.join(''));
      } else if (i > 0) {
        chars[i - 1] = '';
        commit(chars.join(''));
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault();
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      e.preventDefault();
      refs.current[i + 1]?.focus();
    }
  }

  return (
    <div
      className={'flex w-full justify-center gap-2 sm:gap-2.5 ' + (invalid ? 'animate-shake' : '')}
      onPaste={(e) => {
        const text = e.clipboardData.getData('text');
        if (/\d/.test(text)) {
          e.preventDefault();
          const next = commit(text);
          refs.current[Math.min(next.length, length - 1)]?.focus();
        }
      }}
    >
      {Array.from({ length }).map((_, i) => {
        const filled = Boolean(digits[i]);
        return (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={length}
            disabled={disabled}
            aria-label={`Digit ${i + 1}`}
            value={digits[i] ?? ''}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.currentTarget.select()}
            className={
              // Flexible width with a cap: six boxes always fit the card, on a
              // small phone and on a desktop, without overflowing it.
              'h-14 min-w-0 flex-1 rounded-2xl border-2 text-center font-display text-2xl font-extrabold outline-none transition-all duration-200 max-w-[3rem] sm:h-16 sm:max-w-[3.25rem] ' +
              (invalid
                ? 'border-coral-500 bg-coral-400/10 text-coral-600'
                : filled
                  ? 'animate-pop border-brand-600 bg-white text-brand-900 shadow-[0_6px_16px_-8px_rgba(109,40,217,.7)]'
                  : 'border-brand-200 bg-brand-50 text-brand-900 focus:border-brand-600 focus:bg-white focus:shadow-[0_0_0_4px_rgba(139,92,246,.18)]')
            }
          />
        );
      })}
    </div>
  );
}
