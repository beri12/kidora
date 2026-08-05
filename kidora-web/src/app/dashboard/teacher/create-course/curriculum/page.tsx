'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useCourseWizard, type Section, type Lecture, type LectureQuiz } from '@/stores/courseWizard.store';
import { saveCurriculumDraft, uploadVideo } from '@/services/courseWizard';
import { WizardStepper } from '@/components/course-witzard/WizardStepper';

const CURRICULUM_STORAGE_KEY = 'bloomling:curriculum-draft';

function genId() {
  return Math.random().toString(36).slice(2, 11);
}

function persistToLocalStorage(courseId: string | null, sections: Section[]) {
  try {
    const payload = {
      courseId,
      sections,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(CURRICULUM_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Could not persist curriculum draft to localStorage:', err);
  }
}

function clearLocalStorageDraft() {
  try {
    localStorage.removeItem(CURRICULUM_STORAGE_KEY);
  } catch (err) {
    console.warn('Could not clear curriculum draft from localStorage:', err);
  }
}

export default function CurriculumPage() {
  useRequireAuth(['TEACHER']);
  const router = useRouter();
  const { courseId, basicInfo, sections: savedSections, stepStatus, setSections, markStepDone, setCourseId } = useCourseWizard();

  const [sections, setLocalSections] = useState<Section[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const [quizOpen, setQuizOpen] = useState(false);
  const [quizTarget, setQuizTarget] = useState<{ sectionIdx: number; lectureIdx: number } | null>(null);
  const [quizDraft, setQuizDraft] = useState<LectureQuiz>({ question: '', answers: ['', ''], correctAnswer: -1 });

  const [videoOpen, setVideoOpen] = useState(false);
  const [videoTarget, setVideoTarget] = useState<{ sectionIdx: number; lectureIdx: number } | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoError, setVideoError] = useState('');

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    if (!basicInfo) {
      router.replace('/dashboard/teacher/create-course/basic-info');
      return;
    }

    if (savedSections.length) {
      setLocalSections(savedSections);
      return;
    }

    try {
      const raw = localStorage.getItem(CURRICULUM_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.courseId === courseId && Array.isArray(parsed.sections) && parsed.sections.length) {
          setLocalSections(parsed.sections);
          return;
        }
      }
    } catch (err) {
      console.warn('Could not read curriculum draft from localStorage:', err);
    }

    setLocalSections([makeSection(1)]);
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  function makeSection(order: number): Section {
    return { id: genId(), title: '', order, lectures: [] };
  }

  function addSection() {
    setLocalSections((s) => [...s, makeSection(s.length + 1)]);
  }

  function removeSection(i: number) {
    if (!confirm('Remove this section?')) return;
    setLocalSections((s) => s.filter((_, idx) => idx !== i).map((sec, idx) => ({ ...sec, order: idx + 1 })));
  }

  function renameSection(i: number, title: string) {
    setLocalSections((s) => s.map((sec, idx) => (idx === i ? { ...sec, title } : sec)));
  }

  function addLecture(sectionIdx: number) {
    setLocalSections((s) =>
      s.map((sec, idx) =>
        idx === sectionIdx
          ? { ...sec, lectures: [...sec.lectures, { id: genId(), title: '', order: sec.lectures.length + 1 }] }
          : sec,
      ),
    );
  }

  function renameLecture(sectionIdx: number, lectureIdx: number, title: string) {
    setLocalSections((s) =>
      s.map((sec, si) =>
        si === sectionIdx
          ? { ...sec, lectures: sec.lectures.map((l, li) => (li === lectureIdx ? { ...l, title } : l)) }
          : sec,
      ),
    );
  }

  function removeLecture(sectionIdx: number, lectureIdx: number) {
    if (!confirm('Remove this lecture?')) return;
    setLocalSections((s) =>
      s.map((sec, si) =>
        si === sectionIdx
          ? { ...sec, lectures: sec.lectures.filter((_, li) => li !== lectureIdx).map((l, li) => ({ ...l, order: li + 1 })) }
          : sec,
      ),
    );
  }

  function openQuiz(sectionIdx: number, lectureIdx: number) {
    setOpenDropdown(null);
    const existing = sections[sectionIdx].lectures[lectureIdx].quiz;
    setQuizDraft(existing ? { ...existing, answers: [...existing.answers] } : { question: '', answers: ['', ''], correctAnswer: -1 });
    setQuizTarget({ sectionIdx, lectureIdx });
    setQuizOpen(true);
  }

  function closeQuiz() {
    setQuizOpen(false);
    setQuizTarget(null);
  }

  function saveQuiz() {
    if (!quizDraft.question.trim()) { setError('Please enter a quiz question.'); return; }
    if (quizDraft.answers.some((a) => !a.trim())) { setError('Every answer needs text.'); return; }
    if (quizDraft.correctAnswer < 0) { setError('Mark one answer as correct.'); return; }
    setError('');

    if (!quizTarget) return;
    const { sectionIdx, lectureIdx } = quizTarget;
    setLocalSections((s) =>
      s.map((sec, si) =>
        si === sectionIdx
          ? { ...sec, lectures: sec.lectures.map((l, li) => (li === lectureIdx ? { ...l, quiz: quizDraft } : l)) }
          : sec,
      ),
    );
    closeQuiz();
  }

  function openVideoModal(sectionIdx: number, lectureIdx: number) {
    setOpenDropdown(null);
    setVideoFile(null);
    setVideoError('');
    setVideoTarget({ sectionIdx, lectureIdx });
    setVideoOpen(true);
  }

  function closeVideoModal() {
    if (videoUploading) return; // don't let the modal close mid-upload
    setVideoOpen(false);
    setVideoTarget(null);
    setVideoFile(null);
    setVideoError('');
  }

  // Actually uploads the file to the backend and stores the real URL it
  // returns, rather than just remembering the local filename. Without this,
  // videoUrl stays empty and the learn page has nothing to play.
  async function confirmVideo() {
    if (!videoFile || !videoTarget) { closeVideoModal(); return; }
    const { sectionIdx, lectureIdx } = videoTarget;

    setVideoUploading(true);
    setVideoError('');
    try {
      const { url, fileName } = await uploadVideo(videoFile);

      setLocalSections((s) =>
        s.map((sec, si) =>
          si === sectionIdx
            ? {
                ...sec,
                lectures: sec.lectures.map((l, li) =>
                  li === lectureIdx ? { ...l, videoUrl: url, videoFileName: fileName } : l,
                ),
              }
            : sec,
        ),
      );

      setVideoOpen(false);
      setVideoTarget(null);
      setVideoFile(null);
    } catch (err: any) {
      console.error('Video upload failed:', err);
      const message = err?.response?.data?.message ?? 'Could not upload the video, please try again.';
      setVideoError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setVideoUploading(false);
    }
  }

  // Resolves a valid courseId, creating the draft only if one truly doesn't
  // exist yet. With basic-info now awaiting its own sync before navigating
  // here, courseId should normally already be set, this stays only as a
  // safety net (e.g. direct URL navigation, refresh edge cases).
  async function resolveCourseId(): Promise<string> {
    if (courseId) return courseId;
    if (!basicInfo) throw new Error('Basic info is missing, please go back and fill it in.');

    const { createDraftCourse } = await import('@/services/courseWizard');
    const result = await createDraftCourse(basicInfo as any);

    if (!result?.id) {
      throw new Error('Server did not return a course id after creating the draft.');
    }

    setCourseId(result.id);
    return result.id;
  }

  async function save() {
    setSaving(true);
    setError('');
    setSavedMessage('');
    try {
      setSections(sections);

      const activeCourseId = await resolveCourseId();

      persistToLocalStorage(activeCourseId, sections);
      await saveCurriculumDraft(activeCourseId, sections);
      markStepDone('curriculum');

      setSavedMessage('Curriculum saved as draft.');
    } catch (err: any) {
      console.error('Curriculum save failed:', err);
      const message =
        err?.response?.data?.message ??
        (err?.request ? 'Saved locally, but could not reach the server yet.' : err?.message) ??
        'Could not save curriculum, please try again.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSaving(false);
    }
  }

  async function saveAndGoNext() {
    setSaving(true);
    setError('');
    setSavedMessage('');
    try {
      setSections(sections);

      const activeCourseId = await resolveCourseId();

      persistToLocalStorage(activeCourseId, sections);
      await saveCurriculumDraft(activeCourseId, sections);
      markStepDone('curriculum');

      router.push('/dashboard/teacher/create-course/advance-info');
    } catch (err: any) {
      console.error('Curriculum save failed:', err);
      const message =
        err?.response?.data?.message ??
        (err?.request ? 'Saved locally, but could not reach the server yet.' : err?.message) ??
        'Could not save curriculum, please try again.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <WizardStepper current="curriculum" stepStatus={stepStatus} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Curriculum</h1>
        <div className="flex gap-3">
          <button onClick={() => save()} disabled={saving} className="px-5 py-2.5 border-2 border-purple-600 text-purple-700 rounded-lg hover:bg-purple-50 transition font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          <button onClick={() => saveAndGoNext()} disabled={saving} className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Save & continue'}
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm font-semibold text-red-600">{error}</p>}
      {savedMessage && !error && <p className="mb-4 text-sm font-semibold text-emerald-600">{savedMessage}</p>}

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
        {sections.map((section, si) => (
          <div key={section.id} className="border border-gray-200 rounded-lg">
            <div className="bg-purple-50 p-4 flex justify-between items-center rounded-t-lg">
              <div className="flex items-center gap-3 flex-1">
                <span className="font-semibold text-purple-700">Section {si + 1}:</span>
                <input
                  value={section.title}
                  onChange={(e) => renameSection(si, e.target.value)}
                  placeholder="Section name"
                  className="flex-1 px-3 py-1.5 bg-transparent focus:outline-none font-medium text-gray-900"
                />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => addLecture(si)} title="Add lecture" className="p-1.5 text-gray-500 hover:text-purple-700 transition">＋</button>
                <button onClick={() => removeSection(si)} title="Delete section" className="p-1.5 text-gray-500 hover:text-red-600 transition">✕</button>
              </div>
            </div>

            <div className="p-4 space-y-2">
              {section.lectures.map((lecture, li) => {
                const dropdownKey = `${si}-${li}`;
                return (
                  <div key={lecture.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        value={lecture.title}
                        onChange={(e) => renameLecture(si, li, e.target.value)}
                        placeholder="Lecture name"
                        className="flex-1 px-3 py-1.5 bg-transparent focus:outline-none text-gray-700"
                      />
                      {lecture.videoUrl && <span className="text-xs text-emerald-600 font-semibold shrink-0">🎬 {lecture.videoFileName ?? 'Video attached'}</span>}
                      {lecture.quiz && <span className="text-xs text-purple-600 font-semibold shrink-0">📝 Quiz added</span>}
                    </div>
                    <div className="flex items-center gap-2 relative">
                      <button
                        onClick={() => setOpenDropdown(openDropdown === dropdownKey ? null : dropdownKey)}
                        className="px-4 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition"
                      >
                        Contents ▾
                      </button>
                      {openDropdown === dropdownKey && (
                        <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                          <button onClick={() => openVideoModal(si, li)} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">🎬 Video</button>
                          <button onClick={() => openQuiz(si, li)} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">📝 Quiz</button>
                        </div>
                      )}
                      <button onClick={() => removeLecture(si, li)} className="p-1.5 text-gray-400 hover:text-red-600 transition">✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <button onClick={addSection} className="w-full px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium">
          + Add section
        </button>

        <div className="flex justify-between items-center pt-4">
          <button onClick={() => router.push('/dashboard/teacher/create-course/basic-info')} className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium">
            Previous
          </button>
          <button onClick={() => saveAndGoNext()} disabled={saving} className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Save & next'}
          </button>
        </div>
      </div>

      {quizOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeQuiz}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lecture quiz</h2>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
            <input
              value={quizDraft.question}
              onChange={(e) => setQuizDraft((q) => ({ ...q, question: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-purple-500"
              placeholder="Write your question here…"
            />
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">Answers</span>
              <button onClick={() => setQuizDraft((q) => ({ ...q, answers: [...q.answers, ''] }))} className="text-sm text-purple-600 font-semibold">
                + Add answer
              </button>
            </div>
            <div className="space-y-2">
              {quizDraft.answers.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={a}
                    onChange={(e) =>
                      setQuizDraft((q) => ({ ...q, answers: q.answers.map((x, xi) => (xi === i ? e.target.value : x)) }))
                    }
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-purple-500"
                    placeholder={`Answer ${String.fromCharCode(65 + i)}`}
                  />
                  <button
                    onClick={() => setQuizDraft((q) => ({ ...q, correctAnswer: i }))}
                    className={'px-3 py-1 text-sm font-medium rounded-md ' + (quizDraft.correctAnswer === i ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600')}
                  >
                    Correct
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeQuiz} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={saveQuiz} className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Save quiz</button>
            </div>
          </div>
        </div>
      )}

      {videoOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeVideoModal}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lecture video</h2>
            <label className={`block border-2 border-dashed rounded-lg p-8 text-center transition ${videoUploading ? 'border-gray-200 cursor-not-allowed opacity-60' : 'border-gray-300 cursor-pointer hover:border-purple-400'}`}>
              <input
                type="file"
                accept="video/*"
                className="hidden"
                disabled={videoUploading}
                onChange={(e) => { setVideoFile(e.target.files?.[0] ?? null); setVideoError(''); }}
              />
              <div className="text-3xl mb-2">⬆️</div>
              <p className="text-sm font-medium text-gray-700">{videoFile ? videoFile.name : 'Click to select a video'}</p>
              <p className="text-xs text-gray-500 mt-1">At least 720p, under 500MB</p>
            </label>
            {videoError && <p className="text-sm text-red-600 font-medium mt-3">{videoError}</p>}
            {videoUploading && (
              <div className="flex items-center gap-2 mt-3 text-sm text-purple-600 font-medium">
                <div className="w-4 h-4 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                Uploading video…
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeVideoModal} disabled={videoUploading} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button onClick={confirmVideo} disabled={!videoFile || videoUploading} className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                {videoUploading ? 'Uploading…' : 'Attach video'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}