'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useCourseWizard } from '@/stores/courseWizard.store';
import { createDraftCourse, updateDraftCourse } from '@/services/courseWizard';
import { WizardStepper } from '@/components/course-witzard/WizardStepper';

// Replace these with real API-backed lists once you have category/level endpoints.
const CATEGORIES = [{ id: 'math', name: 'Mathematics' }, { id: 'science', name: 'Science' }, { id: 'art', name: 'Art' }];
const SUB_CATEGORIES = [
  { id: 'algebra', name: 'Algebra', categoryId: 'math' },
  { id: 'geometry', name: 'Geometry', categoryId: 'math' },
  { id: 'biology', name: 'Biology', categoryId: 'science' },
];
const LEVELS = [{ id: 'beginner', name: 'Beginner' }, { id: 'intermediate', name: 'Intermediate' }, { id: 'advanced', name: 'Advanced' }];
const LANGUAGES = [{ id: 'en', name: 'English' }, { id: 'am', name: 'Amharic' }, { id: 'fr', name: 'French' }];

export default function BasicInformationPage() {
  useRequireAuth(['TEACHER']);
  const router = useRouter();
  const { courseId, basicInfo, stepStatus, setCourseId, setBasicInfo, markStepDone } = useCourseWizard();

  const [form, setForm] = useState({
    title: '', description: '', categoryId: '', subCategoryId: '', topic: '',
    language: '', subtitleLanguage: '', levelId: '', duration: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  // Restore whatever was saved locally, so leaving and coming back doesn't lose progress.
  useEffect(() => {
    if (basicInfo) setForm(basicInfo as any);
  }, [basicInfo]);

  const filteredSubCategories = SUB_CATEGORIES.filter((s) => s.categoryId === form.categoryId);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v, ...(k === 'categoryId' ? { subCategoryId: '' } : {}) }));

  function save(goNext: boolean) {
    if (!form.title || form.title.trim().length < 5) {
      setError('Title must be at least 5 characters.');
      return;
    }
    setError('');
    setSavedMessage('');

    // 1. Save locally first (Zustand persist writes this to localStorage
    //    immediately). This always succeeds, it's synchronous and doesn't
    //    depend on the network.
    setBasicInfo(form as any);
    markStepDone('basicInfo');

    // 2. Navigate right away if requested. Not waiting on the backend here
    //    on purpose, "Next" should never get stuck because the API is slow
    //    or temporarily down, since the data is already safe in localStorage.
    if (goNext) {
      router.push('/dashboard/teacher/create-course/curriculum');
    }

    // 3. Sync the draft to the backend in the background. This still runs
    //    and still sets courseId once it resolves, but failure here no
    //    longer blocks moving forward, it just surfaces as a background
    //    warning instead. Curriculum/publish steps that need courseId will
    //    simply retry the draft save if it's still missing when needed.
    setSaving(true);
    const request = courseId ? updateDraftCourse(courseId, form as any) : createDraftCourse(form as any);

    request
      .then((result) => {
        setCourseId(result.id);
        setSavedMessage('Draft synced to server.');
      })
      .catch((err: any) => {
        console.error('Background draft sync failed:', err);
        const message =
          err?.response?.data?.message ??
          (err?.request ? 'Saved locally, but could not reach the server yet.' : err?.message) ??
          'Saved locally, but the server sync failed.';
        setError(Array.isArray(message) ? message.join(', ') : message);
      })
      .finally(() => setSaving(false));
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <WizardStepper current="basicInfo" stepStatus={stepStatus} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Basic Information</h1>
        <div className="flex gap-3">
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="px-5 py-2.5 border-2 border-purple-600 text-purple-700 rounded-lg hover:bg-purple-50 transition font-semibold disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving}
            className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save & continue'}
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm font-semibold text-red-600">{error}</p>}
      {savedMessage && !error && <p className="mb-4 text-sm font-semibold text-emerald-600">{savedMessage}</p>}

      <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Title</label>
          <div className="relative">
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              maxLength={80}
              placeholder="Your course title"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <span className="absolute right-4 top-3 text-sm text-gray-400">{form.title.length}/80</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Subtitle</label>
          <div className="relative">
            <input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              maxLength={120}
              placeholder="Your course subtitle"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <span className="absolute right-4 top-3 text-sm text-gray-400">{form.description.length}/120</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Course category</label>
            <select
              value={form.categoryId}
              onChange={(e) => set('categoryId', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
            >
              <option value="">Select…</option>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Course sub-category</label>
            <select
              value={form.subCategoryId}
              onChange={(e) => set('subCategoryId', e.target.value)}
              disabled={!form.categoryId}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white disabled:bg-gray-50"
            >
              <option value="">Select…</option>
              {filteredSubCategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Course topic</label>
          <input
            value={form.topic}
            onChange={(e) => set('topic', e.target.value)}
            placeholder="What is primarily taught in your course?"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Language</label>
            <select value={form.language} onChange={(e) => set('language', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white">
              <option value="">Select…</option>
              {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Subtitle language (optional)</label>
            <select value={form.subtitleLanguage} onChange={(e) => set('subtitleLanguage', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white">
              <option value="">Select…</option>
              {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Level</label>
            <select value={form.levelId} onChange={(e) => set('levelId', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white">
              <option value="">Select…</option>
              {LEVELS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Duration</label>
            <select value={form.duration} onChange={(e) => set('duration', e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white">
              <option value="">Select duration</option>
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center pt-6">
          <button onClick={() => router.push('/dashboard/teacher')} className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium">
            Cancel
          </button>
          <button onClick={() => save(true)} disabled={saving} className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Save & next'}
          </button>
        </div>
      </div>
    </div>
  );
}