'use client';
import { use } from 'react';
import Link from 'next/link';
import { useCourseLearnerView } from '@/features/lms/hooks';
import { useCertificateEligibility } from '@/features/certificates/hooks';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { ErrorState, LoadingState, EmptyState } from '@/components/ui/states';
import { Badge } from '@/components/ui/badge';

const LESSON_ICON: Record<string, string> = {
  VIDEO: '🎬',
  ARTICLE: '📖',
  INTERACTIVE: '🕹️',
  GAME: '🎮',
  AUDIO: '🎧',
  QUIZ: '❓',
  RESOURCE: '📎',
};

export default function CourseAdventurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: course, isLoading, isError, refetch } = useCourseLearnerView(id);
  const eligibility = useCertificateEligibility(id);

  if (isLoading) return <LoadingState rows={5} label="Loading the adventure" />;
  if (isError || !course) return <ErrorState onRetry={() => refetch()} />;

  const done = new Set(course.completedLessonIds);
  const sections = course.sections ?? [];

  return (
    <div className="space-y-7">
      <Link href="/learn" className="font-display font-extrabold text-brand-600 focus:outline-none focus-visible:underline">
        ← Back to the map
      </Link>

      <header className="rounded-[28px] bg-gradient-to-br from-brand-700 to-brand-500 p-7 text-white shadow-card">
        <div className="flex flex-wrap gap-1.5">
          {course.subject?.name && <Badge tone="sun">{course.subject.name}</Badge>}
          {course.grade?.name && <Badge tone="grass">{course.grade.name}</Badge>}
        </div>
        <h1 className="mt-2 font-display text-4xl font-extrabold leading-tight">{course.title}</h1>
        <p className="mt-2 font-body font-bold text-white/90">{course.description}</p>

        <div className="mt-5">
          <div className="mb-1 flex justify-between font-display text-sm font-extrabold">
            <span>Adventure progress</span>
            <span>{course.progressPercent}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={course.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Adventure progress"
            className="h-4 overflow-hidden rounded-full bg-white/25"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 motion-safe:transition-all motion-safe:duration-700"
              style={{ width: `${course.progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {(course.objectives?.length ?? 0) > 0 && (
        <section className="rounded-3xl border-2 border-brand-100 bg-white p-6 shadow-card">
          <h2 className="font-display text-xl font-extrabold text-brand-900">What you will learn</h2>
          <ul className="mt-3 space-y-1.5">
            {course.objectives!.map((objective) => (
              <li key={objective} className="flex gap-2 font-body font-bold text-brand-600">
                <span aria-hidden className="text-grass-500">✓</span>
                {objective}
              </li>
            ))}
          </ul>
        </section>
      )}

      {sections.length === 0 ? (
        <EmptyState icon="🚧" title="This adventure is still being built" description="Check back soon." />
      ) : (
        sections.map((section, si) => (
          <section key={section.id} className="rounded-3xl border-2 border-brand-100 bg-white p-6 shadow-card">
            <h2 className="font-display text-xl font-extrabold text-brand-900">
              <span className="text-brand-400">Chapter {si + 1} ·</span> {section.title}
            </h2>
            {section.description && (
              <p className="mt-1 font-body font-bold text-brand-500">{section.description}</p>
            )}

            <ol className="mt-4 space-y-2.5">
              {section.lessons.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    href={`/learn/lesson/${lesson.id}`}
                    className="flex items-center gap-3 rounded-2xl border-2 border-brand-100 p-3.5 motion-safe:transition-colors hover:border-brand-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400"
                  >
                    <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-xl">
                      {done.has(lesson.id) ? '✅' : LESSON_ICON[lesson.type] ?? '📘'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display font-extrabold text-brand-900">{lesson.title}</span>
                      <span className="block font-body-x text-[12px] text-brand-400">
                        {lesson.estimatedMinutes} min
                        {(lesson.activities?.length ?? 0) > 0 &&
                          ` · ${lesson.activities!.length} ${lesson.activities!.length === 1 ? 'game' : 'games'}`}
                      </span>
                    </span>
                    <span aria-hidden className="font-display font-extrabold text-brand-400">→</span>
                  </Link>
                </li>
              ))}

              {section.quizzes?.map((quiz) => (
                <li key={quiz.id}>
                  <Link
                    href={`/learn/quiz/${quiz.id}`}
                    className="flex items-center gap-3 rounded-2xl border-2 border-amber-200 bg-amber-50 p-3.5 hover:border-amber-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
                  >
                    <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-xl">❓</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display font-extrabold text-amber-800">{quiz.title}</span>
                      <span className="block font-body-x text-[12px] text-amber-600">Pass mark {quiz.passingScore}%</span>
                    </span>
                    <span aria-hidden className="font-display font-extrabold text-amber-500">→</span>
                  </Link>
                </li>
              ))}

              {section.assignments?.map((assignment) => (
                <li key={assignment.id}>
                  <Link
                    href={`/learn/assignment/${assignment.id}`}
                    className="flex items-center gap-3 rounded-2xl border-2 border-sky-200 bg-sky-50 p-3.5 hover:border-sky-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-400"
                  >
                    <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-xl">📝</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display font-extrabold text-sky-800">{assignment.title}</span>
                      <span className="block font-body-x text-[12px] text-sky-600">
                        {assignment.points} points
                        {assignment.dueAt && ` · due ${new Date(assignment.dueAt).toLocaleDateString()}`}
                      </span>
                    </span>
                    <span aria-hidden className="font-display font-extrabold text-sky-500">→</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))
      )}

      {(course.exams?.length ?? 0) > 0 && (
        <section className="rounded-3xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-white p-6 shadow-card">
          <h2 className="font-display text-xl font-extrabold text-rose-700">⚔️ Final challenge</h2>
          <ul className="mt-3 space-y-2">
            {course.exams!.map((exam) => (
              <li key={exam.id}>
                <Link
                  href={`/learn/exam/${exam.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border-2 border-rose-200 bg-white p-3.5 hover:border-rose-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-400"
                >
                  <span className="font-display font-extrabold text-brand-900">{exam.title}</span>
                  <span className="font-body-x text-[12px] text-rose-500">Pass mark {exam.passingScore}% →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {eligibility.data && (
        <section
          className={`rounded-3xl border-2 p-6 shadow-card ${
            eligibility.data.eligible ? 'border-amber-300 bg-amber-50' : 'border-brand-100 bg-white'
          }`}
        >
          <h2 className="font-display text-xl font-extrabold text-brand-900">🎓 Certificate</h2>
          {eligibility.data.eligible ? (
            <p className="mt-1 font-body font-bold text-amber-700">
              You have earned it! Find it in{' '}
              <Link href="/learn/certificates" className="underline">your awards</Link>.
            </p>
          ) : (
            <ul className="mt-3 space-y-1 font-body font-bold text-brand-500">
              <li>
                {eligibility.data.lessonsComplete ? '✅' : '⬜️'} Lessons {eligibility.data.lessonsDone}/
                {eligibility.data.lessonsRequired}
              </li>
              {eligibility.data.quizzesRequired > 0 && (
                <li>{eligibility.data.quizzesPassed ? '✅' : '⬜️'} Pass every quiz</li>
              )}
              {eligibility.data.examRequired && (
                <li>{eligibility.data.examPassed ? '✅' : '⬜️'} Pass the final challenge</li>
              )}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
