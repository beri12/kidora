'use client';
import Link from 'next/link';

const COLUMNS: [string, string[]][] = [
  ['Company', ['About', 'Careers', 'Press', 'Blog']],
  ['Product', ['Courses', 'Games', 'Kidora Plus', 'AI Tutor']],
  ['For', ['Teachers', 'Families', 'Schools', 'Districts']],
  ['Support', ['Help Center', 'Contact', 'Privacy', 'Terms']],
];

const LINK_HREF: Record<string, string> = {
  Teachers: '/for-teachers', Families: '/for-families', Schools: '/for-schools', Districts: '/for-schools',
  'Kidora Plus': '/plus', 'AI Tutor': '/ai-tutor', Games: '/games', Courses: '/courses',
};

export function Footer() {
  return (
    <footer className="bg-white border-t-2 border-brand-100">
      <div className="max-w-[1240px] mx-auto px-6 py-12 grid sm:grid-cols-2 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-grass-600 grid place-items-center text-white font-display font-extrabold">K</div>
            <span className="font-display font-extrabold text-lg text-brand-900">Kidora</span>
          </div>
          <p className="font-bold text-brand-500 text-sm">Our mission is to give every child an education they love.</p>
          <div className="flex gap-2 mt-4">
            {['📘', '🐦', '📸'].map((s) => (
              <span key={s} className="w-9 h-9 grid place-items-center rounded-xl bg-brand-100 text-lg">{s}</span>
            ))}
          </div>
        </div>
        {COLUMNS.map((col) => (
          <div key={col[0]}>
            <div className="font-display font-extrabold text-brand-900 mb-3">{col[0]}</div>
            <div className="flex flex-col gap-2">
              {col[1].map((l) => (
                <Link key={l} href={LINK_HREF[l] ?? '/'} className="font-bold text-brand-500 text-sm hover:text-brand-800 transition-colors">{l}</Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="text-center font-bold text-brand-400 text-sm pb-6">© {new Date().getFullYear()} Kidora, Inc. · Made with 💜 for curious kids</div>
    </footer>
  );
}
