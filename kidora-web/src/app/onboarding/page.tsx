import { redirect } from 'next/navigation';

/** The old onboarding wizard; the role and profile steps replace it. Query params (next, role) carry over. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) {
    if (k !== 'method' && typeof v === 'string') q.set(k === 'redirect' ? 'next' : k, v);
  }
  const qs = q.toString();
  redirect(qs ? `/auth/signup/role?${qs}` : '/auth/signup/role');
}
