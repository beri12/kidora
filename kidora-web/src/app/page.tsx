// 'use client';
// import { useEffect, useRef } from 'react';
// import Link from 'next/link';
// import { gsap } from 'gsap';
// import { Navbar } from '@/components/navbar/Navbar';
// import { Button } from '@/components/ui/button';
// import { SUBJECTS } from '@/constants';
// import { Footer } from '@/components/footer/Footer';

// const FEATURES = [
//   { emoji: '🎬', title: 'Animated lessons kids love', desc: 'Every concept comes alive with characters, motion and sound — learning that feels like a show.', bg: 'from-brand-100 to-brand-50' },
//   { emoji: '🎮', title: 'Learn through play', desc: 'Interactive games across Math, Reading, Science and Coding turn practice into an adventure.', bg: 'from-grass-100 to-grass-50' },
//   { emoji: '🤖', title: 'Kai, the AI tutor', desc: '24/7 homework help and gentle hints that guide kids to the answer — never just give it away.', bg: 'from-amber-100 to-amber-50' },
//   { emoji: '🏆', title: 'Rewards that motivate', desc: 'Coins, badges, streaks and avatar unlocks keep kids coming back and growing every day.', bg: 'from-rose-100 to-rose-50' },
// ];

// const TESTIMONIALS = [
//   { who: 'Mrs. K', at: '@artwithmrs_k', text: 'Being able to message Spanish-speaking families instantly is everything. ❤️' },
//   { who: 'Julissa R.', at: '@jd_rowell', text: 'We start every day with a Kidora mindfulness quest. Love it!' },
//   { who: 'Jennifer H.', at: '@jennifermhardin', text: 'Does everyone love Kidora as much as we do? 😍' },
//   { who: 'Katie E.', at: '@katieerb', text: 'Portfolios let kids show their learning to family. Magic.' },
//   { who: 'Mrs. W', at: '@mrswscholars', text: 'Thank you Kidora for giving scholars a voice of their own!' },
// ];

// const STATS = [['45M+', 'Students & parents'], ['190+', 'Languages'], ['1M+', '5-star reviews'], ['100%', 'Free for teachers']];

// export default function Home() {
//   const heroRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     const ctx = gsap.context(() => {
//       gsap.from('[data-hero]', { y: 30, opacity: 0, duration: 0.7, stagger: 0.12, ease: 'back.out(1.4)' });
//       gsap.to('[data-float]', { y: -16, rotation: 6, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.3 });
//     }, heroRef);
//     return () => ctx.revert();
//   }, []);

//   return (
//     <div className="min-h-screen bg-brand-50 font-body text-brand-900 overflow-x-hidden">
//       <Navbar />

//       {/* HERO */}
//       <section ref={heroRef} className="relative max-w-[1240px] mx-auto px-6 pt-14 pb-10 grid md:grid-cols-2 gap-8 items-center">
//         {/* floating shapes */}
//         <div data-float className="pointer-events-none absolute top-6 left-[6%] text-5xl opacity-80">⭐</div>
//         <div data-float className="pointer-events-none absolute top-24 right-[8%] text-5xl opacity-80">🎈</div>
//         <div data-float className="pointer-events-none absolute bottom-8 left-[20%] text-4xl opacity-80">✏️</div>

//         <div>
//           <div data-hero className="inline-block bg-brand-100 text-brand-700 font-display font-extrabold text-sm px-4 py-1.5 rounded-full mb-4">🐵 Welcome to Kidora</div>
//           <h1 data-hero className="font-display font-extrabold text-brand-900 leading-[1.02]" style={{ fontSize: 'clamp(40px,6vw,68px)' }}>Where learning feels like play!</h1>
//           <p data-hero className="font-bold text-brand-600 text-xl mt-4 max-w-lg">Animated lessons, interactive games and quizzes across Math, Reading, Science &amp; Coding. Loved by 45 million families.</p>
//           <div data-hero className="flex gap-4 mt-8 flex-wrap">
//             <Link href="/register?role=CHILD"><Button size="lg">Start Learning →</Button></Link>
//             <Link href="/kid/learn"><Button size="lg" variant="outline">🗺️ Explore Worlds</Button></Link>
//           </div>
//         </div>

