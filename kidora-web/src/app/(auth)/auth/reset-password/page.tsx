'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { CenteredAuthLayout } from '@/components/auth/kidora/layouts';
import { BackLink, FormError, PasswordField, PrimaryButton } from '@/components/auth/kidora/ui';
import { OtpInput } from '@/components/auth/OtpInput';
import { AUTH, destinationFor, recallResetEmail, rememberResetEmail } from '@/features/auth/routes';
import { passwordSchema } from '@/features/auth/schema';
import { apiErrorMessage } from '@/lib/api-error';
import { celebrate } from '@/lib/motion';
import { useAuthStore } from '@/stores/auth.store';

/** Step 2 of a reset: the emailed code and a new password; signs in. */
export default function ResetPasswordPage() {
  const router = useRouter();
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const [email, setEmail] = useState<string | null>(null);
  const [masked, setMasked] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const e = recallResetEmail();
    if (!e) { router.replace(AUTH.forgot); return; }
    setEmail(e);
    try { setMasked(sessionStorage.getItem('kidora.reset-masked') ?? e); } catch { setMasked(e); }
  }, [router]);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const errs: Record<string, string> = {};
    if (code.length !== 6) errs.code = 'Enter the 6-digit code';
    const p = passwordSchema.safeParse(pw.password);
    if (!p.success) errs.password = p.error.issues[0].message;
    if (pw.confirm !== pw.password) errs.confirm = "Passwords don't match";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setBusy(true);
    try {
      const res = await resetPassword(email!, code, pw.password);
      rememberResetEmail('');
      try { sessionStorage.removeItem('kidora.reset-masked'); } catch { /* storage off */ }
      await celebrate(400);
      router.replace(destinationFor(res.user.role, res.needsRole));
    } catch (err) {
      setErrors({ form: apiErrorMessage(err, "We couldn't reset your password.") });
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  if (!email) return null;

  return (
    <CenteredAuthLayout>
      <BackLink href={AUTH.forgot}>Use a different email</BackLink>
      <h1 data-anim="row" className="mt-3 font-display text-3xl font-extrabold text-ink">Choose a new password</h1>
      <p data-anim="row" className="mt-1 font-body font-semibold text-slate-600">
        If an account uses <span className="break-words font-extrabold text-ink">{masked}</span>, we emailed it a 6-digit code.
      </p>
      <form onSubmit={submit} noValidate className="mt-7 space-y-5">
        <div data-anim="row">
          <p className="mb-2 font-body text-sm font-extrabold text-ink" id="code-label">Reset code</p>
          <div aria-labelledby="code-label"><OtpInput value={code} onChange={(v) => { setCode(v); setErrors({}); }} invalid={Boolean(errors.code)} autoFocus /></div>
          {errors.code && <p role="alert" className="mt-1 font-body text-xs font-bold text-coral-600">{errors.code}</p>}
        </div>
        <div data-anim="row">
          <PasswordField label="New password" icon={<Lock className="h-[18px] w-[18px]" />} autoComplete="new-password" placeholder="At least 8 characters"
            value={pw.password} onChange={(e) => { setPw({ ...pw, password: e.target.value }); setErrors({}); }} error={errors.password} maxLength={72} />
        </div>
        <div data-anim="row">
          <PasswordField label="Confirm new password" icon={<Lock className="h-[18px] w-[18px]" />} autoComplete="new-password" placeholder="Type it again"
            value={pw.confirm} onChange={(e) => { setPw({ ...pw, confirm: e.target.value }); setErrors({}); }} error={errors.confirm} maxLength={72} />
        </div>
        <FormError>{errors.form}</FormError>
        <PrimaryButton type="submit" busy={busy}>{busy ? 'Saving…' : 'Save and log in'}</PrimaryButton>
      </form>
    </CenteredAuthLayout>
  );
}
