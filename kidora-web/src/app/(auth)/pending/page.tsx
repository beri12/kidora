'use client';

import { AuthShell } from '@/components/auth/AuthShell';
import { PendingApproval } from '@/components/auth/PendingApproval';

/**
 * Where a school or district applicant waits. Reachable directly, so the link
 * in the notification email and a bookmark both land somewhere sensible.
 */
export default function PendingPage() {
  return (
    <AuthShell title="Almost there!" subtitle="We're verifying your organisation.">
      <PendingApproval />
    </AuthShell>
  );
}
