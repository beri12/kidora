import { redirect } from 'next/navigation';

/** Deep link straight to phone sign-in. */
export default async function PhoneAuthPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const qs = new URLSearchParams({ ...(await searchParams), method: 'phone' }).toString();
  redirect(`/login?${qs}`);
}