//         <div data-hero className="relative">
//           <div className="rounded-[40px] bg-gradient-to-br from-brand-600 via-brand-700 to-grass-600 p-10 text-center text-white shadow-card">
//             <div data-float className="text-[150px] leading-none">🐵</div>
//             <p className="font-display font-extrabold text-2xl">Meet Momo!</p>
//             <p className="font-bold opacity-90">Your learning buddy</p>
//           </div>
//         </div>
//       </section>

//       {/* SUBJECTS */}
//       <section className="max-w-[1240px] mx-auto px-6 py-10">
//         <h2 className="font-display font-extrabold text-3xl text-center mb-8">Pick your adventure 🚀</h2>
//         <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
//           {SUBJECTS.map((s, i) => (
//             <Link key={s.slug} href="/courses" className="bg-white rounded-3xl border-2 border-brand-100 p-7 shadow-card text-center transition-transform hover:-translate-y-2 hover:scale-[1.02] animate-[fadeup_.5s_both]" style={{ animationDelay: i * 0.07 + 's' }}>
//               <div className="text-5xl mb-3">{s.emoji}</div>
//               <div className="font-display font-extrabold text-lg" style={{ color: s.accent }}>{s.name}</div>
//               <div className="font-bold text-brand-400 text-sm mt-1">Lessons · Games · Quizzes</div>
//             </Link>
//           ))}
//         </div>
//       </section>

//       {/* FEATURE ROWS */}
//       <section className="max-w-[1040px] mx-auto px-6 py-8 flex flex-col gap-6">
//         {FEATURES.map((ft, i) => (
//           <div key={ft.title} className={'grid md:grid-cols-2 gap-6 items-center rounded-[32px] bg-gradient-to-br ' + ft.bg + ' p-8 shadow-card animate-[fadeup_.5s_both]'} style={{ animationDelay: i * 0.06 + 's' }}>
//             <div className={i % 2 ? 'md:order-2' : ''}>
//               <div className="text-5xl mb-3">{ft.emoji}</div>
//               <h3 className="font-display font-extrabold text-2xl">{ft.title}</h3>
//               <p className="font-bold text-brand-600 mt-2">{ft.desc}</p>
//             </div>
//             <div className={'bg-white/70 rounded-3xl h-44 grid place-items-center text-7xl ' + (i % 2 ? 'md:order-1' : '')}>{ft.emoji}</div>
//           </div>
//         ))}
//       </section>

//       {/* STATS */}
//       <section className="max-w-[1240px] mx-auto px-6 py-8">
//         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
//           {STATS.map((s) => (
//             <div key={s[1]} className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 text-white p-6 text-center">
//               <div className="font-display font-extrabold text-4xl">{s[0]}</div>
//               <div className="font-bold opacity-90 text-sm mt-1">{s[1]}</div>
//             </div>
//           ))}
//         </div>
//       </section>

//       {/* TESTIMONIAL MARQUEE */}
//       <section className="py-12 overflow-hidden">
//         <h2 className="font-display font-extrabold text-3xl text-center mb-8">Our community is our superpower 💜</h2>
//         <div className="relative">
//           <div className="flex gap-5 w-max animate-[marquee_32s_linear_infinite] hover:[animation-play-state:paused]">
//             {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
//               <div key={i} className="w-[320px] shrink-0 bg-white rounded-3xl border-2 border-brand-100 p-6 shadow-card">
//                 <p className="font-bold text-brand-800">&ldquo;{t.text}&rdquo;</p>
//                 <div className="flex items-center gap-2 mt-4">
//                   <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-grass-500 grid place-items-center text-white font-display font-extrabold text-sm">{t.who[0]}</div>
//                   <div><div className="font-display font-extrabold text-sm">{t.who}</div><div className="font-bold text-brand-400 text-xs">{t.at}</div></div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* CTA */}
//       <section className="max-w-[1240px] mx-auto px-6 pb-14">
//         <div className="rounded-[36px] bg-gradient-to-br from-brand-600 to-grass-600 text-white p-12 text-center">
//           <div className="text-6xl mb-3 animate-bob">🎓</div>
//           <h2 className="font-display font-extrabold text-4xl">Let&rsquo;s get growing</h2>
//           <p className="font-bold opacity-90 mt-2 mb-6">Free for teachers, forever. Family plans start free too.</p>
//           <div className="flex gap-3 justify-center flex-wrap">
//             <Link href="/register?role=CHILD"><Button size="lg" variant="grass">Get started</Button></Link>
//             <Link href="/plus"><Button size="lg" variant="outline" className="!text-white !border-white/60 !bg-white/10">See Kidora Plus</Button></Link>
//           </div>
//         </div>
//       </section>

