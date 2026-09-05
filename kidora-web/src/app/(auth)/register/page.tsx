'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { validateRegister, type roleFieldSchemas } from '@/features/auth/schema';
import { useAuthStore, type RegisterPayload } from '@/stores/auth.store';
import { ROLE_HOME } from '@/constants';
import { SIGNUP_ROLES } from '@/constants/roles';
import { Button } from '@/components/ui/button';
import { Input, Label, FieldError } from '@/components/ui/input';

type RoleKey = keyof typeof roleFieldSchemas;

// The account is created immediately for every role, so the only thing that
// differs afterwards is where the user lands: the roles with an onboarding
// wizard run it first, the rest go straight to their dashboard.
const ONBOARDS = ['CHILD', 'PARENT', 'TEACHER'];

function RegisterInner() {
  const router = useRouter();
  const params = useSearchParams();
  const register = useAuthStore((s) => s.register);

  const initialRole = (params.get('role') || 'PARENT').toUpperCase();
  const validRole = SIGNUP_ROLES.some((r) => r.key === initialRole) ? initialRole : 'PARENT';
  const [roleKey, setRoleKey] = useState<RoleKey>(validRole as RoleKey);
  const role = SIGNUP_ROLES.find((r) => r.key === roleKey) ?? SIGNUP_ROLES[1];

  const [form, setForm] = useState<Record<string, string>>({ name: '', email: '', password: '', confirm: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    // One pass over the shared form and the current role's extra fields, so
    // every message lands on the field that produced it.
    const { ok, errors: found } = validateRegister(form, roleKey);
    if (!ok) { setErrors(found); return; }

    setErrors({}); setBusy(true);
    try {
      // Only the fields this role actually declares are sent, alongside the
      // shared ones; the store strips anything left blank.
      const payload: RegisterPayload = {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        role: roleKey,
        ...Object.fromEntries(role.fields.map((f) => [f.key, form[f.key] ?? ''])),
      };

      const user = await register(payload);

      // The destination is driven by user.role — the value the backend
      // actually saved — not the UI's roleKey, so the redirect always matches
      // the real account even if a mapping mismatch ever recurs.
      if (ONBOARDS.includes(user.role)) {
        router.replace(`/onboarding?role=${user.role}`);
      } else {
        router.replace(ROLE_HOME[user.role] ?? '/');
      }
    } catch (err) {
      // Surface what the API actually said (duplicate email, duplicate phone,
      // bad school code, missing school name) instead of always blaming email.
      setErrors(apiErrors(err));
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-brand-50">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-3xl border-2 border-brand-100 p-8 shadow-card">
        <div className="flex items-center gap-3 mb-5">
          <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${role.bg} text-3xl`} style={{ boxShadow: `0 8px 16px -6px ${role.shadow}` }}>{role.emoji}</span>
          <div className="flex-1">
            <h2 className="font-display font-extrabold text-2xl text-brand-900 leading-tight">{role.headline}</h2>
            <p className="text-sm font-bold text-brand-500">{role.tagline}</p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1.5 mb-6">
          {SIGNUP_ROLES.map((r) => (
            <button type="button" key={r.key} onClick={() => { setRoleKey(r.key as RoleKey); setErrors({}); }} title={r.name}
              className={'flex flex-col items-center gap-1 py-2 rounded-xl text-lg transition ' + (roleKey === r.key ? 'bg-brand-700 text-white' : 'bg-brand-100 hover:bg-brand-200')}>
              <span>{r.emoji}</span>
              <span className={'text-[10px] font-display font-extrabold ' + (roleKey === r.key ? 'text-white' : 'text-brand-600')}>{r.name}</span>
            </button>
          ))}
        </div>

        <Label>{roleKey === 'CHILD' ? 'Your name' : 'Full name'}</Label>
        <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={roleKey === 'CHILD' ? 'e.g. Leo' : 'Your name'} />
        <FieldError>{errors.name}</FieldError>
        <div className="h-3" />
        <Label>Email</Label>
        <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" />
        <FieldError>{errors.email}</FieldError>

        <div className="h-3" />
        <Label>Mobile number <span className="font-normal text-brand-400">(optional)</span></Label>
        <Input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+251912345678" />
        <p className="text-[12px] font-bold text-brand-400 mt-1">Add it now to sign in with a texted code later.</p>
        <FieldError>{errors.phone}</FieldError>

        {role.fields.map((f) => (
          <div key={f.key}>
            <div className="h-3" />
            <Label>
              {f.label}
              {f.optional && <span className="font-normal text-brand-400"> (optional)</span>}
            </Label>
            {f.type === 'select' ? (
              <select value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}
                className="w-full bg-brand-50 border-2 border-brand-100 rounded-2xl px-4 py-3 font-body font-bold text-brand-900 outline-none focus:border-brand-500">
                <option value="">{f.placeholder}</option>
                {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <Input type={f.type ?? 'text'} value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
            )}
            {f.hint && <p className="text-[12px] font-bold text-brand-400 mt-1">{f.hint}</p>}
            <FieldError>{errors[f.key]}</FieldError>
          </div>
        ))}

        <div className="h-3" />
        <Label>Password</Label>
        <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Create a password" />
        <FieldError>{errors.password}</FieldError>
        <div className="h-3" />
        <Label>Confirm password</Label>
        <Input type="password" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} placeholder="Repeat password" />
        <FieldError>{errors.confirm}</FieldError>

        <FieldError>{errors.form}</FieldError>
        <Button type="submit" variant="grass" size="lg" className="w-full mt-6" disabled={busy}>{busy ? 'Creating…' : role.cta}</Button>
        <p className="font-body font-bold text-brand-600 text-center mt-4">Already have an account? <Link href="/login" className="text-brand-800 underline">Log in</Link></p>
      </form>
    </div>
  );
}

/**
 * Maps an API failure onto the field it belongs to. NestJS returns
 * `message` as a string for thrown exceptions and as a string[] for
 * class-validator failures, so both shapes are handled.
 */
function apiErrors(err: unknown): Record<string, string> {
  if (!axios.isAxiosError(err)) return { form: 'Something went wrong. Please try again.' };
  if (!err.response) return { form: "Can't reach Kidora right now. Check your connection and try again." };

  const raw = (err.response.data as { message?: string | string[] })?.message;
  const text = Array.isArray(raw) ? raw.join(', ') : raw || 'Registration failed. Please try again.';
  const lower = text.toLowerCase();

  if (lower.includes('email')) return { email: text };
  if (lower.includes('mobile') || lower.includes('phone')) return { phone: text };
  if (lower.includes('school code')) return { schoolCode: text };
  if (lower.includes('school name')) return { schoolName: text };
  if (lower.includes('district name')) return { districtName: text };
  return { form: text };
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterInner />
    </Suspense>
  );
}
