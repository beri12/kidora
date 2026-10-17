'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
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

/**
 * The country's flag as an image (public/flags, from country-flag-icons, MIT).
 * Not an emoji: Windows has no flag emojis and shows two letters instead.
 */
function Flag({ code, className }: { code: string; className?: string }) {
  return (
    // Tiny local SVGs; next/image would add nothing here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/flags/${code.toLowerCase()}.svg`}
      alt=""
      width={24}
      height={16}
      loading="lazy"
      className={cn('h-4 w-6 shrink-0 rounded-[3px] object-cover shadow-[0_0_0_1px_rgba(15,23,42,0.08)]', className)}
    />
  );
}

type Country = { code: CountryCode; name: string; dial: string };

/** Every country libphonenumber knows (245), named in English, sorted A–Z. */
function countryList(): Country[] {
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
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block font-body text-sm font-extrabold text-ink">{label}</label>
      <div
        className={cn(
          'flex min-h-12 items-center rounded-xl border bg-white transition-shadow focus-within:border-iris-500 focus-within:ring-4 focus-within:ring-iris-100',
          error ? 'border-coral-500' : 'border-slate-200',
        )}
      >
        <CountryPicker
          countries={countries}
          value={country}
          onPick={(cc) => { pick(cc); inputRef.current?.focus(); }}
        />
        <input
          ref={inputRef}
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

/**
 * The country button (flag + dial code) and its searchable list: every
 * country with its flag, name and code. Search by name ("ken"), ISO code
 * ("KE") or dial code ("254", "+44"). Arrow keys, Enter and Escape work.
 */
function CountryPicker({ countries, value, onPick }: { countries: Country[]; value: CountryCode; onPick: (cc: CountryCode) => void }) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const current = countries.find((c) => c.code === value);

  const q = query.trim().toLowerCase().replace(/^\+/, '');
  const shown = useMemo(() => {
    if (!q) return countries;
    const digits = /^\d+$/.test(q);
    return countries.filter((c) =>
      digits ? c.dial.startsWith(q) : c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q,
    );
  }, [countries, q]);

  // Open on the selected country; close on a click outside.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(Math.max(0, countries.findIndex((c) => c.code === value)));
    const close = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open, countries, value]);

  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const choose = (c: Country) => { setOpen(false); onPick(c.code); };

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, shown.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[active]) choose(shown[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
  }

  return (
    <div ref={rootRef} className="static">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Country: ${current?.name ?? value} (+${current?.dial ?? ''}). Change`}
        className="flex h-12 shrink-0 items-center gap-1.5 rounded-l-xl border-r border-slate-200 pl-3 pr-2 hover:bg-slate-50 focus:outline-none focus-visible:bg-iris-50"
      >
        <Flag code={value} />
        <span className="font-body text-[15px] font-bold tabular-nums text-ink">+{current?.dial}</span>
        <ChevronDown aria-hidden className={cn('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:right-auto sm:w-[340px]">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3">
            <Search aria-hidden className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
              placeholder="Search country or code"
              aria-label="Search country or code"
              aria-controls={listId}
              aria-activedescendant={shown[active] ? `${listId}-${shown[active].code}` : undefined}
              className="h-11 w-full bg-transparent font-body text-sm font-semibold text-ink outline-none placeholder:text-slate-400"
            />
          </div>
          <ul ref={listRef} id={listId} role="listbox" aria-label="Countries" className="max-h-64 overflow-y-auto overscroll-contain py-1">
            {shown.length === 0 && <li className="px-4 py-3 font-body text-sm font-semibold text-slate-500">No country matches “{query}”.</li>}
            {shown.map((c, i) => (
              <li
                key={c.code}
                id={`${listId}-${c.code}`}
                data-index={i}
                role="option"
                aria-selected={c.code === value}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(c)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 px-3 py-2 font-body text-sm',
                  i === active ? 'bg-iris-50' : 'bg-white',
                )}
              >
                <Flag code={c.code} />
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{c.name}</span>
                <span className="font-bold tabular-nums text-slate-500">+{c.dial}</span>
                {c.code === value && <Check aria-hidden className="h-4 w-4 text-iris-600" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function remember(cc: string) {
  try { localStorage.setItem(COUNTRY_KEY, cc); } catch { /* storage off */ }
}