//       <Footer />
//         </div>
//   );
// }




'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Navbar } from '@/components/navbar/Navbar';
import Image from "next/image";

const ROLES = [
  { emoji: '\uD83E\uDDD1\u200D\uD83C\uDFEB', label: 'Teacher', role: 'TEACHER' },
  { emoji: '\uD83D\uDC6A', label: 'Parent', role: 'PARENT' },
  { emoji: '\uD83E\uDDD2', label: 'Student', role: 'CHILD' },
  { emoji: '\uD83C\uDFEB', label: 'School Leader', role: 'LEADER' },
  { emoji: '\uD83D\uDDFA\uFE0F', label: 'District Leader', role: 'DISTRICT' },
];


const images = [
  "/images/child1.jpg",
  "/images/child2.jpg",
  "/images/child3.jpg",
  "/images/child4.jpg",
  "/images/child5.jpg",
  "/images/child6.jpg",
  "/images/child7.jpg",
  "/images/child1.jpg",
  "/images/child1.jpg",
  
];

const TESTIMONIALS = [
  {
    text: "My daughter loves learning every day!",
    who: "Sarah Johnson",
    at: "Parent",
    image: "/images/users/user1.jpg",
  },
  {
    text: "This platform makes teaching so much easier.",
    who: "Michael Brown",
    at: "Teacher",
    image: "/images/users/user2.jpg",
  },
  {
    text: "The games keep my son engaged for hours.",
    who: "Emily Davis",
    at: "Parent",
    image: "/images/users/user3.jpg",
  },
  {
    text: "Amazing experience for our students.",
    who: "David Wilson",
    at: "School Leader",
    image: "/images/users/user4.jpg",
  },
];

const FEATURES = [
  {
    title: "Interactive Learning",
    desc: "...",
    emoji: "🎮",
    image: images[0],
  },
  {
    title: "Track Progress",
    desc: "...",
    emoji: "📈",
    image: images[1],
  },
  {
    title: "Safe Learning",
    desc: "...",
    emoji: "🛡️",
    image: images[2],
  },
  {
    title: "Rewards",
    desc: "...",
    emoji: "🏆",
    image: images[3],
  },
];

function splitChars(el: HTMLElement) {
  const words = (el.textContent || '').split(' ');
  el.textContent = '';
  words.forEach((w, wi) => {
    const wspan = document.createElement('span');
    wspan.style.cssText = 'display:inline-block;white-space:nowrap';
    Array.from(w).forEach((ch) => {
      const s = document.createElement('span');
      s.textContent = ch;
      s.dataset.char = '1';
      s.style.display = 'inline-block';
      wspan.appendChild(s);
    });
    el.appendChild(wspan);
    if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
  });
}

function splitWords(el: HTMLElement) {
  const words = (el.textContent || '').split(' ');
  el.innerHTML = '';
  words.forEach((w, i) => {
    const s = document.createElement('span');
    s.textContent = w + (i < words.length - 1 ? '\u00A0' : '');
    s.style.display = 'inline-block';
    el.appendChild(s);
  });
}

