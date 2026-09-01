'use client';
import { use, useState } from 'react';
import Link from 'next/link';
import {
  useAddActivity,
  useAddLesson,
  useAddSection,
  useCourseBuilder,
  useDeleteActivity,
  useDeleteLesson,
  useDeleteSection,
  usePublishCourse,
  useReorderSections,
  useUpdateSection,
} from '@/features/lms/hooks';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { SectionEditor } from '@/components/builder/SectionEditor';
import { LessonEditor, type LessonDraft } from '@/components/builder/LessonEditor';
import { ActivityEditor, type ActivityDraft } from '@/components/builder/ActivityEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';

/**
 * The teacher course builder.
 *
 * Course → Section → Lesson → Activity, edited in place. Every mutation posts
 * to the API and refetches the one tree, so what is on screen is always what is
 * saved — there is no local draft that can drift from the server.
 */
export default function CourseBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  useRequireAuth(['TEACHER', 'ADMIN', 'SCHOOL_ADMIN', 'SCHOOL_LEADER']);

  const { data: course, isLoading, isError, refetch } = useCourseBuilder(id);
  const addSection = useAddSection(id);
  const updateSection = useUpdateSection(id);
  const deleteSection = useDeleteSection(id);
  const reorderSections = useReorderSections(id);
  const addLesson = useAddLesson(id);
  const deleteLesson = useDeleteLesson(id);
  const addActivity = useAddActivity(id);
  const deleteActivity = useDeleteActivity(id);
  const publish = usePublishCourse(id);

  const [newSection, setNewSection] = useState('');
  const [lessonFor, setLessonFor] = useState<string | null>(null);
  const [activityFor, setActivityFor] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  if (isLoading) return <LoadingState rows={4} label="Loading course builder" />;
  if (isError || !course) return <ErrorState onRetry={() => refetch()} />;

  const sections = course.sections ?? [];
  const lessonCount = sections.reduce((a, s) => a + s.lessons.length, 0) + (course.lessons?.length ?? 0);

  const move = (index: number, direction: -1 | 1) => {
    const ids = sections.map((s) => s.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderSections.mutate(ids);
  };

  const onPublish = async (next: boolean) => {
    setPublishError(null);
    try {
      await publish.mutateAsync(next);
    } catch (err: any) {
      setPublishError(
        err?.response?.data?.message ??
          'We could not change the publish state. Check the course has at least one lesson.',
      );
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/teacher/courses"
        className="font-display font-extrabold text-brand-600 focus:outline-none focus-visible:underline"
      >
        ← My courses
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border-2 border-brand-100 bg-white p-6 shadow-card">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={course.published ? 'grass' : 'sun'}>{course.published ? 'Published' : 'Draft'}</Badge>
            {course.grade?.name && <Badge>{course.grade.name}</Badge>}
            {course.subject?.name && <Badge>{course.subject.name}</Badge>}
            {course.school?.name && <Badge tone="sky">{course.school.name}</Badge>}
          </div>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-brand-900">{course.title}</h1>
          <p className="mt-1 font-body font-bold text-brand-500">{course.description}</p>
          <p className="mt-1 font-body-x text-[12px] text-brand-400">
            {sections.length} sections · {lessonCount} lessons
          </p>
        </div>

        <div className="flex gap-2">
          <Link href={`/learn/course/${course.id}`}>
            <Button variant="outline">Preview</Button>
          </Link>
          <Button
            variant={course.published ? 'ghost' : 'grass'}
            onClick={() => onPublish(!course.published)}
            disabled={publish.isPending}
          >
            {publish.isPending ? 'Saving…' : course.published ? 'Unpublish' : 'Publish course'}
          </Button>
        </div>
      </header>

      {publishError && (
        <p role="alert" className="rounded-2xl bg-rose-50 p-4 font-body font-bold text-rose-600">
          {publishError}
        </p>
      )}

      {sections.length === 0 && (
        <EmptyState
          icon="🧱"
          title="No sections yet"
          description="A course is built from sections, each holding lessons, activities and a quiz. Add your first section below."
        />
      )}

      {sections.map((section, index) => (
        <SectionEditor
          key={section.id}
          section={section}
          index={index}
          total={sections.length}
          onSave={(patch) => updateSection.mutate({ id: section.id, ...patch })}
          onDelete={() => {
            if (confirm(`Delete "${section.title}"? Its lessons are kept and moved out of the section.`)) {
              deleteSection.mutate(section.id);
            }
          }}
          onMove={(direction) => move(index, direction)}
        >
          <ol className="space-y-3">
            {section.lessons.map((lesson) => (
              <li key={lesson.id} className="rounded-2xl border-2 border-brand-100 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-display font-extrabold text-brand-900">{lesson.title}</h4>
                    <p className="font-body-x text-[12px] text-brand-400">
                      {lesson.type.toLowerCase()} · {lesson.estimatedMinutes} min ·{' '}
                      {lesson.activities?.length ?? 0} activities
                      {!lesson.isRequired && ' · optional'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setActivityFor(activityFor === lesson.id ? null : lesson.id)}
                    >
                      + Activity
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm(`Delete lesson "${lesson.title}"?`)) deleteLesson.mutate(lesson.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {(lesson.activities?.length ?? 0) > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {lesson.activities!.map((activity) => (
                      <li
                        key={activity.id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-brand-50 px-3 py-2"
                      >
                        <span className="font-body font-bold text-brand-700">
                          🧩 {activity.title}{' '}
                          <span className="font-body-x text-[11px] text-brand-400">
                            {activity.type.replace(/_/g, ' ').toLowerCase()}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteActivity.mutate(activity.id)}
                          aria-label={`Delete activity ${activity.title}`}
                          className="font-body-x text-[12px] text-rose-500 underline"
                        >
                          remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {activityFor === lesson.id && (
                  <div className="mt-3">
                    <ActivityEditor
                      isSaving={addActivity.isPending}
                      onCancel={() => setActivityFor(null)}
                      onSave={(draft: ActivityDraft) => {
                        addActivity.mutate(
                          { lessonId: lesson.id, ...draft },
                          { onSuccess: () => setActivityFor(null) },
                        );
                      }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ol>

          {lessonFor === section.id ? (
            <div className="mt-4">
              <LessonEditor
                isSaving={addLesson.isPending}
                onCancel={() => setLessonFor(null)}
                onSave={(draft: LessonDraft) =>
                  addLesson.mutate({ sectionId: section.id, ...draft }, { onSuccess: () => setLessonFor(null) })
                }
              />
            </div>
          ) : (
            <Button className="mt-4" variant="ghost" onClick={() => setLessonFor(section.id)}>
              + Add lesson
            </Button>
          )}
        </SectionEditor>
      ))}

      <form
        className="flex flex-wrap items-end gap-3 rounded-3xl border-2 border-dashed border-brand-200 bg-white/70 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newSection.trim()) return;
          addSection.mutate({ title: newSection.trim() }, { onSuccess: () => setNewSection('') });
        }}
      >
        <div className="min-w-[220px] flex-1">
          <label htmlFor="new-section" className="font-display font-extrabold text-brand-900">
            New section
          </label>
          <Input
            id="new-section"
            className="mt-1"
            value={newSection}
            onChange={(e) => setNewSection(e.target.value)}
            placeholder="Section 1 — Meet the Fraction"
          />
        </div>
        <Button type="submit" disabled={addSection.isPending || !newSection.trim()}>
          {addSection.isPending ? 'Adding…' : 'Add section'}
        </Button>
      </form>
    </div>
  );
}
