import { redirect } from 'next/navigation';

/** /signup is the same flow as /join; query params (role, next) carry over. */
export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const qs = new URLSearchParams(await searchParams).toString();
  redirect(qs ? `/join?${qs}` : '/join');
}
