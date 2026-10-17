'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Clock, GraduationCap, Languages, Lock, PlayCircle, UserRound } from 'lucide-react';
import { Navbar } from '@/components/navbar/Navbar';
import { useCourses, useEnroll } from '@/features/courses/hooks';
import { useAuthStore } from '@/stores/auth.store';
import { usePremiumAccess } from '@/features/pricing/usePremiumAccess';
import { API_ORIGIN } from '@/lib/api/client';
import { apiErrorMessage } from '@/lib/api-error';
import { authHref, AUTH } from '@/features/auth/routes';
import type { Course } from '@/types';

/** Uploaded thumbnails are stored as "/uploads/…" on the API, not on this site. */
function mediaUrl(url?: string | null) {
  if (!url) return null;
  return /^https?:\/\//.test(url) ? url : `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Lessons, or the lectures of a course built in the upload wizard. */
function lessonCount(c: Course) {
  const lectures = ((c.sections ?? []) as unknown as { _count?: { lectures?: number } }[])
    .reduce((n, s) => n + (s._count?.lectures ?? 0), 0);
  return Math.max(c._count?.lessons ?? 0, lectures);
}

/**
 * Explore courses. Public: anyone can browse what teachers have published,
 * with the thumbnail, description and details. "Start course" opens it for
 * a signed-in member (a student is enrolled first); a visitor is sent to log
 * in and comes straight back to start that course.
 */
export default function CoursesPage() {
  return (
    <Suspense>
      <Explore />
    </Suspense>
  );
}

function Explore() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: courses = [], isLoading, isError } = useCourses();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const hasPlan = usePremiumAccess();
  const enroll = useEnroll();
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);
  const resumed = useRef(false);

  async function start(c: Course) {
    setError(null);
    const learn = `/courses/${c.id}/learn`;
    if (!user) {
      // Back here after logging in, and the course starts by itself.
      router.push(authHref(AUTH.login, { next: `/courses?start=${c.id}` }));
      return;
    }
    if (c.isPremium && !hasPlan) { router.push('/pricing'); return; }
    if (user.role !== 'CHILD') { router.push(learn); return; }
    setStarting(c.id);
    try {
      // Enrolling puts the course on the student's dashboard; already
      // enrolled is fine too.
      await enroll.mutateAsync(c.id);
      router.push(learn);
    } catch (e) {
      const message = apiErrorMessage(e, "We couldn't start this course.");
      if (/already/i.test(message)) { router.push(learn); return; }
      setError({ id: c.id, message });
      setStarting(null);
    }
  }

  // Returning from log in with ?start=<id>: start that course once.
  const startId = params.get('start');
  useEffect(() => {
    if (resumed.current || !startId || !hydrated || !user || !courses.length) return;
    const c = courses.find((x) => x.id === startId);
    if (!c) return;
    resumed.current = true;
    router.replace('/courses');
    void start(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startId, hydrated, user, courses]);

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold text-brand-900">Explore courses</h1>
        <p className="mb-6 mt-1 font-body font-bold text-brand-600">
          Courses made by Kidora teachers. Pick one and start learning!
        </p>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy>
            {[0, 1, 2].map((i) => <div key={i} className="h-[420px] animate-pulse rounded-3xl bg-white/70" />)}
          </div>
        ) : isError ? (
          <p className="rounded-2xl bg-white p-6 font-body font-bold text-coral-600">We couldn&apos;t load the courses. Please try again in a moment.</p>
        ) : courses.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 font-body font-bold text-brand-600">No courses are published yet. Check back soon!</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                locked={Boolean(c.isPremium) && !hasPlan}
                signedIn={Boolean(user)}
                busy={starting === c.id}
                error={error?.id === c.id ? error.message : null}
                onStart={() => start(c)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CourseCard({ course: c, locked, signedIn, busy, error, onStart }: {
  course: Course; locked: boolean; signedIn: boolean; busy: boolean; error: string | null; onStart: () => void;
}) {
  const thumb = mediaUrl(c.thumbnailUrl);
  const lessons = lessonCount(c);
  const details = [
    { icon: BookOpen, text: `${lessons} ${lessons === 1 ? 'lesson' : 'lessons'}` },
    c.ageBand && { icon: GraduationCap, text: `Ages ${c.ageBand}` },
    c.duration && { icon: Clock, text: c.duration },
    c.language && { icon: Languages, text: c.language },
    c.teacher?.name && { icon: UserRound, text: c.teacher.name },
  ].filter(Boolean) as { icon: typeof BookOpen; text: string }[];

  return (
    <article className="flex flex-col overflow-hidden rounded-3xl border-2 border-brand-100 bg-white shadow-card transition-transform hover:-translate-y-1">
      <div className="relative aspect-video bg-gradient-to-br from-violet-400 to-violet-700">
        {thumb ? (
          // Teacher uploads live on the API host, so next/image's optimiser
          // (which needs every host configured) is not used here.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-5xl" aria-hidden>📘</div>
        )}
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 font-body text-xs font-extrabold ${c.isPremium ? 'bg-amber-100 text-amber-800' : 'bg-white/90 text-grass-700'}`}>
          {c.isPremium ? (locked ? '🔒 Premium' : '⭐ Premium') : 'Free'}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {c.subject?.name && (
          <span className="self-start rounded-full bg-brand-100 px-2.5 py-0.5 font-body text-xs font-extrabold text-brand-700">{c.subject.name}</span>
        )}
        <h2 className="mt-2 font-display text-xl font-extrabold leading-snug text-brand-900">{c.title}</h2>
        {c.description && (
          <p className="mt-2 line-clamp-3 font-body text-sm font-semibold text-slate-600">{c.description}</p>
        )}
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {details.map(({ icon: Icon, text }) => (
            <li key={text} className="inline-flex items-center gap-1.5 font-body text-xs font-bold text-slate-500">
              <Icon className="h-3.5 w-3.5" aria-hidden /> {text}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-5">
          <button
            type="button"
            onClick={onStart}
            disabled={busy}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-grass-600 px-4 font-display font-extrabold text-white transition hover:bg-grass-700 disabled:opacity-60"
          >
            {locked && signedIn ? <Lock className="h-4 w-4" aria-hidden /> : <PlayCircle className="h-5 w-5" aria-hidden />}
            {busy ? 'Starting…' : locked && signedIn ? 'Unlock with a plan' : 'Start course'}
          </button>
          {!signedIn && <p className="mt-2 text-center font-body text-xs font-semibold text-slate-400">You&apos;ll log in first, then the course opens.</p>}
          {error && <p role="alert" className="mt-2 text-center font-body text-xs font-bold text-coral-600">{error}</p>}
        </div>
      </div>
    </article>
  );
}
