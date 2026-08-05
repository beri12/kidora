'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { registerSchema } from '@/features/auth/schemas';
import { useAuthStore } from '@/stores/auth.store';
import { ROLE_HOME } from '@/constants';
import { SIGNUP_ROLES } from '@/constants/roles';
import { Button } from '@/components/ui/button';
import { Input, Label, FieldError } from '@/components/ui/input';

// SIGNUP_ROLES uses short UI-friendly keys (SCHOOL, DISTRICT) that don't
// match the Prisma Role enum directly (SCHOOL_ADMIN, DISTRICT_ADMIN), so
// this translates the UI key into the real backend enum value before the
// register API call.
const ROLE_TO_BACKEND: Record<string, string> = {
  CHILD: 'CHILD',
  PARENT: 'PARENT',
  TEACHER: 'TEACHER',
  SCHOOL: 'SCHOOL_ADMIN',
  DISTRICT: 'DISTRICT_ADMIN',
};

function RegisterInner() {
  const router = useRouter();
  const params = useSearchParams();
  const register = useAuthStore((s) => s.register);

  const initialRole = (params.get('role') || 'PARENT').toUpperCase();
  const validRole = SIGNUP_ROLES.some((r) => r.key === initialRole) ? initialRole : 'PARENT';
  const [roleKey, setRoleKey] = useState(validRole);
  const role = SIGNUP_ROLES.find((r) => r.key === roleKey) ?? SIGNUP_ROLES[1];

  const [form, setForm] = useState<Record<string, string>>({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = registerSchema.safeParse({ ...form, role: roleKey });
    const extra: Record<string, string> = {};
    role.fields.forEach((f) => { if (!form[f.key]?.trim()) extra[f.key] = 'Required'; });
    if (!parsed.success || Object.keys(extra).length) {
      setErrors({ ...(parsed.success ? {} : Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], String(i.message)]))), ...extra });
      return;
    }
    setErrors({}); setBusy(true);
    try {
      const backendRole = ROLE_TO_BACKEND[roleKey] ?? roleKey;
      const user = await register(form.name, form.email, form.password, backendRole);

      // Interactive roles (CHILD/PARENT/TEACHER) run the onboarding wizard first.
      // Org roles (SCHOOL_ADMIN/DISTRICT_ADMIN) go straight to their dashboard.
      // Either way, the destination is driven by user.role — the value the
      // backend actually saved — not the UI's roleKey, so redirect always
      // matches the real account, even if a mapping mismatch ever recurs.
      if (['CHILD', 'PARENT', 'TEACHER'].includes(user.role)) {
        router.replace(`/onboarding?role=${user.role}`);
      } else {
        router.replace(ROLE_HOME[user.role] ?? '/');
      }
    } catch {
      setErrors({ email: 'That email is already registered' });
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
            <button type="button" key={r.key} onClick={() => { setRoleKey(r.key); setErrors({}); }} title={r.name}
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

        {role.fields.map((f) => (
          <div key={f.key}>
            <div className="h-3" />
            <Label>{f.label}</Label>
            {f.type === 'select' ? (
              <select value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}
                className="w-full bg-brand-50 border-2 border-brand-100 rounded-2xl px-4 py-3 font-body font-bold text-brand-900 outline-none focus:border-brand-500">
                <option value="" disabled>{f.placeholder}</option>
                {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <Input type={f.type ?? 'text'} value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
            )}
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

        <Button type="submit" variant="grass" size="lg" className="w-full mt-6" disabled={busy}>{busy ? 'Creating…' : role.cta}</Button>
        <p className="font-body font-bold text-brand-600 text-center mt-4">Already have an account? <Link href="/login" className="text-brand-800 underline">Log in</Link></p>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterInner />
    </Suspense>
  );
}