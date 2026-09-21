'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  COUNTRIES,
  POPULAR_ISO2,
  type Country,
  flagEmoji,
  searchCountries,
} from '@/constants/countries';

interface Props {
  value: Country;
  onChange: (c: Country) => void;
  /** Rendered inside a phone field, so the trigger has no border of its own. */
  disabled?: boolean;
}

/**
 * Country dial-code picker: flag, name and +code for all 238 countries, with
 * type-ahead over name / ISO code / dial code and full keyboard control
 * (↑ ↓ Home End Enter Esc). The list is virtualised only by `max-height` —
 * 238 rows is small enough that windowing would cost more than it saves.
 */
export function CountryPicker({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Popular countries first while the list is unfiltered; once the visitor
  // types, plain relevance order is less surprising than a pinned block.
  const results = useMemo(() => {
    if (query.trim()) return searchCountries(query);
    const popular = POPULAR_ISO2.map((iso) => COUNTRIES.find((c) => c.iso2 === iso)).filter(Boolean) as Country[];
    const rest = COUNTRIES.filter((c) => !POPULAR_ISO2.includes(c.iso2));
    return [...popular, ...rest];
  }, [query]);

  const pinnedCount = query.trim() ? 0 : POPULAR_ISO2.length;

  // Reopening always starts on the currently selected country.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(Math.max(results.findIndex((c) => c.iso2 === value.iso2), 0));
    const t = setTimeout(() => searchRef.current?.focus(), 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on an outside click or on Escape anywhere.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Keep the highlighted row in view while arrowing through the list.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function choose(c: Country) {
    onChange(c);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(results.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[active]) choose(results[active]); }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Country code: ${value.name} +${value.dial}`}
        className="group flex h-full items-center gap-1.5 rounded-l-2xl px-3 py-3 transition-colors hover:bg-brand-100/70 disabled:opacity-60"
      >
        <span key={value.iso2} className="animate-pop text-2xl leading-none">{flagEmoji(value.iso2)}</span>
        <span className="font-body font-extrabold text-brand-800">+{value.dial}</span>
        <svg
          viewBox="0 0 20 20"
          className={'h-4 w-4 text-brand-500 transition-transform duration-300 ' + (open ? 'rotate-180' : 'group-hover:translate-y-0.5')}
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M5 7.5 10 12.5 15 7.5" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+10px)] z-50 w-[min(22rem,calc(100vw-5rem))] origin-top-left animate-slide-down overflow-hidden rounded-2xl border-2 border-brand-100 bg-white shadow-card"
          onKeyDown={onKeyDown}
        >
          <div className="border-b-2 border-brand-50 p-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-400">🔍</span>
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                placeholder="Search country or code"
                className="w-full rounded-xl bg-brand-50 py-2.5 pl-9 pr-3 font-body font-bold text-brand-900 outline-none ring-brand-300 transition placeholder:font-bold placeholder:text-brand-400 focus:ring-2"
              />
            </div>
          </div>

          <ul ref={listRef} role="listbox" className="max-h-72 overflow-y-auto overscroll-contain py-1">
            {results.length === 0 && (
              <li className="px-4 py-6 text-center font-body font-bold text-brand-400">No country matches that</li>
            )}

            {results.map((c, i) => (
              <li key={c.iso2 + i}>
                {pinnedCount > 0 && i === 0 && (
                  <p className="px-4 pb-1 pt-2 font-body-x text-[11px] uppercase tracking-wide text-brand-400">Popular</p>
                )}
                {pinnedCount > 0 && i === pinnedCount && (
                  <p className="px-4 pb-1 pt-3 font-body-x text-[11px] uppercase tracking-wide text-brand-400">All countries</p>
                )}
                <button
                  type="button"
                  data-index={i}
                  role="option"
                  aria-selected={c.iso2 === value.iso2}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(c)}
                  className={
                    'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ' +
                    (i === active ? 'bg-brand-100' : 'hover:bg-brand-50')
                  }
                >
                  <span className="text-xl leading-none">{flagEmoji(c.iso2)}</span>
                  <span className="flex-1 truncate font-body font-bold text-brand-900">{c.name}</span>
                  <span className="font-body font-extrabold text-brand-500">+{c.dial}</span>
                  {c.iso2 === value.iso2 && <span className="text-grass-600">✓</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
