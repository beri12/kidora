"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { Course } from "@/types";

/**
 * Course data hooks.
 *
 * Everything goes through the shared axios instance in lib/axios, so the
 * bearer token and the 401-refresh retry apply here exactly as they do to the
 * auth calls. The query client is installed once by the root layout.
 *
 * Backend routes these map to (all under NEXT_PUBLIC_API_URL):
 *   GET  /courses               public catalogue  (PublicCoursesController)
 *   GET  /courses/:id           one published course, with its sections
 *   GET  /courses/mine          the signed-in teacher's own courses
 *   POST /courses/draft         create a draft course
 *   POST /courses/upload/video      | thumbnail | document
 */

export const courseKeys = {
  all: ["courses"] as const,
  published: ["courses", "published"] as const,
  detail: (id: string) => ["courses", "detail", id] as const,
  mine: ["courses", "mine"] as const,
};

const LONG = 5 * 60_000;

/** Public catalogue. Used by /courses; safe to call signed out. */
export function useCourses() {
  return useQuery({
    queryKey: courseKeys.published,
    queryFn: async () => (await api.get<Course[]>("/courses")).data,
    staleTime: LONG,
  });
}

/** One published course, including its sections and lectures. */
export function useCourse(id: string) {
  return useQuery({
    queryKey: courseKeys.detail(id),
    queryFn: async () => (await api.get<Course>(`/courses/${id}`)).data,
    enabled: Boolean(id),
    staleTime: LONG,
  });
}

/** The signed-in teacher's own courses, drafts included. */
export function useMyCourses() {
  return useQuery({
    queryKey: courseKeys.mine,
    queryFn: async () => (await api.get<Course[]>("/courses/mine")).data,
    staleTime: 30_000,
  });
}

export interface CreateCourseInput {
  title: string;
  description: string;
  subjectSlug?: string;
  ageBand?: string;
  isPremium?: boolean;
}

/** Creates a draft course and refreshes the teacher's list. */
export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCourseInput) =>
      (await api.post<Course>("/courses/draft", input)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: courseKeys.mine });
      qc.invalidateQueries({ queryKey: courseKeys.published });
    },
  });
}

export interface UploadInput {
  file: File;
  /** Accepted for call-site compatibility; the upload endpoints are course-scoped. */
  lessonId?: string;
  onProgress?: (percent: number) => void;
}

export interface UploadedResource {
  url: string;
  fileName: string;
}

/**
 * Routes the file to the endpoint that accepts its type — each one enforces
 * its own mime filter and size cap server-side, so picking the wrong one
 * fails with a 400 rather than storing the file.
 */
function endpointFor(file: File): string {
  if (file.type.startsWith("video/")) return "/courses/upload/video";
  if (file.type.startsWith("image/")) return "/courses/upload/thumbnail";
  return "/courses/upload/document";
}

/**
 * Uploads one file and reports progress.
 *
 * Content-Type is deleted rather than set: the browser has to generate the
 * multipart boundary itself, and the axios instance's default
 * `application/json` header would otherwise override it and the request would
 * arrive unparseable.
 */
export function useUploadResource(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, onProgress }: UploadInput) => {
      const body = new FormData();
      body.append("file", file);

      const { data } = await api.post<UploadedResource>(endpointFor(file), body, {
        headers: { "Content-Type": undefined },
        timeout: 0, // a 500MB video will outlast the client's default timeout
        onUploadProgress: (e) => {
          if (!onProgress || !e.total) return;
          onProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      return data;
    },
    onSuccess: () => {
      if (courseId) qc.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      qc.invalidateQueries({ queryKey: courseKeys.mine });
    },
  });
}

// ------------------------------------------------------------------ Enrollment

/**
 * Enrolling is what puts a course on the student's dashboard: every LMS
 * student view reads CourseEnrollment, so browsing alone shows nothing until
 * this runs.
 */
export function useEnrollment(courseId: string) {
  return useQuery({
    queryKey: [...courseKeys.detail(courseId), "enrollment"],
    queryFn: async () => (await api.get<{ enrolled: boolean }>(`/courses/${courseId}/enrollment`)).data,
    enabled: Boolean(courseId),
    staleTime: 30_000,
  });
}

export function useEnroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) => (await api.post(`/courses/${courseId}/enroll`)).data,
    onSuccess: (_d, courseId) => {
      qc.invalidateQueries({ queryKey: [...courseKeys.detail(courseId), "enrollment"] });
      // The student dashboard and My Courses both read the enrollment list.
      qc.invalidateQueries({ queryKey: ["student"] });
    },
  });
}

export function useUnenroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) => (await api.delete(`/courses/${courseId}/enroll`)).data,
    onSuccess: (_d, courseId) => {
      qc.invalidateQueries({ queryKey: [...courseKeys.detail(courseId), "enrollment"] });
      qc.invalidateQueries({ queryKey: ["student"] });
    },
  });
}
