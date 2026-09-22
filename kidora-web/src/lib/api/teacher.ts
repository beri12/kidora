import { api } from "./client";
import type {
  TeacherDashboard, ClassSummary, TaskItem, ActivityItem, Gradebook, CourseCard,
  AssignmentItem, Paginated, ProgressSeries, TopicPerformance,
} from "@/types/lms";

/** One student's answer to an assignment, as the marking screen sees it. */
export interface AssignmentSubmissionRow {
  id: string;
  status: "SUBMITTED" | "GRADED" | "RETURNED" | "LATE";
  content: string | null;
  attachments: { name: string; url: string; sizeBytes: number }[] | null;
  submittedAt: string;
  score: number | null;
  feedback: string | null;
  gradedAt: string | null;
  student: { id: string; name: string; avatarUrl?: string | null };
}

/** GET /teacher/assignments/:id/submissions — the rows and what they belong to. */
export interface AssignmentSubmissions {
  assignment: {
    id: string; title: string; description: string | null; instructions: string | null;
    status: "DRAFT" | "PUBLISHED" | "CLOSED";
    dueAt: string | null; maxScore: number; classId: string | null;
    course: { id: string; title: string } | null;
    class: { id: string; name: string } | null;
  };
  items: AssignmentSubmissionRow[];
}

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
  assignmentSubmissions: (id: string) =>
    api.get<AssignmentSubmissions>(`/teacher/assignments/${id}/submissions`),
  gradeSubmission: (submissionId: string, body: { score: number; feedback?: string }) =>
    api.patch<AssignmentSubmissionRow>(`/teacher/submissions/${submissionId}/grade`, body),
};
