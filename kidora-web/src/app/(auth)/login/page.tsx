'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginSchema } from '@/features/auth/schemas';
import { useAuthStore } from '@/stores/auth.store';
import { ROLE_HOME } from '@/constants';
import { Button } from '@/components/ui/button';
import { Input, Label, FieldError } from '@/components/ui/input';
import { SignupModal } from '@/components/shared/SignupModal';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({}); setBusy(true);
    try {
      const user = await login(form.email, form.password);
      router.replace(ROLE_HOME[user.role]); // role-based redirect
    } catch {
      setErrors({ password: 'Invalid email or password' });
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col items-center justify-center bg-gradient-to-br from-brand-600 via-brand-800 to-grass-600 text-white p-12 text-center">
        <div className="text-6xl mb-4">🎓</div>
        <h1 className="font-display font-extrabold text-4xl">Welcome back!</h1>
        <p className="font-body font-bold text-brand-100 mt-2">Ready for a new adventure?</p>
      </div>
      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm">
          <h2 className="font-display font-extrabold text-3xl text-brand-900 mb-1">Log in</h2>
          <p className="font-body font-bold text-brand-600 mb-6">New here? <button type="button" onClick={() => setSignupOpen(true)} className="text-brand-800 underline">Create an account</button></p>
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@family.com" />
          <FieldError>{errors.email}</FieldError>
          <div className="h-4" />
          <Label>Password</Label>
          <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          <FieldError>{errors.password}</FieldError>
          <Button type="submit" size="lg" className="w-full mt-6" disabled={busy}>{busy ? 'Logging in…' : 'Log in →'}</Button>
        </form>
      </div>

      <SignupModal
        open={signupOpen}
        onClose={() => setSignupOpen(false)}
        onPick={(role) => router.push(`/register?role=${role}`)}
      />
    </div>
  );
}
