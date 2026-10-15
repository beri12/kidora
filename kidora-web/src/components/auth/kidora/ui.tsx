'use client';

import { forwardRef, useEffect, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { api, API_URL } from '@/lib/axios';
import { cn } from '@/lib/utils';
import { FacebookIcon, GoogleIcon, TiktokIcon } from '../scene/icons';

/* ------------------------------------------------------------------ logo */

/** The Kidora wordmark: a star over the "i", "Learn • Play • Grow" beneath. */
export function KidoraLogo({ size = 'md', tagline = true, className }: { size?: 'sm' | 'md' | 'lg'; tagline?: boolean; className?: string }) {
  const text = size === 'lg' ? 'text-5xl' : size === 'sm' ? 'text-2xl' : 'text-4xl';
  return (
    <Link href="/" className={cn('inline-flex flex-col items-center leading-none', className)} aria-label="Kidora home">
      <span className={cn('relative font-display font-extrabold tracking-tight text-iris-700', text)}>
        K<span className="relative inline-block">
          i
          <svg viewBox="0 0 24 24" className="absolute left-1/2 top-[0.02em] h-[0.4em] w-[0.4em] -translate-x-1/2" aria-hidden>
            <path d="M12 1.5l2.9 6.5 7.1.7-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 8.7l7.1-.7z" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1" />
          </svg>
        </span>dora
      </span>
      {tagline && (
        <span className={cn('mt-1 font-body font-extrabold text-iris-700', size === 'sm' ? 'text-[10px]' : 'text-sm')}>
          Learn <span className="text-sun-500">•</span> Play <span className="text-grass-500">•</span> Grow
        </span>
      )}
    </Link>
  );
}

/* ---------------------------------------------------------------- fields */

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  error?: string;
  trailing?: ReactNode;
  hint?: ReactNode;
}

/** Labelled input with a leading icon, as in the sign-up designs. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, icon, error, trailing, hint, className, id, ...props }, ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={className}>
      <label htmlFor={fid} className="mb-1.5 block font-body text-sm font-extrabold text-ink">{label}</label>
      <div
        className={cn(
          'flex min-h-12 items-center gap-2.5 rounded-xl border bg-white px-3.5 transition-shadow focus-within:border-iris-500 focus-within:ring-4 focus-within:ring-iris-100',
          error ? 'border-coral-500' : 'border-slate-200',
        )}
      >
        {icon && <span className="shrink-0 text-slate-400" aria-hidden>{icon}</span>}
        <input
          ref={ref}
          id={fid}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fid}-err` : undefined}
          className="h-12 w-full min-w-0 bg-transparent font-body text-[15px] font-semibold text-ink outline-none placeholder:font-semibold placeholder:text-slate-400"
          {...props}
        />
        {trailing}
      </div>
      {hint && !error && <p className="mt-1 font-body text-xs font-semibold text-slate-500">{hint}</p>}
      {error && <p id={`${fid}-err`} role="alert" className="mt-1 font-body text-xs font-bold text-coral-600">{error}</p>}
    </div>
  );
});

/** Password input with a show/hide eye. */
export const PasswordField = forwardRef<HTMLInputElement, Omit<FieldProps, 'type' | 'trailing'>>(function PasswordField(props, ref) {
  const [show, setShow] = useState(false);
  return (
    <Field
      ref={ref}
      {...props}
      type={show ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
        >
          {show ? <Eye className="h-[18px] w-[18px]" /> : <EyeOff className="h-[18px] w-[18px]" />}
        </button>
      }
    />
  );
});

