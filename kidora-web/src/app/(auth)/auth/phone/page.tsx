import { redirect } from 'next/navigation';

/** Retired phone sign-in URL: email and social sign-in replace it. Query params (next, role) carry over. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) {
    if (k !== 'method' && typeof v === 'string') q.set(k === 'redirect' ? 'next' : k, v);
  }
  const qs = q.toString();
  redirect(qs ? `/auth/login?${qs}` : '/auth/login');
}
