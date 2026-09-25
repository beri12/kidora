'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell, AuthStep } from '@/components/auth/AuthShell';
import { RolePicker } from '@/components/auth/RolePicker';
import { OrgVerifyForm } from '@/components/auth/OrgVerifyForm';
import { PendingApproval } from '@/components/auth/PendingApproval';
import { ROLE_HOME } from '@/constants';
import { celebrate } from '@/lib/motion';
import { useAuthStore } from '@/stores/auth.store';
import type { Role } from '@/types';

/**
 * "How will you use Kidora?" on its own URL, for a signed-in account that
 * has not answered yet. Anyone who has answered goes to their dashboard;
 * anyone signed out goes to sign in.
 */
function RoleOnboarding() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, hydrated } = useAuthStore();
  const [step, setStep] = useState<'role' | 'verify' | 'pending'>('role');
  const [verifyRole, setVerifyRole] = useState<'SCHOOL_ADMIN' | 'SCHOOL_LEADER' | 'DISTRICT_ADMIN'>('SCHOOL_LEADER');

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace('/login?next=/onboarding/role');
    else if (user.roleConfirmed !== false) router.replace(ROLE_HOME[user.role] ?? '/');
  }, [hydrated, user, router]);

  const done = async (role: Role) => {
    await celebrate(500);
    router.replace(ROLE_HOME[role] ?? '/');
  };

  if (!hydrated || !user || user.roleConfirmed !== false) return null;

  return (
    <AuthShell title="Nice to meet you! 🌟" wide={step === 'role'}>
      {step === 'role' && (
        <AuthStep key="role">
          <RolePicker onDone={done} onNeedsVerification={(r) => { setVerifyRole(r); setStep('verify'); }} initialRole={params.get('role')} />
        </AuthStep>
      )}
      {step === 'verify' && (
        <AuthStep key="verify">
          <OrgVerifyForm
            role={verifyRole}
            onBack={() => setStep('role')}
            onSubmitted={(res) => (res.roleGranted ? done(res.request.requestedRole as Role) : setStep('pending'))}
          />
        </AuthStep>
      )}
      {step === 'pending' && <PendingApproval />}
    </AuthShell>
  );
}

export default function RoleOnboardingPage() {
  return (
    <Suspense fallback={null}>
      <RoleOnboarding />
    </Suspense>
  );
}
