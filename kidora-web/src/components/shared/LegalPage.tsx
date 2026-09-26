import Link from 'next/link';
import type { ReactNode } from 'react';
import { Footer } from '@/components/footer/Footer';

/** Plain, readable layout for Terms and Privacy. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 px-4 py-4">
        <Link href="/" className="font-display text-2xl font-extrabold text-iris-700">Kidora</Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl font-extrabold text-ink">{title}</h1>
        <p className="mt-2 font-body text-sm font-semibold text-slate-500">Last updated {updated}</p>
        <div className="mt-8 space-y-6 font-body text-[15px] font-semibold leading-relaxed text-slate-700 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