export default function Home() {
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      // Hero headline: bouncy char-by-char text effect
      document.querySelectorAll<HTMLElement>('[data-split-chars]').forEach(splitChars);
      gsap.from('[data-char]', { y: 70, opacity: 0, rotation: 10, duration: 0.7, stagger: 0.035, ease: 'back.out(1.7)', delay: 0.1 });
      gsap.from('[data-hero]', { y: 30, opacity: 0, duration: 0.7, stagger: 0.14, ease: 'back.out(1.4)', delay: 0.4 });
      gsap.from('[data-role-badge]', { scale: 0, opacity: 0, duration: 0.55, stagger: 0.08, ease: 'back.out(2)', delay: 0.7 });
      gsap.to('[data-float]', { y: -14, rotation: 6, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.3 });

      // Photo strips: slow opposing drift
      gsap.to('[data-strip="1"]', { xPercent: -14, duration: 26, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      gsap.fromTo('[data-strip="2"]', { xPercent: -14 }, { xPercent: 0, duration: 26, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      gsap.to('[data-strip="3"]', { xPercent: -18, duration: 40, yoyo: true, repeat: -1, ease: 'sine.inOut' });

      // Section headings: word-by-word reveal on scroll
      document.querySelectorAll<HTMLElement>('[data-split-words]').forEach((el) => {
        splitWords(el);
        gsap.from(el.children, {
          scrollTrigger: { trigger: el, start: 'top 85%' },
          y: 44, opacity: 0, scale: 0.8, duration: 0.6, stagger: 0.07, ease: 'back.out(2)',
        });
      });

      // Feature rows: slide from alternating sides
      document.querySelectorAll<HTMLElement>('[data-feature]').forEach((el, i) => {
        const kids = el.children;
        gsap.from(kids[0], { scrollTrigger: { trigger: el, start: 'top 80%' }, x: i % 2 ? 90 : -90, opacity: 0, duration: 0.9, ease: 'power3.out' });
        gsap.from(kids[1], { scrollTrigger: { trigger: el, start: 'top 80%' }, x: i % 2 ? -90 : 90, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.1 });
      });

      gsap.from('[data-cta]', { scrollTrigger: { trigger: '[data-cta]', start: 'top 80%' }, scale: 0.94, opacity: 0, duration: 0.9, ease: 'back.out(1.3)' });
      gsap.from('[data-privacy]', { scrollTrigger: { trigger: '[data-privacy]', start: 'top 85%' }, y: 50, opacity: 0, duration: 0.8, ease: 'power3.out' });
      gsap.from('[data-grow]', { scrollTrigger: { trigger: '[data-grow]', start: 'top 85%' }, scale: 0.9, opacity: 0, duration: 0.8, ease: 'back.out(1.6)' });
    }, pageRef);
    return () => ctx.revert();
  }, []);

  const strip = (key: string) => (
    <div data-strip={key} className="flex gap-4 w-max pl-2">
  {images.map((src, i) => (
    <div
      key={i}
      className="relative w-[240px] h-[180px] rounded-3xl overflow-hidden border-2 border-brand-100"
    >
      <Image
        src={src}
        alt={`child ${i + 1}`}
        fill
        className="object-cover"
      />
    </div>
  ))}
</div>
  );

  return (
    <div ref={pageRef} className="min-h-screen bg-white font-body text-brand-900 overflow-x-hidden">
      <Navbar />

      {/* HERO */}
      <section className="relative max-w-[920px] mx-auto px-6 pt-18 pb-10 text-center pt-[72px]">
        <div data-float className="pointer-events-none absolute top-10 -left-10 text-5xl opacity-90">{'\u2B50'}</div>
        <div data-float className="pointer-events-none absolute top-28 -right-8 text-5xl opacity-90">{'\uD83C\uDF88'}</div>
        <h1 data-split-chars className="font-display font-extrabold text-brand-900 leading-[1.04]" style={{ fontSize: 'clamp(44px,6vw,76px)' }}>
          Where learning feels like play
        </h1>
        <p data-hero className="font-extrabold text-brand-600 text-[21px] mt-5 max-w-[560px] mx-auto">
          Loved by more than 45 million students and parents.<br />Free for teachers, forever.
        </p>
        <p data-hero className="font-display font-extrabold text-xl text-brand-900 mt-11 mb-4">Get started as a...</p>
        <div data-hero className="flex gap-5 justify-center flex-wrap">
          {ROLES.map((r) => (
            <Link key={r.role} href={'/register?role=' + r.role} data-role-badge className="flex flex-col items-center gap-2.5 w-[104px] hover:-translate-y-1.5 transition-transform">
              <div className="w-[88px] h-[88px] rounded-full bg-brand-100 border-[3px] border-brand-100 grid place-items-center text-4xl shadow-card">{r.emoji}</div>
              <span className="font-black text-sm text-brand-900">{r.label}</span>
            </Link>
          ))}
        </div>
        <div data-hero className="mt-9 flex flex-col items-center gap-3.5">
          <Link href="/register" className="bg-brand-600 hover:-translate-y-0.5 transition-transform text-white font-display font-extrabold text-[19px] px-11 py-4 rounded-full shadow-btn">Sign up</Link>
          <div className="font-extrabold text-brand-400 text-[15px]"><span className="text-brand-500">{'\u2605\u2605\u2605\u2605\u2605'}</span> 1 million+ 5-star reviews</div>
        </div>
      </section>

      {/* PHOTO STRIPS */}
      <section className="py-12 overflow-hidden">
        {strip('1')}
        <h2 data-split-words className="font-display font-extrabold text-center my-10 max-w-[760px] mx-auto px-6" style={{ fontSize: 'clamp(30px,4vw,44px)' }}>
          Keeping kids, parents and teachers connected
        </h2>
        {strip('2')}
      </section>

      {/* FEATURES */}
     <section
      id="features"
      className="max-w-[1120px] mx-auto px-6 py-14 flex flex-col gap-[72px] "
    >
      {FEATURES.map((ft, i) => (
        <div
          key={ft.title}
          data-feature
          className="grid md:grid-cols-2 gap-14 items-center"
        >
          {/* Image */}
          <div className={`relative ${i % 2 ? "md:order-2" : ""}`}>
            <div className="relative h-[340px] w-full overflow-hidden rounded-[32px] bg-gradient-to-br from-brand-100 to-brand-50 shadow-card">
              <Image
                src={ft.image}
                alt={ft.title}
                fill
                priority={i === 0}
                className="object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>

            {/* Floating Emoji */}
            <div
              data-float
              className="absolute -top-4 right-4 bg-white border-[3px] border-brand-100 rounded-2xl px-3.5 py-2 text-[26px] shadow-card pointer-events-none"
            >
              {ft.emoji}
            </div>
          </div>

          {/* Text */}
          <div className={i % 2 ? "md:order-1" : ""}>
            <h3 className="font-display font-extrabold text-[32px] text-brand-900">
              {ft.title}
            </h3>

            <p className="mt-4 text-lg leading-relaxed text-brand-600">
              {ft.desc}
            </p>
          </div>
        </div>
      ))}
    </section>

      {/* ADVENTURE BANNER */}
      <section id="adventure" className="py-6">
        <div data-cta className="relative bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 text-white py-24 px-6 text-center overflow-hidden">
          <div data-float className="absolute top-9 left-[8%] text-[52px] opacity-90">{'\uD83C\uDFDD\uFE0F'}</div>
          <div data-float className="absolute bottom-11 right-[9%] text-[52px] opacity-90">{'\uD83D\uDE80'}</div>
          <div className="text-7xl animate-bob inline-block">{'\uD83D\uDC35'}</div>
          <h2 data-split-words className="font-display font-extrabold mt-3 mb-2.5" style={{ fontSize: 'clamp(34px,4.6vw,54px)' }}>A world of adventure awaits</h2>
          <p className="font-extrabold opacity-90 text-[19px] mb-7">Explore Kidora Worlds \u2014 playful islands of Math, Reading, Science and Coding.</p>
          <Link href="/kid/learn" className="bg-white text-brand-800 hover:-translate-y-0.5 transition-transform font-display font-extrabold text-lg px-9 py-4 rounded-full inline-block">Learn more</Link>
        </div>
      </section>

      {/* COMMUNITY */}
<section id="community" className="overflow-hidden py-[72px]">
  <h2
    data-split-words
    className="font-display font-extrabold text-center mb-10"
    style={{ fontSize: "clamp(30px,4vw,44px)" }}
  >
    Our community is our superpower 💜
  </h2>

  <div data-strip="3" className="flex flex-wrap justify-center  gap-5 items-stretch max-w-7xl mx-auto">
    {TESTIMONIALS.map((t, i) => (
      <div
        key={i}
        className="w-[300px] shrink-0 bg-white rounded-[26px] border-2 border-brand-100 p-6 shadow-card hover:shadow-xl transition-all duration-300 flex flex-col justify-between gap-5"
      >
        {/* User */}
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-brand-200">
            <Image
              src={t.image}
              alt={t.who}
              fill
              className="object-cover"
            />
          </div>

          <div>
            <h4 className="font-display font-extrabold text-brand-900">
              {t.who}
            </h4>
            <p className="text-sm text-brand-500">{t.at}</p>
          </div>
        </div>

        {/* Review */}
        <p className="text-brand-800 font-medium leading-relaxed">
          "{t.text}"
        </p>

        {/* Stars */}
        <div className="flex text-yellow-400 text-xl">
          ⭐⭐⭐⭐⭐
        </div>
      </div>
    ))}
  </div>

  <div className="text-center mt-10">
    <Link
      href="/wall-of-love"
      className="inline-block rounded-full border-[3px] border-brand-200 bg-white px-8 py-3 font-display font-extrabold text-[17px] text-brand-700 transition-colors hover:border-brand-400"
    >
      See more smiles
    </Link>
  </div>
</section>

      {/* PRIVACY */}
      <section className="bg-brand-50 py-18 px-6 text-center py-[72px]">
        <div data-privacy className="max-w-[640px] mx-auto">
          <div className="text-[52px] mb-3">{'\uD83D\uDEE1\uFE0F'}</div>
          <h2 className="font-display font-extrabold text-4xl text-brand-900">Privacy first \u2014 always</h2>
          <p className="font-extrabold text-brand-600 text-lg mt-3.5 mb-6">Find out how we protect our community of kids, families and teachers.</p>
          <Link href="/privacy" className="bg-brand-600 text-white font-display font-extrabold text-[17px] px-8 py-3.5 rounded-full shadow-btn inline-block hover:-translate-y-0.5 transition-transform">Kidora Privacy Center</Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center">
        <div data-grow>
          <div className="text-6xl animate-bob inline-block">{'\uD83C\uDF31'}</div>
          <h2 data-split-words className="font-display font-extrabold text-brand-900 mt-2 mb-7" style={{ fontSize: 'clamp(36px,5vw,56px)' }}>Let{"'"}s get growing</h2>
          <Link href="/register" className="bg-brand-600 text-white font-display font-extrabold text-[19px] px-11 py-4 rounded-full shadow-btn inline-block hover:-translate-y-0.5 transition-transform">Get started</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-brand-950 text-brand-200 px-6 pt-14 pb-8">
        <div className="max-w-[1280px] mx-auto grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-[38px] h-[38px] rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-xl">{'\uD83D\uDC35'}</div>
              <span className="font-display font-extrabold text-[22px] text-white">Kidora</span>
            </div>
            <p className="font-bold opacity-80 max-w-[280px]">Our mission is to give every child an education they love.</p>
          </div>
          {[
            { h: 'Company', links: ['About us', 'Press', 'Careers', 'Accessibility'] },
            { h: 'Learn', links: ['Math', 'Reading', 'Science', 'Coding', 'Kidora Plus'] },
            { h: 'Support', links: ['Help Center', 'Contact', 'Privacy & Security', 'Terms of Service'] },
            { h: 'Community', links: ['Teacher Community', 'Wall of Love', 'Find a tutor'] },
          ].map((col) => (
            <div key={col.h} className="flex flex-col gap-2.5">
              <div className="font-display font-extrabold text-white">{col.h}</div>
              {col.links.map((l) => (
                <Link key={l} href="#" className="text-brand-300 font-bold hover:text-white transition-colors">{l}</Link>
              ))}
            </div>
          ))}
        </div>
        <div className="max-w-[1280px] mx-auto mt-9 border-t border-brand-300/25 pt-5 flex justify-between flex-wrap gap-3 font-bold opacity-70 text-sm">
          <span>{'\u00A9'} 2026 Kidora, Inc.</span>
          <span>Terms {'\u00B7'} Privacy {'\u00B7'} Cookie Settings</span>
        </div>
      </footer>
    </div>
  );
}
