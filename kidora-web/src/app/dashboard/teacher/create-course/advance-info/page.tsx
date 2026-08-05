'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useCourseWizard } from '@/stores/courseWizard.store';
import { publishCourse } from '@/services/courseWizard';
import { WizardStepper } from '@/components/course-witzard/WizardStepper';

export default function AdvanceInformationPage() {
  useRequireAuth(['TEACHER']);
  const router = useRouter();
  const { courseId, basicInfo, sections, advanceInfo, stepStatus, setAdvanceInfo, markStepDone, reset } = useCourseWizard();

  const [description, setDescription] = useState('');
  const [learningPoints, setLearningPoints] = useState(['', '', '', '']);
  const [requirements, setRequirements] = useState(['', '', '', '']);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [trailerFile, setTrailerFile] = useState<File | null>(null);
  const [trailerPreview, setTrailerPreview] = useState<string | null>(null);

  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!courseId) { router.replace('/dashboard/teacher/create-course/basic-info'); return; }
    if (advanceInfo) {
      setDescription(advanceInfo.description ?? '');
      setLearningPoints(advanceInfo.learningPoints?.length ? advanceInfo.learningPoints : ['', '', '', '']);
      setRequirements(advanceInfo.requirements?.length ? advanceInfo.requirements : ['', '', '', '']);
    }
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  function onThumbnail(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setThumbnailPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function onTrailer(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTrailerFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setTrailerPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function publish() {
    if (!courseId || !basicInfo) {
      setError('Missing course, please complete the previous steps first.');
      return;
    }

    setError('');
    setPublishing(true);

    const finalAdvanceInfo = {
      thumbnailUrl: thumbnailPreview ?? undefined, // swap for an uploaded URL once you wire real file storage
      trailerUrl: trailerPreview ?? undefined,
      description,
      learningPoints: learningPoints.filter((p) => p.trim() !== ''),
      requirements: requirements.filter((r) => r.trim() !== ''),
      tags: [] as string[],
    };

    try {
      setAdvanceInfo(finalAdvanceInfo);

      // The one combined request: everything accumulated across all three steps.
      await publishCourse(courseId, {
        basicInfo,
        sections,
        advanceInfo: finalAdvanceInfo,
      });

      markStepDone('advanceInfo');
      setSuccess(true);
      setTimeout(() => {
        reset();
        router.push('/dashboard/teacher/courses');
      }, 1200);
    } catch (err: any) {
      // TEMP: full diagnostic dump so the actual cause is visible instead of
      // a generic fallback message. Remove once publish is confirmed working.
      console.error('PUBLISH FAILED - full error:', err);
      console.error('PUBLISH FAILED - status:', err?.response?.status);
      console.error('PUBLISH FAILED - response body:', JSON.stringify(err?.response?.data, null, 2));

      const backendMessage = err?.response?.data?.message;
      const message = Array.isArray(backendMessage)
        ? backendMessage.join(', ')
        : backendMessage ?? err?.message ?? 'Could not publish the course, please try again.';

      setError(message);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <WizardStepper current="advanceInfo" stepStatus={stepStatus} />

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Advance Information</h1>

      {error && <p className="mb-4 text-sm font-semibold text-red-600">{error}</p>}
      {success && <p className="mb-4 text-sm font-semibold text-emerald-600">Course published successfully, redirecting…</p>}

      <div className="bg-white rounded-2xl shadow-sm p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-lg font-semibold text-gray-900 mb-3">Course thumbnail</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition">
              {thumbnailPreview ? (
                <div className="relative">
                  <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-40 object-cover rounded-lg" />
                  <button onClick={() => { setThumbnailFile(null); setThumbnailPreview(null); }} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full">✕</button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">1200x800px, jpg/png</p>
              )}
              <input type="file" id="thumb" accept="image/*" className="hidden" onChange={onThumbnail} />
              <label htmlFor="thumb" className="inline-block mt-4 px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition cursor-pointer text-sm font-medium">
                Upload image
              </label>
            </div>
          </div>

          <div>
            <label className="block text-lg font-semibold text-gray-900 mb-3">Course trailer</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition">
              {trailerPreview ? (
                <div className="relative">
                  <video src={trailerPreview} controls className="w-full h-40 rounded-lg" />
                  <button onClick={() => { setTrailerFile(null); setTrailerPreview(null); }} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full">✕</button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">720p minimum, under 1GB</p>
              )}
              <input type="file" id="trailer" accept="video/*" className="hidden" onChange={onTrailer} />
              <label htmlFor="trailer" className="inline-block mt-4 px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition cursor-pointer text-sm font-medium">
                Upload video
              </label>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-lg font-semibold text-gray-900 mb-3">Course description</label>
          <textarea
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter your course description"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-lg font-semibold text-gray-900 mb-3">What students will learn ({learningPoints.filter((p) => p).length}/8)</label>
          <div className="space-y-3">
            {learningPoints.map((p, i) => (
              <div key={i} className="flex gap-3 items-center">
                <span className="text-gray-500 font-medium w-6">{String(i + 1).padStart(2, '0')}</span>
                <input
                  value={p}
                  onChange={(e) => setLearningPoints((pts) => pts.map((x, xi) => (xi === i ? e.target.value : x)))}
                  maxLength={120}
                  placeholder="What you will teach in this course…"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            ))}
            {learningPoints.length < 8 && (
              <button onClick={() => setLearningPoints((p) => [...p, ''])} className="text-sm text-purple-600 font-semibold">+ Add point</button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-lg font-semibold text-gray-900 mb-3">Course requirements ({requirements.filter((r) => r).length}/8)</label>
          <div className="space-y-3">
            {requirements.map((r, i) => (
              <div key={i} className="flex gap-3 items-center">
                <span className="text-gray-500 font-medium w-6">{String(i + 1).padStart(2, '0')}</span>
                <input
                  value={r}
                  onChange={(e) => setRequirements((reqs) => reqs.map((x, xi) => (xi === i ? e.target.value : x)))}
                  maxLength={120}
                  placeholder="Enter a course requirement…"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            ))}
            {requirements.length < 8 && (
              <button onClick={() => setRequirements((r) => [...r, ''])} className="text-sm text-purple-600 font-semibold">+ Add requirement</button>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-6">
          <button onClick={() => router.push('/dashboard/teacher/create-course/curriculum')} className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium">
            Previous
          </button>
          <button onClick={publish} disabled={publishing} className="px-8 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium disabled:opacity-50">
            {publishing ? 'Publishing…' : 'Publish course'}
          </button>
        </div>
      </div>
    </div>
  );
}