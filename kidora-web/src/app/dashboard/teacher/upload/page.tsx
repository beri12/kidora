'use client';
import { useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useCreateCourse, useUploadResource } from '@/features/courses/hooks';
import { courseSchema } from '@/features/auth/schemas';
import { SUBJECTS } from '@/constants';
import { Button } from '@/components/ui/button';
import { Input, Label, FieldError } from '@/components/ui/input';

// Teacher: create a course, then upload video / documents / resources to it.
export default function TeacherUpload() {
  useRequireAuth(['TEACHER']);
  const createCourse = useCreateCourse();
  const [form, setForm] = useState({ title: '', subjectSlug: 'math', ageBand: '6-8' as const, description: '', isPremium: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [courseId, setCourseId] = useState<string | null>(null);
  const [createError, setCreateError] = useState('');

  const upload = useUploadResource(courseId ?? '');
  const [pct, setPct] = useState(0);
  const [files, setFiles] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState('');

  async function createCourseSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = courseSchema.safeParse(form);
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message]))); return; }
    setErrors({});
    setCreateError('');

    try {
      const course = await createCourse.mutateAsync(parsed.data);
      setCourseId(course.id);
    } catch (err: any) {
      // Surface the real failure instead of leaving the button hanging with no feedback.
      const message = err?.response?.data?.message ?? err?.message ?? 'Could not create the course, please try again.';
      setCreateError(Array.isArray(message) ? message.join(', ') : message);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !courseId) return;
    setPct(0);
    setUploadError('');
    try {
      await upload.mutateAsync({ file, lessonId: 'new', onProgress: setPct });
      setFiles((f) => [...f, file.name]);
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message ?? 'Upload failed, please try again.';
      setUploadError(Array.isArray(message) ? message.join(', ') : message);
      setPct(0);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display font-extrabold text-3xl text-brand-900 mb-1">Upload a course</h1>
      <p className="font-body font-bold text-brand-600 mb-6">Create the course, then add videos, documents and resources.</p>

      {/* Step 1: course details */}
      <form onSubmit={createCourseSubmit} className="bg-white rounded-3xl border-2 border-brand-100 p-6 shadow-card">
        <div className="font-body-x text-[11px] text-brand-400 uppercase mb-3">Step 1 · Course details</div>
        <Label>Title</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Addition Adventures" />
        <FieldError>{errors.title}</FieldError>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <Label>Subject</Label>
            <select value={form.subjectSlug} onChange={(e) => setForm({ ...form, subjectSlug: e.target.value })} className="w-full bg-brand-50 border-2 border-brand-200 rounded-2xl px-4 py-3 font-body font-bold text-brand-900">
              {SUBJECTS.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Age band</Label>
            <select value={form.ageBand} onChange={(e) => setForm({ ...form, ageBand: e.target.value as any })} className="w-full bg-brand-50 border-2 border-brand-200 rounded-2xl px-4 py-3 font-body font-bold text-brand-900">
              <option value="3-5">Ages 3–5</option><option value="6-8">Ages 6–8</option><option value="9-12">Ages 9–12</option>
            </select>
          </div>
        </div>
        {/* The form kept `description` in state but never rendered a control for
            it, so the required-field check could never be satisfied and the
            submit button always failed validation with nothing to fix. */}
        <div className="mt-3">
          <Label>Description</Label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            placeholder="What will children learn in this course?"
            className="w-full bg-brand-50 border-2 border-brand-200 rounded-2xl px-4 py-3 font-body font-bold text-brand-900 outline-none transition-colors placeholder:text-brand-400 focus:border-brand-600"
          />
          <FieldError>{errors.description}</FieldError>
        </div>

        <label className="flex items-center gap-2 mt-4 font-body font-bold text-brand-700">
          <input type="checkbox" checked={form.isPremium} onChange={(e) => setForm({ ...form, isPremium: e.target.checked })} /> Premium (requires subscription)
        </label>

        {createError && (
          <p className="mt-4 text-sm font-bold text-red-600">{createError}</p>
        )}

        <Button type="submit" className="mt-5" disabled={createCourse.isPending || !!courseId}>
          {courseId ? '✓ Course created' : createCourse.isPending ? 'Creating…' : 'Create course'}
        </Button>
      </form>

      {/* Step 2: uploads (unlocked after course exists) */}
      <div className={'bg-white rounded-3xl border-2 border-brand-100 p-6 shadow-card mt-5 ' + (courseId ? '' : 'opacity-50 pointer-events-none')}>
        <div className="font-body-x text-[11px] text-brand-400 uppercase mb-3">Step 2 · Upload content</div>
        <label className="block border-2 border-dashed border-brand-300 rounded-2xl p-8 text-center cursor-pointer hover:bg-brand-50">
          <input type="file" className="hidden" accept="video/*,application/pdf,image/*" onChange={onFile} />
          <div className="text-4xl mb-2">⬆️</div>
          <div className="font-display font-extrabold text-brand-800">Click to upload video, PDF or image</div>
          <div className="font-body font-bold text-brand-500 text-sm mt-1">MP4, PDF, PNG, JPG</div>
        </label>
        {pct > 0 && pct < 100 && (
          <div className="mt-4 h-3 rounded-full bg-brand-100 overflow-hidden"><div className="h-full bg-grass-500" style={{ width: `${pct}%` }} /></div>
        )}
        {uploadError && (
          <p className="mt-4 text-sm font-bold text-red-600">{uploadError}</p>
        )}
        {files.length > 0 && (
          <ul className="mt-4 space-y-2">
            {files.map((f) => <li key={f} className="flex items-center gap-2 font-body font-bold text-brand-700 text-sm">✅ {f}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}