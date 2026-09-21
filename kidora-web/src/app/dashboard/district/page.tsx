'use client';
import Link from 'next/link';
import { Navbar } from '@/components/navbar/Navbar';
import { Footer } from '@/components/footer/Footer';
import { Button } from '@/components/ui/button';
import { useRequireAuth } from '@/hooks/useRequireAuth';

// Where a DISTRICT_ADMIN lands after login (see ROLE_HOME in @/constants).
// The file existed but was empty, which both broke `next build` ("is not a
// module") and left the whole role with a blank screen on sign-in.
//
// The district-level reporting API does not exist yet, so this is a hub over
// the sections that are actually implemented rather than a metrics dashboard
// showing numbers we cannot source.
const SECTIONS = [
  {
    href: '/school/analytics',
    icon: '📈',
    title: 'Analytics',
    desc: 'Engagement, progress and learning hours across your schools.',
  },
  {
    href: '/school/students',
    icon: '👥',
    title: 'Students',
    desc: 'Browse and search every enrolled student.',
  },
  {
    href: '/school/teachers',
    icon: '🧑‍🏫',
    title: 'Teachers',
    desc: 'Staff roster, class assignments and activity.',
  },
  {
    href: '/school/classes',
    icon: '🏫',
    title: 'Classes',
    desc: 'Class lists, rosters and schedules.',
  },
  {
    href: '/school/courses',
    icon: '📚',
    title: 'Courses',
    desc: 'The course catalog available to your schools.',
  },
  {
    href: '/school/billing',
    icon: '💳',
    title: 'Billing',
    desc: 'Plan, invoices and seat usage.',
  },
];

export default function DistrictDashboard() {
  useRequireAuth(['DISTRICT_ADMIN', 'ADMIN']);

  return (
    <div className="min-h-screen bg-brand-50 font-body text-brand-900">
      <Navbar />

      <section className="max-w-[1120px] mx-auto px-5 pt-10 pb-6">
        <div className="inline-block bg-brand-100 text-brand-700 font-display font-extrabold text-sm px-4 py-1.5 rounded-full mb-4">
          🏛️ District
        </div>
        <h1 className="font-display font-extrabold text-4xl leading-tight">District overview</h1>
        <p className="font-bold text-brand-600 text-lg mt-3 max-w-[640px]">
          Jump into reporting and rosters for the schools in your district.
        </p>
      </section>

      <section className="max-w-[1120px] mx-auto px-5 pb-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SECTIONS.map((s, i) => (
            <Link
              key={s.href}
              href={s.href}
              className="bg-white rounded-3xl border-2 border-brand-100 p-6 shadow-card hover:-translate-y-1 hover:border-brand-300 transition-all animate-[fadeup_.5s_both]"
              style={{ animationDelay: i * 0.05 + 's' }}
            >
              <div className="text-4xl mb-3">{s.icon}</div>
              <h2 className="font-display font-extrabold text-lg">{s.title}</h2>
              <p className="font-bold text-brand-500 text-sm mt-1">{s.desc}</p>
            </Link>
          ))}
        </div>

        <div className="mt-8 rounded-3xl bg-white border-2 border-brand-100 p-6 shadow-card flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-extrabold text-xl">Add a school</h2>
            <p className="font-bold text-brand-500 text-sm mt-1">
              Invite another school in your district to join Kidora.
            </p>
          </div>
          <Link href="/register?role=SCHOOL">
            <Button variant="grass">Invite a school →</Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
