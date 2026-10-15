'use client';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  Bell, CalendarDays, ChevronLeft, ChevronRight, Globe, Heart, ImageIcon,
  Lightbulb, MessageSquareText, Palette, Star, Users,
} from 'lucide-react';
import { Navbar } from '@/components/navbar/Navbar';
import { Footer } from '@/components/footer/Footer';

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

/** Handwritten-style note that floats beside the mock-ups. */
function Scribble({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={'pointer-events-none select-none font-display font-bold text-brand-800 leading-tight ' + className}>
      {children}
      <Heart size={18} className="text-brand-600 mt-1" aria-hidden />
    </div>
  );
}

function Avatar({ src, alt, size = 36 }: { src: string; alt: string; size?: number }) {
  return (
    <span className="relative shrink-0 rounded-full overflow-hidden border-2 border-white shadow" style={{ width: size, height: size }}>
      <Image src={src} alt={alt} fill sizes={`${size}px`} className="object-cover" />
    </span>
  );
}

function Feature({
  icon, iconBg, title, desc, children,
}: { icon: ReactNode; iconBg: string; title: string; desc: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col animate-[fadeup_.5s_both]">
      <div className="flex gap-5 items-start">
        <div className={'w-14 h-14 shrink-0 rounded-2xl grid place-items-center text-white shadow-card ' + iconBg}>{icon}</div>
        <div>
          <h3 className="font-display font-extrabold text-[26px] leading-tight text-brand-900">{title}</h3>
          <p className="font-bold text-brand-900/70 mt-2 max-w-[360px]">{desc}</p>
        </div>
      </div>
      <div className="relative mt-8 md:pl-10">{children}</div>
    </div>
  );
}

const card = 'bg-white rounded-3xl border border-brand-100 shadow-card';

/* ------------------------------------------------------------------ */
/* Mock-up cards                                                       */
/* ------------------------------------------------------------------ */

function MessagesMock() {
  const rows = [
    { name: 'Ms. Aster', msg: 'Great progress in Math! 🎉', at: '10:24 AM', img: '/images/users/user1.jpg' },
    { name: 'Parent Group', msg: 'The science fair is next week!', at: '09:12 AM', group: true },
    { name: 'Mr. Daniel', msg: 'Here are the homework details.', at: 'Yesterday', img: '/images/users/user2.jpg' },
  ];
  return (
    <div className="relative max-w-[380px]">
      <div className={card + ' p-5 pt-6'}>
        <div className="font-display font-extrabold text-brand-900 mb-3">Messages</div>
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-3 py-3 border-t border-brand-100 first:border-t-0">
            {r.group ? (
              <span className="w-9 h-9 rounded-full bg-info-500 grid place-items-center text-white"><Users size={18} /></span>
            ) : (
              <Avatar src={r.img!} alt={r.name} />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-sm text-brand-900">{r.name}</div>
              <div className="text-xs text-brand-900/60 truncate">{r.msg}</div>
            </div>
            <span className="text-[11px] text-brand-900/50 self-start">{r.at}</span>
          </div>
        ))}
      </div>
      {/* auto-translate bubble */}
      <div className="absolute -top-8 right-0 md:-right-16 flex items-start gap-2">
        <span className="w-11 h-11 rounded-full bg-white shadow-card grid place-items-center text-brand-700"><Globe size={22} /></span>
        <div className="flex flex-col gap-1.5">
          <div className="bg-white shadow-card rounded-2xl px-3 py-2 text-sm font-bold text-brand-900">
            <div className="text-[10px] text-info-600 font-extrabold">Auto-translate</div>¡Buen trabajo!
          </div>
          <div className="bg-white shadow-card rounded-2xl px-3 py-2 text-sm font-bold text-brand-900">ጥሩ ስራ ሠርተሃል!</div>
        </div>
      </div>
    </div>
  );
}

