'use client';
import { Navbar } from '@/components/navbar/Navbar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Footer } from '@/components/footer/Footer';

const FEATURES = [
  { emoji: '💬', title: 'Stay connected — instantly', desc: 'Messages make it easy to reach teachers anytime, auto-translated into 190+ languages 🌎', bg: 'from-brand-100 to-brand-50' },
  { emoji: '✨', title: 'A window into their world', desc: 'With Stories, teachers securely share photos and updates on a private feed just for your family.', bg: 'from-grass-100 to-grass-50' },
  { emoji: '📅', title: 'Keep everyone up-to-date', desc: 'Events on the calendar keep you in the loop with automatic reminders.', bg: 'from-amber-100 to-amber-50' },
  { emoji: '🎨', title: 'Help them grow their way', desc: 'Support social-emotional learning with Points, Big Ideas and Portfolios.', bg: 'from-rose-100 to-rose-50' },
];

export default function FamiliesLanding() {
  return (
    <div className="min-h-screen bg-brand-50 font-body text-brand-900">
      <Navbar />
      <section className="max-w-[1120px] mx-auto px-5 pt-12 pb-8 text-center">
        <div className="inline-block bg-brand-100 text-brand-700 font-display font-extrabold text-sm px-4 py-1.5 rounded-full mb-4 animate-[fadeup_.5s_both]">👪 For Families</div>
        <h1 className="font-display font-extrabold text-5xl leading-[1.05] animate-[fadeup_.6s_both]">Where classrooms become communities</h1>
        <p className="font-bold text-brand-600 text-lg mt-4 max-w-2xl mx-auto animate-[fadeup_.6s_.1s_both]">Loved by more than 45 million students and parents. Follow your child&rsquo;s journey every step of the way.</p>
        <div className="flex gap-3 mt-6 justify-center flex-wrap animate-[fadeup_.6s_.15s_both]">
          <Link href="/register?role=PARENT"><Button size="lg">Get started free 🎉</Button></Link>
          <Link href="/plus"><Button size="lg" variant="outline">Explore Kidora Plus</Button></Link>
        </div>
        <div className="text-[130px] mt-6 animate-bob">🐵</div>
      </section>

      {/* alternating feature rows */}
      <section className="max-w-[1000px] mx-auto px-5 py-8 flex flex-col gap-6">
        {FEATURES.map((ft, i) => (
          <div key={ft.title} className={'grid md:grid-cols-2 gap-6 items-center rounded-[32px] bg-gradient-to-br ' + ft.bg + ' p-8 shadow-card animate-[fadeup_.5s_both] ' + (i % 2 ? 'md:[direction:rtl]' : '')} style={{ animationDelay: i * 0.08 + 's' }}>
            <div className="[direction:ltr]">
              <div className="text-5xl mb-3 animate-bob" style={{ animationDelay: i * 0.2 + 's' }}>{ft.emoji}</div>
              <h3 className="font-display font-extrabold text-2xl">{ft.title}</h3>
              <p className="font-bold text-brand-600 mt-2">{ft.desc}</p>
            </div>
            <div className="[direction:ltr] bg-white/70 rounded-3xl h-40 grid place-items-center text-6xl">{ft.emoji}</div>
          </div>
        ))}
      </section>

      <section className="max-w-[1120px] mx-auto px-5 pb-16">
        <div className="rounded-[32px] bg-gradient-to-br from-brand-600 to-grass-600 text-white p-10 text-center">
          <h2 className="font-display font-extrabold text-3xl">Let&rsquo;s get growing 🌱</h2>
          <p className="font-bold opacity-90 mt-2 mb-6">Join your child&rsquo;s learning adventure today.</p>
          <Link href="/register?role=PARENT"><Button size="lg" variant="grass">Create free account</Button></Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}
