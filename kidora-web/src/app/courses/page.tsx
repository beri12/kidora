'use client';
import Link from 'next/link';
import { Navbar } from '@/components/navbar/Navbar';
import { useCourses } from '@/features/courses/hooks';
import { useAuthStore } from '@/stores/auth.store';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Courses catalog. Premium courses are locked until the user subscribes;
// once subscribed, the ones matching their plan become available.
export default function CoursesPage() {
  const { data: courses = [], isLoading } = useCourses();
  const hasPlan = useAuthStore((s) => s.hasPlan());

  return (
    <div className="min-h-screen bg-brand-50">
      <Navbar />
      <div className="max-w-[1240px] mx-auto px-6 py-10">
        <h1 className="font-display font-extrabold text-3xl text-brand-900">Explore courses</h1>
        <p className="font-body font-bold text-brand-600 mt-1 mb-6">Pick one and dive in!</p>
        {isLoading ? (
          <div className="font-display text-brand-500">Loading courses…</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((c) => {
              const locked = c.isPremium && !hasPlan;
              return (
                <Card key={c.id} className="overflow-hidden hover:-translate-y-1 transition-transform">
                  <div
                    className="h-28 grid place-items-center text-4xl relative bg-cover bg-center"
                    style={
                      c.thumbnailUrl
                        ? { backgroundImage: `url(${c.thumbnailUrl})` }
                        : { background: 'linear-gradient(135deg,#A78BFA,#7C3AED)' }
                    }
                  >
                    {!c.thumbnailUrl && '📘'}
                    {locked && (
                      <span className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-1 text-xs font-body-x text-brand-700">
                        🔒 Premium
                      </span>
                    )}
                  </div>
                  <CardBody>
                    <Badge>{c.subject?.name ?? 'Course'}</Badge>
                    <CardTitle className="mt-2">{c.title}</CardTitle>
                    <p className="font-body font-bold text-brand-500 text-sm mt-1">
                      {c._count?.lessons ?? 0} lessons · {c.ageBand}
                    </p>
                    {locked ? (
                      <Link href="/pricing" className="mt-3 inline-block font-display font-extrabold text-sm text-brand-700">
                        Unlock with a plan →
                      </Link>
                    ) : (
                      <Link href={`/courses/${c.id}/learn`} className="mt-3 inline-block font-display font-extrabold text-sm text-grass-600">
                        Start →
                      </Link>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}