export function PrimaryButton({ busy, children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={cn(
        'relative inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-iris-600 px-5 font-body text-base font-extrabold text-white shadow-[0_10px_24px_-10px_rgba(91,60,240,.7)] transition hover:bg-iris-700 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Divider({ children }: { children: ReactNode }) {
  return (
    <div className="my-6 flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-slate-200" />
      <span className="font-body text-sm font-semibold text-slate-500">{children}</span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

export function FormError({ children }: { children?: string }) {
  if (!children) return null;
  return <p role="alert" className="rounded-xl bg-coral-400/10 px-3 py-2 font-body text-sm font-bold text-coral-600">{children}</p>;
}

export function BackLink({ href, onClick, children = 'Back' }: { href?: string; onClick?: () => void; children?: ReactNode }) {
  const cls = 'inline-flex min-h-11 items-center gap-2 font-body text-sm font-extrabold text-iris-700 hover:text-iris-900';
  return href
    ? <Link href={href} className={cls}><ArrowLeft className="h-4 w-4" aria-hidden />{children}</Link>
    : <button type="button" onClick={onClick} className={cls}><ArrowLeft className="h-4 w-4" aria-hidden />{children}</button>;
}

/* ---------------------------------------------------------------- social */

/** Where the visitor wanted to go before the OAuth redirect; read by /auth/callback. */
export const NEXT_KEY = 'kidora.next';

type Provider = 'google' | 'facebook' | 'tiktok';
const PROVIDERS: { key: Provider; label: string; icon: ReactNode }[] = [
  { key: 'google', label: 'Google', icon: <GoogleIcon /> },
  { key: 'facebook', label: 'Facebook', icon: <FacebookIcon /> },
  { key: 'tiktok', label: 'TikTok', icon: <TiktokIcon /> },
];

/**
 * Google · Facebook · TikTok in one row. Each is a plain link to the API's
 * OAuth start route, so the client secret never reaches the browser. The API
 * is asked which providers are configured and only those are offered — a
 * button that could only fail is never shown.
 */
export function SocialRow({ next, compact }: { next?: string | null; compact?: boolean }) {
  const [enabled, setEnabled] = useState<Provider[] | null>(null);
  const [leaving, setLeaving] = useState<Provider | null>(null);

  useEffect(() => {
    let alive = true;
    api.get<{ providers: string[] }>('/auth/providers')
      .then(({ data }) => { if (alive) setEnabled((data.providers ?? []) as Provider[]); })
      .catch(() => { if (alive) setEnabled([]); });
    return () => { alive = false; };
  }, []);

  const list = PROVIDERS.filter((p) => enabled?.includes(p.key));
  if (enabled !== null && list.length === 0) return null;

  const go = (p: Provider) => {
    try {
      if (next) sessionStorage.setItem(NEXT_KEY, next); else sessionStorage.removeItem(NEXT_KEY);
    } catch { /* storage disabled: the callback uses the default */ }
    setLeaving(p);
  };

  return (
    <div>
      <Divider>or continue with</Divider>
      <div className={cn('grid gap-3', list.length === 1 ? 'grid-cols-1' : list.length === 2 ? 'grid-cols-2' : 'grid-cols-3')} aria-busy={enabled === null}>
        {(enabled === null ? PROVIDERS : list).map((p) => (
          <a
            key={p.key}
            href={enabled === null ? undefined : `${API_URL}/auth/${p.key}`}
            onClick={() => go(p.key)}
            aria-disabled={enabled === null || (leaving !== null && leaving !== p.key)}
            aria-label={`Continue with ${p.label}`}
            className={cn(
              'flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2 font-body text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:border-iris-300 hover:shadow-md',
              compact && 'flex-col gap-1 py-2 text-xs',
              (enabled === null || (leaving && leaving !== p.key)) && 'pointer-events-none opacity-50',
            )}
          >
            {leaving === p.key ? <Loader2 className="h-5 w-5 animate-spin text-iris-600" aria-hidden /> : p.icon}
            <span>{p.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- stepper */

/** Role → Personal Info → Complete. */
export function Stepper({ current, steps = ['Role', 'Personal Info', 'Complete'] }: { current: number; steps?: string[] }) {
  return (
    <ol className="mx-auto flex max-w-sm items-start justify-between" aria-label="Sign-up progress">
      {steps.map((label, i) => {
        const done = i < current, active = i === current;
        return (
          <li key={label} className="relative flex flex-1 flex-col items-center" aria-current={active ? 'step' : undefined}>
            {i > 0 && <span className={cn('absolute right-1/2 top-3.5 h-0.5 w-full', done || active ? 'bg-iris-300' : 'bg-slate-200')} aria-hidden />}
            <span
              className={cn(
                'relative z-10 grid h-7 w-7 place-items-center rounded-full font-body text-xs font-extrabold',
                done ? 'bg-grass-500 text-white' : active ? 'bg-iris-600 text-white ring-4 ring-iris-100' : 'bg-slate-200 text-slate-500',
              )}
            >
              {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
            </span>
            <span className={cn('mt-1.5 text-center font-body text-xs font-extrabold', done ? 'text-grass-600' : active ? 'text-iris-700' : 'text-slate-400')}>
              {label}
              <span className="sr-only">{done ? ' (done)' : active ? ' (current)' : ''}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
