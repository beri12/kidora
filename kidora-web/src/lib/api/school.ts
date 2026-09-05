import { api } from "./client";
import type {
  SchoolDashboard, SchoolStudentRow, SchoolTeacherRow, ClassSummary, Paginated, Billing,
  CourseCard, ProgressSeries,
} from "@/types/lms";

export interface ListQuery { search?: string; page?: number; pageSize?: number; gradeId?: string; classId?: string; status?: string; subjectId?: string; }

export const schoolApi = {
  dashboard: (range?: string) => api.get<SchoolDashboard>("/school/dashboard", { range }),
  students: (q: ListQuery) => api.get<Paginated<SchoolStudentRow>>("/school/students", q),
  teachers: (q: ListQuery) => api.get<Paginated<SchoolTeacherRow>>("/school/teachers", q),
  classes: (q: ListQuery) => api.get<Paginated<ClassSummary>>("/school/classes", q),
  courses: (q: ListQuery) => api.get<Paginated<Omit<CourseCard, "status"> & { status: "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED"; teacher?: string | null }>>("/school/courses", q),
  analytics: (q: { from?: string; to?: string }) => api.get<{ progress: ProgressSeries; subjects: SchoolDashboard["topSubjects"]; health: SchoolDashboard["studentHealth"] }>("/school/analytics", q),
  billing: () => api.get<Billing>("/school/billing"),
  createStudent: (body: { name: string; email: string; gradeId?: string; classId?: string }) => api.post<SchoolStudentRow>("/school/students", body),
  createTeacher: (body: { name: string; email: string; subjectId?: string }) => api.post<SchoolTeacherRow>("/school/teachers", body),
};
