'use client';
// Public marketing page. It used to sit at /dashboard/for-teachers, where
// DashboardLayout's useRequireAuth redirected every signed-out visitor to
// /login — the audience it is written for could never read it.
import { Navbar } from '@/components/navbar/Navbar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Footer } from '@/components/footer/Footer';

const TOOLKIT = [
  { icon: '⏱️', name: 'Timers', desc: 'Keep activities on track' },
  { icon: '🎲', name: 'Group Maker', desc: 'Fair random teams in a tap' },
  { icon: '📊', name: 'Live Stats', desc: 'See class progress in real time' },
  { icon: '🎯', name: 'Points', desc: 'Reward growth & good habits' },
  { icon: '📅', name: 'Events', desc: 'Auto-reminders for families' },
  { icon: '📸', name: 'Stories', desc: 'Share classroom moments safely' },
];

export default function TeachersLanding() {
  return (
    <div className="min-h-screen bg-brand-50 font-body text-brand-900">
      <Navbar />
      {/* hero */}
      <section className="max-w-[1120px] mx-auto px-5 pt-12 pb-8 grid md:grid-cols-2 gap-8 items-center">
        <div className="animate-[fadeup_.6s_both]">
          <div className="inline-block bg-brand-100 text-brand-700 font-display font-extrabold text-sm px-4 py-1.5 rounded-full mb-4">🍎 For Teachers</div>
          <h1 className="font-display font-extrabold text-5xl leading-[1.05]">Build the best classroom yet</h1>
          <p className="font-bold text-brand-600 text-lg mt-4">From attendance to timers and everything in between, the Teacher Toolkit saves time and energy for what really matters — helping kids grow. Free for teachers, forever.</p>
          <div className="flex gap-3 mt-6 flex-wrap">
            <Link href="/register?role=TEACHER"><Button size="lg">Get started free 🍎</Button></Link>
            <Link href="/plus"><Button size="lg" variant="outline">See Kidora Plus</Button></Link>
          </div>
        </div>
        <div className="relative animate-[fadeup_.6s_.1s_both]">
          <div className="rounded-[32px] bg-gradient-to-br from-brand-600 to-grass-600 p-8 text-white text-center shadow-card">
            <div className="text-[120px] leading-none animate-bob">👩‍🏫</div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[['24', 'Students'], ['96%', 'Engaged'], ['4.9★', 'Loved']].map((s) => (
                <div key={s[1]} className="bg-white/15 rounded-2xl py-3"><div className="font-display font-extrabold text-2xl">{s[0]}</div><div className="text-xs font-bold opacity-90">{s[1]}</div></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* toolkit grid */}
      <section className="max-w-[1120px] mx-auto px-5 py-10">
        <h2 className="font-display font-extrabold text-3xl text-center mb-8">The Teacher Toolkit 🧰</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TOOLKIT.map((t, i) => (
            <div key={t.name} className="bg-white rounded-3xl border-2 border-brand-100 p-6 shadow-card transition-transform hover:-translate-y-1.5 animate-[fadeup_.5s_both]" style={{ animationDelay: i * 0.06 + 's' }}>
              <div className="text-4xl mb-3 animate-bob" style={{ animationDelay: i * 0.2 + 's' }}>{t.icon}</div>
              <h3 className="font-display font-extrabold text-xl">{t.name}</h3>
              <p className="font-bold text-brand-500 mt-1">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1120px] mx-auto px-5 pb-16">
        <div className="rounded-[32px] bg-gradient-to-br from-brand-600 to-brand-800 text-white p-10 text-center">
          <h2 className="font-display font-extrabold text-3xl">Ready to bring your classroom to life?</h2>
          <p className="font-bold opacity-90 mt-2 mb-6">Join millions of teachers already using Kidora.</p>
          <Link href="/register?role=TEACHER"><Button size="lg" variant="grass">Create teacher account 🍎</Button></Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}
