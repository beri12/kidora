import { api } from "./client";
import type { Course } from "@/types";

/** Enrollment — PublicCoursesController. */
export interface Enrollment {
  id: string;
  status: "ACTIVE" | "COMPLETED" | "DROPPED";
  progressPercent: number;
  lessonsCompleted: number;
  lastLessonId?: string | null;
}

export const coursesApi = {
  catalogue: () => api.get<Course[]>("/courses"),
  detail: (id: string) => api.get<Course>(`/courses/${id}`),
  enroll: (id: string) => api.post<Enrollment>(`/courses/${id}/enroll`),
  unenroll: (id: string) => api.delete<{ ok: boolean }>(`/courses/${id}/enroll`),
  enrollment: (id: string) =>
    api.get<{ enrolled: boolean; enrollment: Enrollment | null }>(`/courses/${id}/enrollment`),
};
