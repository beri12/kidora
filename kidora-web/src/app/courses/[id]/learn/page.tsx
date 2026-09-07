'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/axios';
import { API_ORIGIN } from '@/lib/api/client';

interface Quiz { question: string; answers: string[]; correctAnswer: number; }
interface Lecture { id: string; title: string; order: number; videoUrl?: string; quiz?: Quiz; }
interface Section { id: string; title: string; order: number; lectures: Lecture[]; }
interface CourseDetail { id: string; title: string; description?: string; sections: Section[]; }

function progressKey(courseId: string) {
  return `kidora:progress:${courseId}`;
}

// Upload endpoints return relative paths like "/uploads/videos/xxx.mp4".
// The browser resolves relative <video src> against the current page's
// origin (the Next.js frontend on :3000), not the backend on :4000, so
// relative paths must be prefixed with the backend's origin before use.
function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_ORIGIN}${url}`;
}

export default function LearnCoursePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLectureId, setActiveLectureId] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizResults, setQuizResults] = useState<Record<string, boolean>>({});
  const [showFinal, setShowFinal] = useState(false);

  useEffect(() => {
    api.get(`/courses/${id}`)
      .then((res) => {
        setCourse(res.data);
        const firstLecture = res.data.sections[0]?.lectures[0];
        if (firstLecture) setActiveLectureId(firstLecture.id);
      })
      .finally(() => setLoading(false));

    try {
      const raw = localStorage.getItem(progressKey(id));
      if (raw) setCompleted(JSON.parse(raw));
    } catch {}
  }, [id]);

  const allLectures = useMemo(() => course?.sections.flatMap((s) => s.lectures) ?? [], [course]);
  const activeLecture = allLectures.find((l) => l.id === activeLectureId);
  const activeSection = course?.sections.find((s) => s.lectures.some((l) => l.id === activeLectureId));
  const quizLectures = allLectures.filter((l) => l.quiz);
  const activeIndex = allLectures.findIndex((l) => l.id === activeLectureId);
  const isLastLecture = activeIndex === allLectures.length - 1;
  const activeVideoUrl = resolveMediaUrl(activeLecture?.videoUrl);

  const completedCount = allLectures.filter((l) => completed[l.id]).length;
  const overallProgress = allLectures.length ? Math.round((completedCount / allLectures.length) * 100) : 0;

  function saveProgress(next: Record<string, boolean>) {
    setCompleted(next);
    try { localStorage.setItem(progressKey(id), JSON.stringify(next)); } catch {}
  }

  function markWatched(lectureId: string) {
    if (completed[lectureId]) return;
    saveProgress({ ...completed, [lectureId]: true });
  }

  function submitQuiz(lecture: Lecture) {
    if (!lecture.quiz) return;
    const selected = quizAnswers[lecture.id];
    const correct = selected === lecture.quiz.correctAnswer;
    setQuizResults((r) => ({ ...r, [lecture.id]: correct }));
    markWatched(lecture.id);
  }

  function retryQuiz(lectureId: string) {
    setQuizResults((r) => { const next = { ...r }; delete next[lectureId]; return next; });
    setQuizAnswers((a) => { const next = { ...a }; delete next[lectureId]; return next; });
  }

  function goToNext() {
    const next = allLectures[activeIndex + 1];
    if (next) setActiveLectureId(next.id);
    else setShowFinal(true);
  }

  function goToPrev() {
    const prev = allLectures[activeIndex - 1];
    if (prev) setActiveLectureId(prev.id);
  }

  const finalScore = quizLectures.length
    ? Math.round((quizLectures.filter((l) => quizResults[l.id]).length / quizLectures.length) * 100)
    : 100;

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Loading course…</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50 text-center px-4">
        <div>
          <p className="text-gray-900 font-semibold mb-2">Course not found</p>
          <button onClick={() => router.push('/courses')} className="text-purple-600 font-medium hover:underline">
            ← Back to courses
          </button>
        </div>
      </div>
    );
  }

  if (showFinal) {
    const passed = finalScore >= 70;
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white grid place-items-center px-4">
        <div className="max-w-md w-full text-center">
          <div className={`w-24 h-24 rounded-full mx-auto mb-6 grid place-items-center text-5xl ${passed ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            {passed ? '🎉' : '📚'}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {passed ? 'Congratulations!' : 'Almost there!'}
          </h1>
          <p className="text-gray-500 mb-8">
            {passed
              ? `You've completed "${course.title}"`
              : `You need 70% to pass. Keep going, you're close.`}
          </p>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 font-medium">Final score</span>
              <span className={`text-sm font-bold ${passed ? 'text-emerald-600' : 'text-amber-600'}`}>{finalScore}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${passed ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${finalScore}%` }}
              />
            </div>
            {quizLectures.length > 0 && (
              <p className="text-xs text-gray-400 mt-3">
                {quizLectures.filter((l) => quizResults[l.id]).length} of {quizLectures.length} quizzes correct
              </p>
            )}
          </div>

          {passed ? (
            <button
              onClick={() => router.push('/courses')}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition font-semibold"
            >
              Explore more courses →
            </button>
          ) : (
            <button
              onClick={() => setShowFinal(false)}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition font-semibold"
            >
              Review the course
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top progress bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <button onClick={() => router.push('/courses')} className="text-gray-400 hover:text-gray-600 shrink-0">
            ← Back
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{course.title}</p>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1.5">
              <div className="h-full bg-purple-600 rounded-full transition-all" style={{ width: `${overallProgress}%` }} />
            </div>
          </div>
          <span className="text-sm font-semibold text-purple-600 shrink-0">{overallProgress}%</span>
        </div>
      </div>

      <div className="flex max-w-7xl mx-auto px-4 sm:px-6 py-6 gap-6">
        {/* Playlist sidebar */}
        <aside className="w-80 shrink-0 hidden lg:block">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 px-1">Course content</p>
            <div className="space-y-4">
              {course.sections.map((section, sIdx) => {
                const sectionDone = section.lectures.filter((l) => completed[l.id]).length;
                return (
                  <div key={section.id}>
                    <div className="flex items-center justify-between px-1 mb-2">
                      <p className="text-sm font-bold text-gray-900">{sIdx + 1}. {section.title}</p>
                      <span className="text-xs text-gray-400">{sectionDone}/{section.lectures.length}</span>
                    </div>
                    <div className="space-y-1">
                      {section.lectures.map((lecture) => {
                        const active = lecture.id === activeLectureId;
                        const done = completed[lecture.id];
                        return (
                          <button
                            key={lecture.id}
                            onClick={() => setActiveLectureId(lecture.id)}
                            className={
                              'w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 transition ' +
                              (active ? 'bg-purple-600 text-white shadow-sm' : 'hover:bg-gray-50 text-gray-700')
                            }
                          >
                            <span
                              className={
                                'w-5 h-5 rounded-full grid place-items-center text-xs shrink-0 ' +
                                (done
                                  ? active ? 'bg-white text-purple-600' : 'bg-emerald-100 text-emerald-600'
                                  : active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400')
                              }
                            >
                              {done ? '✓' : lecture.quiz ? '📝' : '▶'}
                            </span>
                            <span className="truncate flex-1">{lecture.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {activeLecture && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">
                  {activeSection?.title}
                </p>
                <h1 className="text-2xl font-bold text-gray-900">{activeLecture.title}</h1>
                <p className="text-sm text-gray-400 mt-1">
                  Lesson {activeIndex + 1} of {allLectures.length}
                </p>
              </div>

              <div className="p-6 sm:p-8">
                {activeVideoUrl && !activeLecture.quiz && (
                  <div className="rounded-xl overflow-hidden bg-black mb-2">
                    <video
                      key={activeVideoUrl}
                      src={activeVideoUrl}
                      controls
                      className="w-full aspect-video"
                      onEnded={() => markWatched(activeLecture.id)}
                    />
                  </div>
                )}

                {!activeVideoUrl && !activeLecture.quiz && (
                  <div className="rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 aspect-video grid place-items-center mb-2">
                    <p className="text-gray-400 text-sm">No video attached to this lesson</p>
                  </div>
                )}

                {activeLecture.quiz && (
                  <div className="rounded-xl border-2 border-purple-100 bg-purple-50/40 p-6 sm:p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2.5 py-1 rounded-full">QUIZ</span>
                    </div>
                    <p className="font-semibold text-gray-900 text-lg mb-5">{activeLecture.quiz.question}</p>

                    <div className="space-y-2.5">
                      {activeLecture.quiz.answers.map((a, i) => {
                        const selected = quizAnswers[activeLecture.id] === i;
                        const resultKnown = quizResults[activeLecture.id] !== undefined;
                        const isCorrectAnswer = i === activeLecture.quiz!.correctAnswer;

                        let optionStyle = 'border-gray-200 hover:border-purple-300 hover:bg-white';
                        if (resultKnown) {
                          if (isCorrectAnswer) optionStyle = 'border-emerald-400 bg-emerald-50';
                          else if (selected) optionStyle = 'border-red-300 bg-red-50';
                          else optionStyle = 'border-gray-200 opacity-60';
                        } else if (selected) {
                          optionStyle = 'border-purple-500 bg-white shadow-sm';
                        }

                        return (
                          <label
                            key={i}
                            className={`flex items-center gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition ${optionStyle}`}
                          >
                            <input
                              type="radio"
                              name={`quiz-${activeLecture.id}`}
                              checked={selected}
                              disabled={resultKnown}
                              onChange={() => setQuizAnswers((q) => ({ ...q, [activeLecture.id]: i }))}
                              className="accent-purple-600"
                            />
                            <span className="text-gray-800 font-medium">{a}</span>
                            {resultKnown && isCorrectAnswer && <span className="ml-auto text-emerald-600 text-sm font-semibold">Correct</span>}
                          </label>
                        );
                      })}
                    </div>

                    {quizResults[activeLecture.id] !== undefined ? (
                      <div className="mt-5 flex items-center justify-between">
                        <p className={`font-semibold ${quizResults[activeLecture.id] ? 'text-emerald-600' : 'text-red-600'}`}>
                          {quizResults[activeLecture.id] ? '✓ Correct! Nice work.' : '✗ Not quite right.'}
                        </p>
                        {!quizResults[activeLecture.id] && (
                          <button
                            onClick={() => retryQuiz(activeLecture.id)}
                            className="text-sm font-semibold text-purple-600 hover:underline"
                          >
                            Try again
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => submitQuiz(activeLecture)}
                        disabled={quizAnswers[activeLecture.id] === undefined}
                        className="mt-5 px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold"
                      >
                        Submit answer
                      </button>
                    )}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                  <button
                    onClick={goToPrev}
                    disabled={activeIndex === 0}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={goToNext}
                    className="px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition font-semibold"
                  >
                    {isLastLecture ? 'Finish course 🎉' : 'Next lesson →'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}