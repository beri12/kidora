import Link from 'next/link';
import type { ReactNode } from 'react';
import { Footer } from '@/components/footer/Footer';

/** One entry in a legal page's table of contents: the section's anchor id and title. */
export interface LegalSection { id: string; title: string }

/** Plain, readable layout for Terms and Privacy. */
export function LegalPage({ title, updated, effective, contents, children }: {
  title: string;
  updated: string;
  /** Shown above "Last updated" when the document has a separate effective date. */
  effective?: string;
  /** Renders a linked table of contents above the body. */
  contents?: LegalSection[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 px-4 py-4">
        <Link href="/" className="font-display text-2xl font-extrabold text-iris-700">Kidora</Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl font-extrabold text-ink">{title}</h1>
        {effective && <p className="mt-2 font-body text-sm font-semibold text-slate-500">Effective date: {effective}</p>}
        <p className={`${effective ? 'mt-0.5' : 'mt-2'} font-body text-sm font-semibold text-slate-500`}>Last updated {updated}</p>

        {contents && contents.length > 0 && (
          <nav aria-label="Contents" className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <h2 className="font-display text-lg font-extrabold text-ink">Contents</h2>
            <ol className="mt-3 grid gap-x-6 gap-y-1.5 font-body text-sm font-semibold sm:grid-cols-2">
              {contents.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-iris-700 hover:underline">{s.title}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="mt-8 space-y-6 font-body text-[15px] font-semibold leading-relaxed text-slate-700 [&_h2]:mt-10 [&_h2]:scroll-mt-6 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-extrabold [&_h3]:text-ink [&_ul]:space-y-1 [&_ol]:space-y-1 [&_ul>li]:ml-5 [&_ul>li]:list-disc [&_ol>li]:ml-5 [&_ol>li]:list-decimal [&_a]:font-bold [&_a]:text-iris-700 hover:[&_a]:underline">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
