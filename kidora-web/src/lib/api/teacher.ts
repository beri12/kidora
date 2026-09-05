import { api } from "./client";
import type {
  TeacherDashboard, ClassSummary, TaskItem, ActivityItem, Gradebook, CourseCard,
  AssignmentItem, Paginated, ProgressSeries, TopicPerformance,
} from "@/types/lms";

export interface TeacherStudentRow {
  id: string; name: string; avatarUrl?: string | null; className: string; grade: string;
  progressPercent: number; averageScore: number; health: "ON_TRACK" | "NEEDS_SUPPORT" | "AT_RISK";
}

export interface AnalyticsFilters { classId?: string; courseId?: string; subjectId?: string; from?: string; to?: string; }

export interface TeacherAnalytics {
  classPerformance: ProgressSeries;
  topics: TopicPerformance[];
  assignmentCompletion: number;
  quizAverage: number;
  examAverage: number;
  atRisk: TeacherStudentRow[];
}

export const teacherApi = {
  dashboard: (range?: string) => api.get<TeacherDashboard>("/teacher/dashboard", { range }),
  classes: () => api.get<ClassSummary[]>("/teacher/classes"),
  classDetail: (id: string) => api.get<ClassSummary & { students: TeacherStudentRow[]; progress: ProgressSeries }>(`/teacher/classes/${id}`),
  students: (q: { search?: string; classId?: string; page?: number; pageSize?: number }) =>
    api.get<Paginated<TeacherStudentRow>>("/teacher/students", q),
  courses: (status?: string) => api.get<(Omit<CourseCard, "status"> & { status: "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED"; studentCount?: number })[]>("/teacher/courses", { status }),
  tasks: (bucket?: string) => api.get<TaskItem[]>("/teacher/tasks", { bucket }),
  activity: (page = 1, pageSize = 20) => api.get<Paginated<ActivityItem>>("/teacher/activity", { page, pageSize }),
  gradebook: (q: { classId?: string; courseId?: string; page?: number; pageSize?: number }) =>
    api.get<Gradebook>("/teacher/gradebook", q),
  analytics: (f: AnalyticsFilters) => api.get<TeacherAnalytics>("/teacher/analytics", f),
  assignments: (q: { classId?: string; status?: string; page?: number }) =>
    api.get<Paginated<AssignmentItem & { submitted: number; total: number }>>("/teacher/assignments", q),
};
