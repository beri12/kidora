'use client';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useMyCourses } from '@/features/courses/hooks';
import { Button } from '@/components/ui/button';

export default function TeacherCourses() {
  useRequireAuth(['TEACHER']);
  const { data: courses, isLoading, isError } = useMyCourses();

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-brand-900">My courses</h1>
          <p className="font-body font-bold text-brand-600 mt-1">
            {courses ? `${courses.length} course${courses.length === 1 ? '' : 's'}` : 'Everything you\'ve created so far'}
          </p>
        </div>
        <Link href="/dashboard/teacher/upload">
          <Button>+ New course</Button>
        </Link>
      </div>

      {isLoading && (
        <div className="bg-white rounded-3xl border-2 border-brand-100 p-10 text-center font-body font-bold text-brand-500 shadow-card">
          Loading your courses…
        </div>
      )}

      {isError && (
        <div className="bg-white rounded-3xl border-2 border-red-100 p-10 text-center font-body font-bold text-red-600 shadow-card">
          Could not load your courses, please try again.
        </div>
      )}

      {!isLoading && !isError && courses?.length === 0 && (
        <div className="bg-white rounded-3xl border-2 border-brand-100 p-10 text-center shadow-card">
          <div className="text-4xl mb-3">📚</div>
          <p className="font-display font-extrabold text-xl text-brand-900">No courses yet</p>
          <p className="font-body font-bold text-brand-500 mt-1 mb-5">Create your first course to get started.</p>
          <Link href="/dashboard/teacher/upload">
            <Button variant="grass">⬆️ Create a course</Button>
          </Link>
        </div>
      )}

      {!isLoading && !isError && courses && courses.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((c: any) => (
            <div key={c.id} className="bg-white rounded-3xl border-2 border-brand-100 p-5 shadow-card flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-display font-extrabold text-lg text-brand-900 leading-tight">{c.title}</h3>
                {c.isPremium && (
                  <span className="shrink-0 text-[10px] font-display font-extrabold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                    PREMIUM
                  </span>
                )}
              </div>

              <p className="font-body font-bold text-brand-500 text-sm mb-3">
                {c.subject?.name ?? 'No subject'} · Ages {c.ageBand}
              </p>

              {c.description && (
                <p className="font-body text-brand-600 text-sm mb-4 line-clamp-2">{c.description}</p>
              )}

              <div className="mt-auto flex items-center justify-between pt-3 border-t border-brand-100">
                <span
                  className={
                    'text-xs font-display font-extrabold px-2.5 py-1 rounded-full ' +
                    (c.published ? 'bg-grass-100 text-grass-700' : 'bg-brand-100 text-brand-600')
                  }
                >
                  {c.published ? 'Published' : 'Draft'}
                </span>
                <span className="text-xs font-body-x text-brand-400">
                  {c._count?.lessons ?? 0} lesson{c._count?.lessons === 1 ? '' : 's'}
                </span>
              </div>

              <Link
                href={`/courses/${c.slug}`}
                className="mt-3 text-center text-sm font-display font-extrabold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl py-2 transition-colors"
              >
                View course
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}