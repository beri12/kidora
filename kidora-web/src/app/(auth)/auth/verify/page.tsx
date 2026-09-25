import { redirect } from 'next/navigation';

/**
 * Codes are entered inside the flow that sent them (it knows the number or
 * address), so a bare /auth/verify starts phone sign-in.
 */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const qs = new URLSearchParams({ ...(await searchParams), method: 'phone' }).toString();
  redirect(`/login?${qs}`);
}
