'use client';
import { Navbar } from '@/components/navbar/Navbar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Footer } from '@/components/footer/Footer';

const BENEFITS = [
  { icon: '🏫', title: 'Whole-school rollout', desc: 'Onboard every class and teacher in minutes with school-wide accounts.' },
  { icon: '📊', title: 'Student analytics', desc: 'Track growth, attendance and learning hours across all classrooms.' },
  { icon: '🛡️', title: 'Safe & private', desc: 'COPPA/FERPA-aligned. Your community&rsquo;s data stays protected — always.' },
  { icon: '👩‍🏫', title: 'Teacher activity', desc: 'See engagement and support staff with shared resources.' },
];
const PLAN_FEATS = ['Teacher dashboard', 'Classroom management', 'Student analytics', 'School reports', 'Up to 40 students / class', 'Priority support'];

export default function SchoolsLanding() {
  return (
    <div className="min-h-screen bg-brand-50 font-body text-brand-900">
      <Navbar />
      <section className="max-w-[1120px] mx-auto px-5 pt-12 pb-8 grid md:grid-cols-2 gap-8 items-center">
        <div className="animate-[fadeup_.6s_both]">
          <div className="inline-block bg-grass-100 text-grass-700 font-display font-extrabold text-sm px-4 py-1.5 rounded-full mb-4">🏫 For Schools</div>
          <h1 className="font-display font-extrabold text-5xl leading-[1.05]">Give your whole school superpowers</h1>
          <p className="font-bold text-brand-600 text-lg mt-4">Manage classes, teachers and student analytics from one dashboard — with the reports leaders need and the safety families trust.</p>
          <div className="flex gap-3 mt-6 flex-wrap">
            <Link href="/register?role=SCHOOL"><Button size="lg" variant="grass">Request school setup →</Button></Link>
            <Link href="/dashboard/admin"><Button size="lg" variant="outline">View demo dashboard</Button></Link>
          </div>
        </div>
        <div className="rounded-[32px] bg-gradient-to-br from-grass-500 to-grass-700 p-8 text-white shadow-card animate-[fadeup_.6s_.1s_both]">
          <div className="text-[110px] leading-none text-center animate-bob">🏫</div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[['500', 'Students'], ['24', 'Teachers'], ['18', 'Classes'], ['92%', 'Engaged']].map((s) => (
              <div key={s[1]} className="bg-white/15 rounded-2xl py-3 text-center"><div className="font-display font-extrabold text-2xl">{s[0]}</div><div className="text-xs font-bold opacity-90">{s[1]}</div></div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-[1120px] mx-auto px-5 py-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {BENEFITS.map((b, i) => (
            <div key={b.title} className="bg-white rounded-3xl border-2 border-brand-100 p-6 shadow-card animate-[fadeup_.5s_both]" style={{ animationDelay: i * 0.06 + 's' }}>
              <div className="text-4xl mb-3">{b.icon}</div>
              <h3 className="font-display font-extrabold text-lg">{b.title}</h3>
              <p className="font-bold text-brand-500 text-sm mt-1">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* plan */}
      <section className="max-w-[720px] mx-auto px-5 pb-16">
        <div className="rounded-[32px] bg-white border-2 border-grass-200 p-8 shadow-card text-center">
          <div className="text-4xl">🏫</div>
          <h2 className="font-display font-extrabold text-3xl mt-2">School Plan</h2>
          <div className="my-3"><span className="font-display font-extrabold text-4xl">$99</span><span className="font-bold text-brand-400">/mo</span></div>
          <div className="grid sm:grid-cols-2 gap-2 text-left my-6">
            {PLAN_FEATS.map((ft) => <div key={ft} className="flex gap-2 font-bold text-brand-800"><span className="text-grass-600">✓</span>{ft}</div>)}
          </div>
          <Link href="/register?role=SCHOOL"><Button size="lg" variant="grass" className="w-full">Get started</Button></Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}
