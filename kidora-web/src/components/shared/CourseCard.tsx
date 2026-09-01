import Link from 'next/link';
import type { LmsCourse } from '@/types';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from './ProgressBar';

/**
 * One course tile. `tone="game"` is the student-facing look; `tone="staff"` is
 * the calmer card used in the teacher and school libraries.
 */
export function CourseCard({
  course,
  href,
  tone = 'game',
  footer,
}: {
  course: LmsCourse & { progress?: number; completed?: boolean };
  href: string;
  tone?: 'game' | 'staff';
  footer?: React.ReactNode;
}) {
  const lessons = course._count?.lessons ?? course.lessons?.length ?? 0;

  return (
    <article className="group overflow-hidden rounded-3xl border-2 border-brand-100 bg-white shadow-card motion-safe:transition-transform motion-safe:hover:-translate-y-1 focus-within:ring-2 focus-within:ring-brand-400">
      <div
        className="relative grid h-28 place-items-center bg-cover bg-center text-4xl"
        style={
          course.thumbnailUrl
            ? { backgroundImage: `url(${course.thumbnailUrl})` }
            : { background: `linear-gradient(135deg, ${course.accent ?? '#A78BFA'}, #7C3AED)` }
        }
      >
        {!course.thumbnailUrl && <span aria-hidden>{tone === 'game' ? '🗺️' : '📘'}</span>}
        {course.completed && (
          <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 font-body-x text-[11px] text-grass-700">
            ✓ Complete
          </span>
        )}
        {tone === 'staff' && !course.published && (
          <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 font-body-x text-[11px] text-amber-700">
            Draft
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="flex flex-wrap gap-1.5">
          {course.subject?.name && <Badge>{course.subject.name}</Badge>}
          {course.grade?.name && <Badge tone="grass">{course.grade.name}</Badge>}
        </div>

        <h3 className="mt-2 font-display text-lg font-extrabold text-brand-900">
          <Link href={href} className="outline-none after:absolute after:inset-0 focus-visible:underline">
            {course.title}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 font-body text-sm font-bold text-brand-500">{course.description}</p>
        <p className="mt-1 font-body-x text-[12px] text-brand-400">
          {lessons} {lessons === 1 ? 'lesson' : 'lessons'}
          {course.ageBand ? ` · Ages ${course.ageBand}` : ''}
        </p>

        {typeof course.progress === 'number' && course.progress > 0 && (
          <ProgressBar
            className="mt-3"
            value={course.progress}
            label={`${course.title} progress`}
            tone={course.completed ? 'grass' : 'brand'}
          />
        )}

        {footer && <div className="mt-3">{footer}</div>}
      </div>
    </article>
  );
}
