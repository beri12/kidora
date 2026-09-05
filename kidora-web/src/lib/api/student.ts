import { api } from "./client";
import type {
  StudentDashboard, CourseCard, Quest, AssignmentItem, QuizItem, ExamItem, CertificateItem,
  BadgeItem, LeaderboardEntry, WorldMap, AiTutorMessage, AchievementItem, Paginated,
} from "@/types/lms";

export const studentApi = {
  dashboard: () => api.get<StudentDashboard>("/student/dashboard"),
  courses: (status?: string) => api.get<CourseCard[]>("/student/courses", { status }),
  quests: () => api.get<Quest[]>("/student/quests"),
  claimQuest: (id: string) => api.post<Quest>(`/student/quests/${id}/claim`),
  assignments: (status?: string) => api.get<AssignmentItem[]>("/student/assignments", { status }),
  submitAssignment: (id: string, form: FormData) => api.post<AssignmentItem>(`/student/assignments/${id}/submit`, form),
  quizzes: (status?: string) => api.get<QuizItem[]>("/student/quizzes", { status }),
  exams: () => api.get<ExamItem[]>("/student/exams"),
  certificates: () => api.get<CertificateItem[]>("/student/certificates"),
  achievements: () => api.get<AchievementItem[]>("/student/achievements"),
  badges: () => api.get<BadgeItem[]>("/student/badges"),
  leaderboard: (scope: "school" | "class", period: "week" | "month") =>
    api.get<LeaderboardEntry[]>("/student/leaderboard", { scope, period }),
  world: () => api.get<WorldMap>("/student/world"),
  aiHistory: () => api.get<Paginated<AiTutorMessage>>("/lms/ai/tutor/history", { pageSize: 50 }),
  aiAsk: (body: { message: string; lessonId?: string; kind?: string }) =>
    api.post<{ reply: AiTutorMessage; remainingToday: number }>("/lms/ai/tutor", body),
};
