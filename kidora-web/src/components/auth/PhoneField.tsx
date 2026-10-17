'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';
import examples from 'libphonenumber-js/mobile/examples';
import { cn } from '@/lib/utils';

const COUNTRY_KEY = 'kidora.phone-country';
const FALLBACK: CountryCode = 'ET';

/** 🇪🇹 from "ET": two regional-indicator letters. */
function flag(cc: string) {
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

/** Every country libphonenumber knows (245), named in English, sorted A–Z. */
function countryList() {
  let names: Intl.DisplayNames | null = null;
  try { names = new Intl.DisplayNames(['en'], { type: 'region' }); } catch { /* old browser: show codes */ }
  return getCountries()
    .map((code) => ({ code, name: names?.of(code) ?? code, dial: getCountryCallingCode(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Last country used here, else the browser's region (en-KE → KE), else Ethiopia. */
function initialCountry(): CountryCode {
  const known = new Set<string>(getCountries());
  try {
    const saved = localStorage.getItem(COUNTRY_KEY);
    if (saved && known.has(saved)) return saved as CountryCode;
  } catch { /* storage off */ }
  if (typeof navigator !== 'undefined') {
    for (const lang of navigator.languages ?? [navigator.language]) {
      const region = lang?.split('-')[1]?.toUpperCase();
      if (region && known.has(region)) return region as CountryCode;
    }
  }
  return FALLBACK;
}

/** True when `value` (E.164 from PhoneField) is a real number for its country. */
export function isValidPhone(value: string) {
  return Boolean(value && parsePhoneNumberFromString(value)?.isValid());
}

interface Props {
  label: string;
  /** E.164, e.g. "+251911223344" (or "" when empty). */
  value: string;
  onChange: (e164: string) => void;
  error?: string;
  hint?: string;
  autoFocus?: boolean;
}

/**
 * Phone number with a country picker covering every country (Africa,
 * Europe, the Americas, Asia, Oceania). The person picks a country and types
 * the number the way they know it ("0911 22 33 44" or "911 22 33 44"); the
 * form always receives the full international number, "+251911223344".
 * Pasting a number that starts with + switches the country to match.
 */
export function PhoneField({ label, value, onChange, error, hint, autoFocus }: Props) {
  const id = useId();
  const countries = useMemo(countryList, []);
  const [country, setCountry] = useState<CountryCode>(FALLBACK);
  const [national, setNational] = useState('');

  // After mount: localStorage and navigator only exist in the browser.
  useEffect(() => { setCountry(initialCountry()); }, []);

  // The form cleared the field (e.g. "Edit my details" reset): clear the box.
  useEffect(() => { if (!value) setNational((n) => (/\d/.test(n) ? n : '')); }, [value]);

  function emit(text: string, cc: CountryCode) {
    const digits = text.replace(/[^\d+]/g, '');
    if (!digits.replace('+', '')) { onChange(''); return; }
    const parsed = parsePhoneNumberFromString(text, cc);
    // Not parseable yet (still typing): send what we have, so validation can say so.
    onChange(parsed?.number ?? `+${getCountryCallingCode(cc)}${digits.replace(/^\+/, '').replace(/^0+/, '')}`);
  }

  function type(text: string) {
    // "+44 7911…" pasted in: the number names its own country.
    if (text.trim().startsWith('+')) {
      const p = parsePhoneNumberFromString(text);
      if (p?.country && p.country !== country) { setCountry(p.country); remember(p.country); }
      setNational(text);
      emit(text, p?.country ?? country);
      return;
    }
    // Format as they type for the chosen country, but let deletions through.
    const formatted = text.length < national.length ? text : new AsYouType(country).input(text);
    setNational(formatted);
    emit(formatted, country);
  }

  function pick(cc: CountryCode) {
    setCountry(cc);
    remember(cc);
    const local = national.trim().startsWith('+') ? '' : national;
    setNational(local);
    emit(local, cc);
  }

  const example = getExampleNumber(country, examples)?.formatNational() ?? '';
  const current = countries.find((c) => c.code === country);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-body text-sm font-extrabold text-ink">{label}</label>
      <div
        className={cn(
          'flex min-h-12 items-center rounded-xl border bg-white transition-shadow focus-within:border-iris-500 focus-within:ring-4 focus-within:ring-iris-100',
          error ? 'border-coral-500' : 'border-slate-200',
        )}
      >
        {/* A native select underneath: every phone gets its own searchable
            picker, and keyboards can type a country name to jump to it. */}
        <div className="relative flex h-12 shrink-0 items-center gap-1 border-r border-slate-200 pl-3 pr-2">
          <span aria-hidden className="text-lg leading-none">{flag(country)}</span>
          <span aria-hidden className="font-body text-[15px] font-bold text-ink">+{current?.dial}</span>
          <ChevronDown aria-hidden className="h-4 w-4 text-slate-400" />
          <select
            aria-label="Country"
            value={country}
            onChange={(e) => pick(e.target.value as CountryCode)}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{`${c.name} (+${c.dial})`}</option>
            ))}
          </select>
        </div>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          value={national}
          onChange={(e) => type(e.target.value)}
          placeholder={example}
          maxLength={24}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-err` : undefined}
          className="h-12 w-full min-w-0 bg-transparent px-3 font-body text-[15px] font-semibold text-ink outline-none placeholder:font-semibold placeholder:text-slate-400"
        />
      </div>
      {hint && !error && <p className="mt-1 font-body text-xs font-semibold text-slate-500">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 font-body text-xs font-bold text-coral-600">{error}</p>}
    </div>
  );
}

function remember(cc: string) {
  try { localStorage.setItem(COUNTRY_KEY, cc); } catch { /* storage off */ }
}
