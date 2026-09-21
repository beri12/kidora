'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useCourseWizard } from '@/stores/courseWizard.store';
import { publishCourse, uploadImage, uploadVideo } from '@/services/courseWizard';
import { WizardStepper } from '@/components/course-witzard/WizardStepper';

// Surfaces the API's real complaint (unsupported type, file too large,
// missing auth) instead of a generic failure string.
function uploadErrorMessage(err: any, label: string): string {
  const body = err?.response?.data?.message;
  const detail = Array.isArray(body) ? body.join(', ') : body;
  if (detail) return `Could not upload the ${label}: ${detail}`;
  if (err?.response?.status === 413) {
    return `Could not upload the ${label}: the file is too large.`;
  }
  return `Could not upload the ${label}: ${err?.message ?? 'please try again.'}`;
}

export default function AdvanceInformationPage() {
  useRequireAuth(['TEACHER']);
  const router = useRouter();
  const { courseId, basicInfo, sections, advanceInfo, stepStatus, setAdvanceInfo, markStepDone, reset } = useCourseWizard();

  const [description, setDescription] = useState('');
  const [learningPoints, setLearningPoints] = useState(['', '', '', '']);
  const [requirements, setRequirements] = useState(['', '', '', '']);
  // For each asset we track three separate things:
  //   *Preview  - a local object URL, shown immediately so the teacher sees
  //               the file straight away without waiting for the network.
  //   *Url      - the URL the API returns once the file is actually stored.
  //               This is the only value that may be sent to the backend.
  //   *Progress - upload percentage, or null when no upload is running.
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailProgress, setThumbnailProgress] = useState<number | null>(null);
  const [trailerPreview, setTrailerPreview] = useState<string | null>(null);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [trailerProgress, setTrailerProgress] = useState<number | null>(null);

  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!courseId) { router.replace('/dashboard/teacher/create-course/basic-info'); return; }
    if (advanceInfo) {
      setDescription(advanceInfo.description ?? '');
      setLearningPoints(advanceInfo.learningPoints?.length ? advanceInfo.learningPoints : ['', '', '', '']);
      setRequirements(advanceInfo.requirements?.length ? advanceInfo.requirements : ['', '', '', '']);
      // Already-uploaded assets survive a page reload: they are plain URLs
      // on the API, so they can be restored as both value and preview.
      if (advanceInfo.thumbnailUrl) {
        setThumbnailUrl(advanceInfo.thumbnailUrl);
        setThumbnailPreview(advanceInfo.thumbnailUrl);
      }
      if (advanceInfo.trailerUrl) {
        setTrailerUrl(advanceInfo.trailerUrl);
        setTrailerPreview(advanceInfo.trailerUrl);
      }
    }
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  // The file is uploaded as soon as it is picked, rather than at publish
  // time. Previously the preview was a FileReader data URL and that base64
  // string was sent as thumbnailUrl/trailerUrl, which meant the file was
  // never stored anywhere: a several-hundred-megabyte video became a
  // multi-megabyte JSON string that the publish request could not carry.
  // Uploading here keeps publish a small JSON request that only references
  // URLs, and surfaces upload errors while there is still time to fix them.
  async function onThumbnail(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file after a failure
    if (!file) return;

    setError('');
    setThumbnailPreview(URL.createObjectURL(file));
    setThumbnailUrl(null);
    setThumbnailProgress(0);
    try {
      const { url } = await uploadImage(file, setThumbnailProgress);
      setThumbnailUrl(url);
    } catch (err: any) {
      setThumbnailPreview(null);
      setError(uploadErrorMessage(err, 'thumbnail'));
    } finally {
      setThumbnailProgress(null);
    }
  }

  async function onTrailer(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError('');
    setTrailerPreview(URL.createObjectURL(file));
    setTrailerUrl(null);
    setTrailerProgress(0);
    try {
      const { url } = await uploadVideo(file, setTrailerProgress);
      setTrailerUrl(url);
    } catch (err: any) {
      setTrailerPreview(null);
      setError(uploadErrorMessage(err, 'trailer'));
    } finally {
      setTrailerProgress(null);
    }
  }

  async function publish() {
    if (!courseId || !basicInfo) {
      setError('Missing course, please complete the previous steps first.');
      return;
    }

    // A publish that ran mid-upload used to silently drop the asset; block
    // instead so the teacher does not end up with a course missing its art.
    if (thumbnailProgress !== null || trailerProgress !== null) {
      setError('Please wait for the uploads to finish before publishing.');
      return;
    }

    setError('');
    setPublishing(true);

    const finalAdvanceInfo = {
      // Only ever the URLs returned by the upload endpoints — never the
      // local object-URL previews, which mean nothing outside this tab.
      thumbnailUrl: thumbnailUrl ?? undefined,
      trailerUrl: trailerUrl ?? undefined,
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
                  <button onClick={() => { setThumbnailPreview(null); setThumbnailUrl(null); }} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full">✕</button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">1200x800px, jpg/png/webp, up to 10MB</p>
              )}
              {thumbnailProgress !== null && (
                <div className="mt-3">
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div className="h-2 rounded-full bg-purple-600 transition-all" style={{ width: `${thumbnailProgress}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Uploading… {thumbnailProgress}%</p>
                </div>
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
                  <button onClick={() => { setTrailerPreview(null); setTrailerUrl(null); }} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full">✕</button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">720p minimum, mp4/webm/mov</p>
              )}
              {trailerProgress !== null && (
                <div className="mt-3">
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div className="h-2 rounded-full bg-purple-600 transition-all" style={{ width: `${trailerProgress}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Uploading… {trailerProgress}%</p>
                </div>
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
          <button
            onClick={publish}
            disabled={publishing || thumbnailProgress !== null || trailerProgress !== null}
            className="px-8 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium disabled:opacity-50"
          >
            {publishing ? 'Publishing…' : 'Publish course'}
          </button>
        </div>
      </div>
    </div>
  );
}