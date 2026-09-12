import { api } from "./client";
import type { Paginated } from "@/types/lms";
import type { ContentBlock, Difficulty, CourseAccess } from "./authoring";

export interface BrowseCourse {
  id: string; slug: string; title: string; shortDescription: string;
  thumbnailUrl: string | null; accent: string; difficulty: Difficulty; access: CourseAccess;
  language: string | null; ageBand: string | null; estimatedMinutes: number | null;
  issuesCertificate: boolean; publishedAt: string | null;
  subject: string; subjectAccent: string; grade: string | null;
  teacher: { id: string; name: string; avatarUrl: string | null } | null;
  totalLessons: number; studentCount: number;
  enrolled: boolean; enrollmentStatus: string | null;
  progressPercent: number; lessonsCompleted: number;
}

export interface BrowseFilters {
  subjects: { id: string; name: string; slug: string; accent: string }[];
  grades: { id: string; name: string }[];
  languages: string[];
  difficulties: string[];
  sorts: { value: string; label: string }[];
}

export interface AccessDecision {
  allowed: boolean;
  reason?: "NOT_PUBLISHED" | "SCHOOL_ONLY" | "PREMIUM" | "INVITE_ONLY" | "PREREQUISITE";
  message?: string;
  missingPrerequisites?: { id: string; title: string }[];
}

export interface CompletionState {
  percent: number; lessonsCompleted: number; totalLessons: number;
  complete: boolean; score: number | null; unmet: string[];
  requirements: {
    lessons: { required: boolean; done: number; total: number; ok: boolean };
    quizzes: { required: boolean; done: number; total: number; ok: boolean };
    assignments: { required: boolean; done: number; total: number; ok: boolean };
    exam: { required: boolean; passed: boolean; ok: boolean };
  };
}

export interface StudentLesson {
  id: string; title: string; description: string; type: string; order: number;
  estimatedMin: number; isRequired: boolean; objectives: string[];
  completed: boolean; percent: number; completedAt: string | null; locked: boolean;
  quiz: { id: string; title: string; passingScore: number } | null;
  assignments: { id: string; title: string; dueAt: string | null; maxScore: number }[];
}

export interface StudentCourseDetail {
  id: string; slug: string; title: string; shortDescription: string; description: string;
  thumbnailUrl: string | null; bannerUrl: string | null; trailerUrl: string | null;
  accent: string; difficulty: Difficulty; access: CourseAccess; language: string | null;
  ageBand: string | null; estimatedMinutes: number | null;
  learningPoints: string[]; requirements: string[]; tags: string[];
  issuesCertificate: boolean; passingScore: number; publishedAt: string | null;
  requireAllLessons: boolean; requireAllQuizzes: boolean; requireAllAssignments: boolean; requireFinalExam: boolean;
  subject: { id: string; name: string; accent: string } | null;
  grade: { id: string; name: string } | null;
  teacher: { id: string; name: string; avatarUrl: string | null } | null;
  sections: { id: string; title: string; description: string; order: number; weekNumber?: number | null; lessons: StudentLesson[] }[];
  exam: {
    id: string; title: string; durationMin: number | null; passingScore: number;
    scheduledAt: string | null; availableFrom: string | null; availableUntil: string | null;
    status: string; quizId: string; questionCount: number;
    result: { percent: number; passed: boolean } | null;
  } | null;
  totals: { modules: number; lessons: number; estimatedMinutes: number };
  accessDecision: AccessDecision;
  enrolled: boolean;
  enrollment: { status: string; progressPercent: number; lessonsCompleted: number; completedAt: string | null; lastLessonId: string | null } | null;
  completion: CompletionState | null;
  certificate: { id: string; code: string | null; issuedAt: string; score: number | null } | null;
}

export interface PlayerLesson {
  id: string; courseId: string; sectionId: string | null; title: string; description: string;
  type: string; order: number; estimatedMin: number; objectives: string[];
  videoUrl: string | null; status: string;
  contents: (ContentBlock & { id: string; order: number })[];
  resources: { id: string; name: string; url: string; kind: string; sizeBytes: number; description: string }[];
  quiz: {
    id: string; title: string; passingScore: number; maxAttempts: number; timeLimitSec: number | null;
    _count: { questions: number };
    attempts: { id: string; status: string; percent: number; passed: boolean; attemptNo: number }[];
  } | null;
  assignments: {
    id: string; title: string; instructions: string; dueAt: string | null; maxScore: number;
    rubric: { criterion: string; points: number; description?: string }[];
    submissionType: "TEXT" | "FILE" | "BOTH"; allowedFileTypes: string[]; allowResubmit: boolean;
    submissions: { id: string; status: string; score: number | null; feedback: string | null; submittedAt: string }[];
  }[];
  progress: { completed: boolean; percent: number; timeSpentSec: number; completedAt: string | null } | null;
}

export interface CurriculumEntry {
  id: string; title: string; type: string; estimatedMin: number; isRequired: boolean;
  sectionId: string; sectionTitle: string; weekNumber?: number | null;
  completed: boolean; percent: number;
}

export interface PlayerPayload {
  lesson: PlayerLesson;
  curriculum: CurriculumEntry[];
  nav: { index: number; total: number; previous: CurriculumEntry | null; next: CurriculumEntry | null };
  completion: CompletionState;
}

export interface MyCourse {
  id: string; slug: string; title: string; shortDescription: string; thumbnailUrl: string | null;
  subject: string; subjectAccent: string; grade: string | null; teacher: string | null;
  progressPercent: number; lessonsCompleted: number; totalLessons: number;
  issuesCertificate: boolean;
  currentLesson: { id: string; title: string; order: number } | null;
  lastActivityAt: string | null; completedAt: string | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
}

export interface BrowseQuery {
  page?: number; pageSize?: number; search?: string;
  subjectId?: string; gradeId?: string; difficulty?: string; language?: string;
  sort?: "newest" | "popular" | "progress" | "title";
}

export const learningApi = {
  browse: (q: BrowseQuery) => api.get<Paginated<BrowseCourse>>("/learning/browse", q),
  filters: () => api.get<BrowseFilters>("/learning/browse/filters"),
  myCourses: (status?: string) => api.get<MyCourse[]>("/learning/my-courses", { status }),
  courseDetail: (courseId: string) => api.get<StudentCourseDetail>(`/learning/courses/${courseId}`),
  access: (courseId: string) => api.get<AccessDecision>(`/learning/courses/${courseId}/access`),
  enroll: (courseId: string) => api.post<{ id: string; status: string; lastLessonId: string | null }>(`/learning/courses/${courseId}/enroll`, {}),
  unenroll: (courseId: string) => api.delete<{ ok: true }>(`/learning/courses/${courseId}/enroll`),
  progress: (courseId: string) => api.get<CompletionState & { enrollment: unknown }>(`/learning/courses/${courseId}/progress`),
  player: (courseId: string, lessonId: string) =>
    api.get<PlayerPayload>(`/learning/courses/${courseId}/lessons/${lessonId}`),
  saveProgress: (lessonId: string, dto: { percent?: number; timeSpentSec?: number }) =>
    api.post<{ id: string; percent: number; timeSpentSec: number }>(`/learning/lessons/${lessonId}/progress`, dto),
  complete: (lessonId: string, timeSpentSec = 0) =>
    api.post<{
      rewards: { xp: number; coins: number; leveledUp: boolean; newLevel: number };
      completion: CompletionState;
      certificate: { id: string; code: string | null; issuedAt: string } | null;
    }>(`/learning/lessons/${lessonId}/complete?timeSpentSec=${timeSpentSec}`, {}),
};
