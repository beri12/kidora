'use client';

import { useEffect, useRef, useState } from 'react';
import { CountryPicker } from './CountryPicker';
import { DEFAULT_ISO2, type Country, findCountry, formatNational, guessCountry, toE164 } from '@/constants/countries';

interface Props {
  country: Country;
  onCountryChange: (c: Country) => void;
  /** National digits only — the dial code lives in `country`. */
  value: string;
  onValueChange: (v: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}

/**
 * Phone number field: country picker on the left, national digits on the
 * right, one rounded shell around both. Digits are grouped in threes as the
 * visitor types; the value handed back is always unformatted digits, so
 * `toE164(country.dial, value)` is what goes to the API.
 */
export function PhoneField({
  country,
  onCountryChange,
  value,
  onValueChange,
  onSubmit,
  disabled,
  invalid,
  autoFocus,
}: Props) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <div
      className={
        'flex items-stretch rounded-2xl border-2 bg-brand-50 transition-all duration-300 ' +
        (invalid
          ? 'animate-shake border-coral-500'
          : focused
            ? 'border-brand-600 shadow-[0_0_0_4px_rgba(139,92,246,.18)]'
            : 'border-brand-200 hover:border-brand-300')
      }
    >
      <CountryPicker value={country} onChange={onCountryChange} disabled={disabled} />

      <span className="my-2 w-px shrink-0 bg-brand-200" aria-hidden />

      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        disabled={disabled}
        value={formatNational(value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onValueChange(e.target.value.replace(/\D/g, '').slice(0, 15))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onSubmit) { e.preventDefault(); onSubmit(); }
        }}
        placeholder="912 345 678"
        aria-label="Phone number"
        className="w-full rounded-r-2xl bg-transparent px-3 py-3 font-body text-lg font-extrabold tracking-wide text-brand-900 outline-none placeholder:font-bold placeholder:text-brand-400 disabled:opacity-60"
      />
    </div>
  );
}

/**
 * Keeps the country + national digits together and exposes the E.164 value.
 *
 * The first render always uses the same country on the server and on the
 * client (DEFAULT_ISO2) — guessing from `navigator.language` during render
 * would produce different markup on each side and break hydration. The guess
 * is applied in an effect, right after mount.
 */
export function usePhoneNumber(initial?: Country) {
  const [country, setCountry] = useState<Country>(initial ?? findCountry(DEFAULT_ISO2)!);
  const [national, setNational] = useState('');

  useEffect(() => {
    if (!initial) setCountry(guessCountry());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    country,
    setCountry,
    national,
    setNational,
    e164: toE164(country.dial, national),
  };
}
