import { redirect } from 'next/navigation';

/** Phone sign-in lives on the log-in page ("Phone code" tab). Query params (next, role) carry over. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[]>> }) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) {
    if (k !== 'method' && typeof v === 'string') q.set(k === 'redirect' ? 'next' : k, v);
  }
  q.set('method', 'phone');
  const qs = q.toString();
  redirect(`/auth/login?${qs}`);
}
