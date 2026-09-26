'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Loader2, School, Search, X } from 'lucide-react';
import { api } from '@/lib/axios';
import { cn } from '@/lib/utils';

export interface SchoolHit { id: string; name: string; country: string | null; address: string | null }

/**
 * "Search your school": a combobox over GET /schools/search. Choosing a
 * school here is only a request to join it — membership comes from the
 * school's code or its leader's approval, never from picking a name.
 */
export function SchoolSearch({ value, onChange, label = 'School (optional)' }: { value: SchoolHit | null; onChange: (s: SchoolHit | null) => void; label?: string }) {
  const id = useId();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SchoolHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits([]); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(() => {
      api.get<SchoolHit[]>('/schools/search', { params: { q: term } })
        .then(({ data }) => { setHits(data); setActive(-1); })
        .catch(() => setHits([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pick = (s: SchoolHit) => { onChange(s); setQ(''); setOpen(false); };

  if (value) {
    return (
      <div>
        <p className="mb-1.5 font-body text-sm font-extrabold text-ink">{label}</p>
        <div className="flex min-h-12 items-center gap-3 rounded-xl border border-iris-300 bg-iris-50 px-3.5">
          <School className="h-[18px] w-[18px] text-iris-600" aria-hidden />
          <span className="flex-1 font-body text-[15px] font-bold text-ink">
            {value.name}
            {value.country && <span className="font-semibold text-slate-500"> · {value.country}</span>}
          </span>
          <button type="button" onClick={() => onChange(null)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-white" aria-label="Remove school">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const showList = open && q.trim().length >= 2;
  return (
    <div ref={box} className="relative">
      <label htmlFor={id} className="mb-1.5 block font-body text-sm font-extrabold text-ink">{label}</label>
      <div className="flex min-h-12 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 focus-within:border-iris-500 focus-within:ring-4 focus-within:ring-iris-100">
        <Search className="h-[18px] w-[18px] shrink-0 text-slate-400" aria-hidden />
        <input
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === 'Enter' && active >= 0 && hits[active]) { e.preventDefault(); pick(hits[active]); }
            else if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Search your school"
          autoComplete="off"
          maxLength={80}
          className="h-12 w-full bg-transparent font-body text-[15px] font-semibold text-ink outline-none placeholder:text-slate-400"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden />}
      </div>
      {showList && (
        <ul id={`${id}-list`} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {hits.map((s, i) => (
            <li
              key={s.id}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
              onMouseEnter={() => setActive(i)}
              className={cn('cursor-pointer px-3.5 py-2.5 font-body text-sm', i === active ? 'bg-iris-50' : '')}
            >
              <span className="font-extrabold text-ink">{s.name}</span>
              {(s.address || s.country) && <span className="block text-xs font-semibold text-slate-500">{[s.address, s.country].filter(Boolean).join(', ')}</span>}
            </li>
          ))}
          {!loading && hits.length === 0 && (
            <li className="px-3.5 py-3 font-body text-sm font-semibold text-slate-500">No school found. You can skip this and add it later.</li>
          )}
        </ul>
      )}
    </div>
  );
}
