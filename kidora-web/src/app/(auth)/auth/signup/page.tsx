'use client';

import { Suspense, useState } from 'react';
import { SplitAuthLayout } from '@/components/auth/kidora/layouts';
import { SignupForm } from '@/components/auth/SignupForm';

function SignupScreen() {
  const [step, setStep] = useState('form');
  return (
    <SplitAuthLayout stepKey={step}>
      <SignupForm onStepChange={setStep} />
    </SplitAuthLayout>
  );
}

export default function SignupPage() {
  return <Suspense fallback={null}><SignupScreen /></Suspense>;
}
