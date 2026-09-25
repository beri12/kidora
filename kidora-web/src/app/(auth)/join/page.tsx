'use client';

import { Suspense } from 'react';
import { AuthFlow } from '@/components/auth/AuthFlow';

/** Create your Kidora account — Google, Phone or TikTok first; email is the secondary option. */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthFlow mode="signup" />
    </Suspense>
  );
}
