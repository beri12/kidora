'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { uploadFile, type UploadResult } from '@/services/courseWizard';
import type { CourseInput } from '@/features/auth/schemas';

export interface Subject {
  id: string;
  slug: string;
  name: string;
  accent?: string;
}

export interface Course {
  id: string;
  title: string;
  slug?: string;
  description?: string | null;
  subjectSlug?: string | null;
  ageBand?: string | null;
  isPremium?: boolean;
  thumbnailUrl?: string | null;
  trailerUrl?: string | null;
  published?: boolean;
  /** Included by GET /api/courses; absent on endpoints that do not join it. */
  subject?: Subject | null;
  _count?: { lessons: number };
}

export const courseKeys = {
  all: ['courses'] as const,
  mine: ['courses', 'mine'] as const,
  detail: (id: string) => ['courses', id] as const,
};

/** Public catalog — GET /api/courses (PublicCoursesController). */
export function useCourses() {
  return useQuery({
    queryKey: courseKeys.all,
    queryFn: async () => (await api.get<Course[]>('/courses')).data,
  });
}

/** A single course with its curriculum — GET /api/courses/:id. */
export function useCourse(id: string) {
  return useQuery({
    queryKey: courseKeys.detail(id),
    queryFn: async () => (await api.get<Course>(`/courses/${id}`)).data,
    enabled: !!id,
  });
}

/**
 * The signed-in teacher's own courses.
 *
 * GET /api/teachers/courses rather than /api/courses/mine: both exist, but
 * the teachers route includes the lesson counts this list renders.
 */
export function useMyCourses() {
  return useQuery({
    queryKey: courseKeys.mine,
    queryFn: async () => (await api.get<Course[]>('/teachers/courses')).data,
  });
}

/**
 * Creates a course.
 *
 * The API's create route is POST /api/courses/draft (CreateDraftCourseDto),
 * which requires title + description. The upload form leaves description
 * optional, so an empty one is sent as a placeholder rather than omitted —
 * otherwise class-validator rejects the whole request with a 400.
 */
export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CourseInput) => {
      const res = await api.post<Course>('/courses/draft', {
        title: input.title,
        description: input.description?.trim() ? input.description : input.title,
        topic: input.subjectSlug,
        levelId: input.ageBand,
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: courseKeys.mine });
      qc.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}

export interface UploadResourceVars {
  file: File;
  lessonId?: string;
  onProgress?: (percent: number) => void;
}

/**
 * Uploads a video / PDF / image for a course.
 *
 * Goes through the generic POST /api/uploads endpoint, which picks the
 * storage driver (local or S3) and returns an absolute URL that can be used
 * directly as <img src> / <video src>. The courseId is accepted so callers
 * can key their own state off it and so the uploaded asset can later be
 * attached to the right course; the upload route itself is course-agnostic.
 */
export function useUploadResource(courseId: string) {
  const qc = useQueryClient();
  return useMutation<UploadResult, unknown, UploadResourceVars>({
    mutationFn: ({ file, onProgress }) => uploadFile(file, onProgress),
    onSuccess: () => {
      if (courseId) qc.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
    },
  });
}
