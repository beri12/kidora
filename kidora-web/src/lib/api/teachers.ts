import { api } from "./client";
import type { Course } from "@/types";

/** TeachersController (@Controller('teachers')) — TEACHER/ADMIN only. */
/** Exactly what TeachersController.students() returns. */
export interface TeacherStudent {
  id: string;
  name: string;
  /** First letter, for the avatar tile. */
  initial: string;
  /** 0-100, derived from points server-side. */
  progress: number;
  status: string;
}

export const teachersApi = {
  myCourses: () => api.get<Course[]>("/teachers/courses"),
  students: () => api.get<TeacherStudent[]>("/teachers/students"),
};
