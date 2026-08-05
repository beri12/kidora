import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { Course } from '@/types';
import type { CourseInput } from '@/features/auth/schemas';

export function useCourses(subject?: string) {
  return useQuery({
    queryKey: ['courses', subject ?? 'all'],
    queryFn: async () => (await api.get<Course[]>('/courses', { params: { subject } })).data,
  });
}

export function useCourse(slug: string) {
  return useQuery({
    queryKey: ['course', slug],
    queryFn: async () => (await api.get<Course>(`/courses/${slug}`)).data,
    enabled: !!slug,
  });
}

// Teacher: list only their own courses, published or draft.
export function useMyCourses() {
  return useQuery({
    queryKey: ['courses', 'mine'],
    queryFn: async () => (await api.get<Course[]>('/courses/mine')).data,
  });
}

// Teacher: create a course.
export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CourseInput) => {
      const res = await api.post<Course>('/courses', input);

      if (!res.data) {
        // The request succeeded (likely a 204) but the backend sent no body,
        // so there's no created course to work with. This should be fixed
        // server-side (the create handler needs to return the entity), but
        // fail loudly here instead of letting `course.id` crash silently.
        throw new Error(
          'Course was created but the server returned no data. Check the backend create handler.'
        );
      }

      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['courses', 'mine'] });
    },
  });
}

// Teacher: upload a lesson resource (video/document/etc) with progress.
export function useUploadResource(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, lessonId, onProgress }: { file: File; lessonId: string; onProgress?: (pct: number) => void }) => {
      const form = new FormData();
      form.append('file', file);
      form.append('lessonId', lessonId);
      const { data } = await api.post(`/uploads/lesson`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / (e.total ?? 1))),
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course'] }),
  });
}