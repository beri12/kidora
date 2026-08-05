'use client';
import { useState } from 'react';
import { LANGUAGES, useI18n } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <div className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-body-x text-sm text-brand-700 hover:bg-brand-100"
        aria-label="Change language"
      >
        <span className="text-base">{current.flag}</span>
        <span className="uppercase font-display font-extrabold">{current.code}</span>
        <span className="text-[10px]">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full pt-2 w-44 animate-fade-in z-50">
          <div className="bg-white rounded-2xl border-2 border-brand-100 shadow-2xl p-1.5">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setOpen(false); }}
                className={'w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left font-display font-extrabold text-sm ' +
                  (l.code === lang ? 'bg-brand-100 text-brand-800' : 'text-brand-700 hover:bg-brand-50')}
              >
                <span className="text-base">{l.flag}</span>{l.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