function StoriesMock() {
  return (
    <div className="flex gap-3 items-start">
      <div className={card + ' p-4 w-full max-w-[250px]'}>
        <div className="font-display font-extrabold text-brand-900 mb-3">Stories</div>
        <div className="flex items-center gap-2 mb-3">
          <Avatar src="/images/users/user1.jpg" alt="Ms. Aster" size={30} />
          <div>
            <div className="font-extrabold text-xs text-brand-900">Ms. Aster</div>
            <div className="text-[10px] text-brand-900/50">Class 3A · 2h ago</div>
          </div>
        </div>
        <div className="relative h-32 rounded-2xl overflow-hidden">
          <Image src="/images/child5.jpg" alt="Class activity" fill sizes="250px" className="object-cover" />
        </div>
        <p className="text-xs font-bold text-brand-900/80 mt-3">Our little scientists in action! ⭐<br />Today we explored how plants grow.</p>
      </div>
      <div className="hidden sm:flex flex-col gap-3">
        {['/images/child2.jpg', '/images/child3.jpg', '/images/child4.jpg'].map((src) => (
          <div key={src} className="relative w-24 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-card">
            <Image src={src} alt="" fill sizes="96px" className="object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarMock() {
  const days = [['Sun', 20], ['Mon', 21], ['Tue', 22], ['Wed', 23], ['Thu', 24], ['Fri', 25], ['Sat', 26]] as const;
  return (
    <div className={card + ' p-5 max-w-[340px]'}>
      <div className="font-display font-extrabold text-brand-900">Calendar</div>
      <div className="flex items-center justify-between my-3 text-brand-900">
        <ChevronLeft size={16} className="text-brand-400" />
        <span className="font-extrabold text-sm">September 2026</span>
        <ChevronRight size={16} className="text-brand-400" />
      </div>
      <div className="grid grid-cols-7 text-center gap-y-2">
        {days.map(([d]) => <span key={d} className="text-[10px] text-brand-900/50">{d}</span>)}
        {days.map(([, n]) => (
          <span key={n} className={'mx-auto w-8 h-8 grid place-items-center rounded-full text-sm font-extrabold ' + (n === 22 ? 'bg-brand-700 text-white' : 'text-brand-900')}>{n}</span>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <div className="flex items-center gap-3 rounded-2xl bg-info-50 p-3">
          <span className="w-8 h-8 rounded-xl bg-warning-100 text-warning-600 grid place-items-center"><CalendarDays size={16} /></span>
          <div className="flex-1">
            <div className="text-xs font-extrabold text-brand-900">Parent-Teacher Meeting</div>
            <div className="text-[10px] text-brand-900/60">10:00 AM – 11:00 AM</div>
          </div>
          <Bell size={16} className="text-info-600" />
        </div>
        <div className="flex items-center gap-3 rounded-2xl p-3">
          <span className="w-8 h-8 rounded-xl bg-danger-100 text-danger-500 grid place-items-center"><CalendarDays size={16} /></span>
          <div>
            <div className="text-xs font-extrabold text-brand-900">Science Fair</div>
            <div className="text-[10px] text-brand-900/60">2:00 PM – 4:00 PM</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PointsMock() {
  const skills = [
    { label: 'Kindness', icon: <Heart size={20} fill="currentColor" />, cls: 'bg-danger-100 text-danger-500' },
    { label: 'Curiosity', icon: <Lightbulb size={20} />, cls: 'bg-warning-100 text-warning-500' },
    { label: 'Teamwork', icon: <Users size={20} />, cls: 'bg-info-100 text-info-600' },
    { label: 'Creativity', icon: <Palette size={20} />, cls: 'bg-rose-100 text-rose-500' },
  ];
  return (
    <div className={card + ' max-w-[360px] overflow-hidden'}>
      <div className="flex text-xs font-extrabold border-b border-brand-100">
        <span className="flex-1 text-center py-3 text-info-600 border-b-2 border-info-600">Points</span>
        <span className="flex-1 text-center py-3 text-brand-900/60">Big Ideas</span>
        <span className="flex-1 text-center py-3 text-brand-900/60">Portfolio</span>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-3">
          <Avatar src="/images/child7.jpg" alt="Amina" size={48} />
          <div>
            <div className="font-extrabold text-brand-900">Amina</div>
            <div className="text-[11px] text-brand-900/50">Grade 4</div>
            <div className="text-[11px] font-bold text-brand-900 flex items-center gap-1"><Star size={12} className="text-warning-400" fill="currentColor" /> 320 points</div>
          </div>
        </div>
        <div className="mt-4 h-2.5 rounded-full bg-brand-100 overflow-hidden">
          <div className="h-full w-[64%] rounded-full bg-gradient-to-r from-info-500 to-brand-600" />
        </div>
        <div className="text-[10px] text-brand-900/50 mt-1 text-right">Next reward at 500</div>
        <div className="grid grid-cols-4 gap-2 mt-4">
          {skills.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1.5">
              <span className={'w-11 h-11 rounded-full grid place-items-center ' + s.cls}>{s.icon}</span>
              <span className="text-[10px] font-bold text-brand-900/70">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function FamiliesLanding() {
  return (
    <div className="min-h-screen bg-white font-body text-brand-900 overflow-x-hidden">
      <Navbar />

      {/* HERO */}
      <section className="max-w-[1180px] mx-auto px-5 pt-10 md:pt-20 grid md:grid-cols-2 gap-10 items-center">
        <div className="animate-[fadeup_.6s_both]">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 font-display font-extrabold text-sm px-4 py-1.5 rounded-full mb-5">
            <Users size={16} /> For Families
          </div>
          <h1 className="font-display font-extrabold leading-[1.05]" style={{ fontSize: 'clamp(34px,4.2vw,54px)' }}>
            <span className="text-brand-900">Where classrooms</span>
            <br />
            <span className="md:whitespace-nowrap bg-gradient-to-r from-info-500 via-brand-600 to-rose-500 bg-clip-text text-transparent">become communities</span>
          </h1>
          <p className="font-bold text-brand-900/80 text-lg mt-5 max-w-md">
            Loved by more than 45 million students and parents. Follow your child&rsquo;s journey every step of the way.
          </p>
          <div className="flex gap-3 mt-8 flex-wrap">
            <Link href="/auth/signup?role=PARENT" className="bg-gradient-to-r from-brand-600 to-brand-700 text-white font-display font-extrabold text-lg px-8 py-3.5 rounded-full shadow-btn hover:-translate-y-0.5 transition-transform">
              Get started free 🎉
            </Link>
            <Link href="/plus" className="bg-white border-2 border-brand-200 text-brand-900 font-display font-extrabold text-lg px-8 py-3.5 rounded-full hover:border-brand-400 transition-colors">
              Explore Kidora Plus
            </Link>
          </div>
        </div>

        <div className="relative animate-[fadeup_.6s_.1s_both]">
          <div className="absolute -inset-6 rounded-[48px] bg-gradient-to-br from-info-100 via-brand-100 to-rose-100 blur-2xl opacity-70" aria-hidden />
          <div className="relative h-[320px] md:h-[400px] rounded-[40px] overflow-hidden shadow-card">
            <Image src="/images/child1.jpg" alt="Children learning together" fill priority sizes="(min-width:768px) 560px, 100vw" className="object-cover" />
          </div>
          <Scribble className="absolute -top-16 right-2 text-2xl -rotate-6 hidden sm:block">Better<br />Together</Scribble>
          <div className="absolute -bottom-6 left-4 md:left-auto md:-right-4 md:bottom-10 bg-white rounded-2xl shadow-card p-3 flex items-center gap-3 animate-bob">
            <Avatar src="/images/child7.jpg" alt="" size={40} />
            <div>
              <div className="text-sm font-extrabold text-brand-900">Your child is<br />making progress!</div>
              <div className="mt-1 inline-flex items-center gap-1 bg-brand-50 rounded-full px-2 py-0.5 text-[11px] font-bold text-brand-700">
                <Star size={11} className="text-warning-400" fill="currentColor" /> +20 points this week
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-[1180px] mx-auto px-5 py-20 md:py-24 grid md:grid-cols-2 gap-x-16 gap-y-20">
        <Feature
          icon={<MessageSquareText size={26} />}
          iconBg="bg-gradient-to-br from-brand-500 to-brand-700"
          title="Stay connected — instantly"
          desc="Messages make it easy to reach teachers anytime, auto-translated into 190+ languages 🌎"
        >
          <div className="pt-8"><MessagesMock /></div>
        </Feature>

        <Feature
          icon={<ImageIcon size={26} />}
          iconBg="bg-gradient-to-br from-grass-500 to-grass-700"
          title="A window into their world"
          desc="With Stories, teachers securely share photos and updates on a private feed just for your family."
        >
          <StoriesMock />
        </Feature>

        <Feature
          icon={<CalendarDays size={26} />}
          iconBg="bg-gradient-to-br from-warning-400 to-warning-600"
          title="Keep everyone up-to-date"
          desc="Events on the calendar keep you in the loop with automatic reminders."
        >
          <div className="flex items-start gap-4">
            <CalendarMock />
            <Scribble className="hidden lg:block text-xl rotate-6 mt-10">Never<br />miss a<br />moment</Scribble>
          </div>
        </Feature>

        <Feature
          icon={<Star size={26} />}
          iconBg="bg-gradient-to-br from-rose-400 to-rose-600"
          title="Help them grow their way"
          desc="Support social-emotional learning with Points, Big Ideas and Portfolios."
        >
          <div className="flex items-start gap-4">
            <PointsMock />
            <Scribble className="hidden lg:block text-xl -rotate-6 mt-6">Build<br />confidence<br />&amp; skills</Scribble>
          </div>
        </Feature>
      </section>

      {/* CTA with landscape */}
      <section className="relative overflow-hidden bg-gradient-to-b from-info-50 to-grass-100 pt-20 pb-40 md:pb-48 text-center px-5">
        <h2 className="font-display font-extrabold text-3xl md:text-4xl text-brand-900">Real families. Real progress.</h2>
        <p className="font-bold text-brand-900/70 mt-3 max-w-md mx-auto">Join millions of families who trust Kidora to help their children learn, grow and belong.</p>
        <Link href="/auth/signup?role=PARENT" className="relative z-10 inline-block mt-7 bg-gradient-to-r from-brand-600 to-brand-700 text-white font-display font-extrabold text-lg px-9 py-3.5 rounded-full shadow-btn hover:-translate-y-0.5 transition-transform">
          Get started free 🎉
        </Link>
        <Scribble className="absolute top-16 right-[8%] text-xl -rotate-12 hidden md:block">A brighter<br />future together</Scribble>
        <svg className="absolute bottom-0 left-0 w-full h-40 md:h-48" viewBox="0 0 1440 200" preserveAspectRatio="none" aria-hidden>
          <path d="M0 120 C 240 60 420 150 720 100 S 1200 50 1440 110 V200 H0Z" fill="#BBF7D0" />
          <path d="M0 160 C 300 110 560 190 880 140 S 1300 120 1440 150 V200 H0Z" fill="#4ADE80" />
          <path d="M980 200 C 1040 170 1120 160 1200 140 S 1360 110 1440 100 V120 C 1360 130 1260 160 1180 175 S 1060 195 1030 200Z" fill="#FDE68A" />
        </svg>
        <div className="absolute bottom-10 left-[4%] text-6xl md:text-7xl" aria-hidden>🏫</div>
        <div className="absolute bottom-16 left-[18%] text-4xl hidden sm:block" aria-hidden>🌳</div>
        <div className="absolute bottom-20 right-[20%] text-4xl hidden sm:block" aria-hidden>🌳</div>
      </section>

      <Footer />
    </div>
  );
}
