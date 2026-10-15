'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Mail } from 'lucide-react';
import { CenteredAuthLayout } from '@/components/auth/kidora/layouts';
import { BackLink, Field, FormError, PrimaryButton } from '@/components/auth/kidora/ui';
import { AUTH, recallResetEmail, rememberResetEmail } from '@/features/auth/routes';
import { emailSchema } from '@/features/auth/schema';
import { apiErrorMessage } from '@/lib/api-error';
import { useAuthStore } from '@/stores/auth.store';

/** Step 1 of a reset: the API emails a code (and answers the same for unknown addresses). */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const forgotPassword = useAuthStore((s) => s.forgotPassword);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setEmail(recallResetEmail()); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = emailSchema.safeParse(email);
    if (!ok.success) { setError(ok.error.issues[0].message); return; }
    setBusy(true);
    try {
      const res = await forgotPassword(email.trim());
      rememberResetEmail(email.trim());
      try { sessionStorage.setItem('kidora.reset-masked', res.maskedEmail); } catch { /* storage off */ }
      router.push(AUTH.reset);
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't send the reset code."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <CenteredAuthLayout>
      <BackLink href={AUTH.login}>Back to log in</BackLink>
      <div data-anim="row" className="mt-3 grid h-14 w-14 place-items-center rounded-2xl bg-iris-100 text-iris-700" aria-hidden><KeyRound className="h-7 w-7" /></div>
      <h1 data-anim="row" className="mt-4 font-display text-3xl font-extrabold text-ink">Forgot your password?</h1>
      <p data-anim="row" className="mt-1 font-body font-semibold text-slate-600">No worries! Enter your email and we&apos;ll send you a reset code.</p>
      <form onSubmit={submit} noValidate className="mt-7 space-y-4">
        <div data-anim="row">
          <Field label="Email" icon={<Mail className="h-[18px] w-[18px]" />} type="email" autoComplete="email" inputMode="email" autoFocus
            placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} maxLength={254} />
        </div>
        <FormError>{error}</FormError>
        <PrimaryButton type="submit" busy={busy}>{busy ? 'Sending…' : 'Send reset code'}</PrimaryButton>
      </form>
    </CenteredAuthLayout>
  );
}
