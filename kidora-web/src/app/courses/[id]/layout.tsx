'use client';
import type { ReactNode } from 'react';
import { RequireRole } from '@/components/shared/RequireRole';
import { ROLE_HOME } from '@/constants';
import type { Role } from '@/types';

// A course's lessons are for signed-in members only (the /courses catalogue
// is public). Middleware already turns a signed-out visitor away; this checks
// the real session so a hand-set cookie cannot render the lessons either.
const ANY_ROLE = Object.keys(ROLE_HOME) as Role[];

export default function CourseLayout({ children }: { children: ReactNode }) {
  return <RequireRole allow={ANY_ROLE}>{children}</RequireRole>;
}
