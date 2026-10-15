'use client';

import { Suspense, useState } from 'react';
import { CenteredAuthLayout } from '@/components/auth/kidora/layouts';
import { LoginForm } from '@/components/auth/LoginForm';

function LoginScreen() {
  const [step, setStep] = useState('form');
  return (
    <CenteredAuthLayout stepKey={step}>
      <LoginForm onStepChange={setStep} />
    </CenteredAuthLayout>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginScreen /></Suspense>;
}
