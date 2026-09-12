import { api } from "./client";
import type { Paginated } from "@/types/lms";

/* ------------------------------------------------------------------ types */

export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type CourseAccess = "FREE" | "PREMIUM" | "SCHOOL_ONLY" | "INVITE_ONLY";
export type CourseStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "UNPUBLISHED" | "ARCHIVED";
export type LessonStatus = "DRAFT" | "PUBLISHED";
export type QuestionType =
  | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "MULTIPLE_SELECT" | "SHORT_ANSWER" | "MATCHING" | "ORDERING";
export type ContentType =
  | "HEADING" | "PARAGRAPH" | "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT"
  | "CODE" | "CALLOUT" | "EXAMPLE" | "QUESTION" | "INTERACTIVE" | "RESOURCE" | "TEXT"
  // Items that are an assessment: they point at a real Quiz or Assignment.
  | "QUIZ" | "ASSIGNMENT" | "PEER_REVIEW";

export interface Checkpoint {
  atSeconds: number;
  prompt: string;
  options: string[];
  correct: number;
}

export interface Download {
  name: string;
  url: string;
  sizeBytes?: number;
  mimeType?: string;
}

/** One item in a lesson — Coursera's `course_items`. */
export interface ContentBlock {
  id?: string;
  type: ContentType;
  title?: string;
  body?: string | null;
  url?: string | null;
  meta?: Record<string, unknown>;
  order?: number;

  estimatedMin?: number;
  isRequired?: boolean;

  // video
  durationSeconds?: number | null;
  transcriptVtt?: string | null;
  checkpoints?: Checkpoint[];

  // reading
  downloadUrls?: Download[];

  // an item that IS an assessment
  quizId?: string | null;
  assignmentId?: string | null;

  /** Its own lifecycle, independent of the course's. */
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

export interface AuthoredLesson {
  id: string; title: string; description: string; type: string; status: LessonStatus;
  order: number; estimatedMin: number; isRequired: boolean; objectives: string[];
  videoUrl?: string | null; sectionId?: string | null;
  contents?: ContentBlock[];
  quiz?: { id: string; title: string; published: boolean; _count?: { questions: number } } | null;
  assignments?: { id: string; title: string; status: string; dueAt: string | null }[];
}

export interface AuthoredSection {
  id: string; title: string; description: string; order: number;
  /** Which week of the course this module is. */
  weekNumber?: number | null;
  lessons: AuthoredLesson[];
}

export interface AuthoredQuestion {
  id?: string;
  prompt: string;
  type: QuestionType;
  options?: string[];
  correct?: number;
  correctOptions?: number[];
  correctOrder?: number[];
  pairs?: { left: string; right: string }[];
  answerText?: string | null;
  explanation?: string | null;
  hint?: string | null;
  imageUrl?: string | null;
  points?: number;
  difficulty?: Difficulty;
}

export interface AuthoredQuiz {
  id: string; title: string; description: string; lessonId?: string | null;
  published: boolean; passingScore: number; maxAttempts: number; timeLimitSec?: number | null;
  shuffle: boolean; shuffleAnswers: boolean; showExplanations: boolean; showScore: boolean;
  allowRetry: boolean; isRequired: boolean;
  grading: "FORMATIVE" | "SUMMATIVE";
  questions: AuthoredQuestion[];
}

export interface RubricRow { criterion: string; points: number; description?: string }

export interface AuthoredAssignment {
  id: string; title: string; description: string; instructions: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED"; dueAt: string | null; maxScore: number;
  allowLate: boolean; allowResubmit: boolean; isRequired: boolean;
  peerReviewCount: number; peerReviewsDue: number;
  submissionType: "TEXT" | "FILE" | "BOTH"; allowedFileTypes: string[];
  rubric: RubricRow[]; lessonId?: string | null;
}

export interface AuthoredExam {
  id: string; title: string; description: string; status: "DRAFT" | "SCHEDULED" | "OPEN" | "CLOSED";
  scheduledAt: string | null; availableFrom: string | null; availableUntil: string | null;
  durationMin: number | null; passingScore: number; issuesCertificate: boolean;
  quiz: { id: string; questions: AuthoredQuestion[] };
}

export interface CourseTree {
  id: string; slug: string; title: string; shortDescription: string; description: string;
  status: CourseStatus; published: boolean; difficulty: Difficulty; access: CourseAccess;
  thumbnailUrl: string | null; bannerUrl: string | null; trailerUrl: string | null;
  language: string | null; subtitleLanguage: string | null; ageBand: string | null;
  topic: string | null; category: string | null; subCategory: string | null;
  learningPoints: string[]; requirements: string[]; tags: string[];
  estimatedMinutes: number | null;
  requireAllLessons: boolean; requireAllQuizzes: boolean; requireAllAssignments: boolean;
  requireFinalExam: boolean; passingScore: number; issuesCertificate: boolean;
  subject: { id: string; name: string; slug: string; accent: string } | null;
  grade: { id: string; name: string } | null;
  teacher: { id: string; name: string; avatarUrl: string | null } | null;
  sections: AuthoredSection[];
  quizzes: { id: string; title: string; sectionId: string | null; published: boolean; isRequired: boolean; _count: { questions: number } }[];
  assignments: { id: string; title: string; status: string; dueAt: string | null; maxScore: number; isRequired: boolean; lessonId: string | null }[];
  exams: { id: string; title: string; status: string; scheduledAt: string | null; durationMin: number | null; passingScore: number; quiz: { id: string; _count: { questions: number } } }[];
  _count: { lessons: number; enrollments: number };
}

export interface ChecklistItem {
  key: string; label: string; ok: boolean; required: boolean; detail?: string;
}
export interface PublishChecklist { ready: boolean; items: ChecklistItem[]; blockers: string[] }

/** The preview endpoint projects lessons narrowly and adds a content-block count. */
export interface PreviewLesson {
  id: string; title: string; description: string; type: string; estimatedMin: number;
  isRequired: boolean; status: LessonStatus; objectives: string[];
  _count: { contents: number };
}
export interface PreviewSection {
  id: string; title: string; description: string; order: number;
  weekNumber?: number | null;
  lessons: PreviewLesson[];
}

export interface CoursePreview extends Omit<CourseTree, "quizzes" | "assignments" | "exams" | "sections"> {
  sections: PreviewSection[];
  totals: { modules: number; lessons: number; estimatedMinutes: number; quizzes: number; assignments: number; hasExam: boolean };
  completionRules: {
    requireAllLessons: boolean; requireAllQuizzes: boolean; requireAllAssignments: boolean;
    requireFinalExam: boolean; passingScore: number; issuesCertificate: boolean;
  };
  quizzes: CourseTree["quizzes"];
  assignments: CourseTree["assignments"];
  exams: CourseTree["exams"];
}

export interface CourseBasics {
  title: string;
  shortDescription?: string;
  description?: string;
  subjectId?: string;
  subjectSlug?: string;
  gradeId?: string;
  ageBand?: string;
  language?: string;
  subtitleLanguage?: string;
  difficulty?: Difficulty;
  learningPoints?: string[];
  requirements?: string[];
  tags?: string[];
  category?: string;
  subCategory?: string;
  topic?: string;
  thumbnailUrl?: string;
  bannerUrl?: string;
  trailerUrl?: string;
  estimatedMinutes?: number;
  access?: CourseAccess;
}

export interface CompletionRules {
  requireAllLessons?: boolean;
  requireAllQuizzes?: boolean;
  requireAllAssignments?: boolean;
  requireFinalExam?: boolean;
  passingScore?: number;
  issuesCertificate?: boolean;
}

/* ----------------------------------------------------------------- client */

export const authoringApi = {
  // courses
  createCourse: (dto: CourseBasics) => api.post<CourseTree>("/authoring/courses", dto),
  courseTree: (courseId: string) => api.get<CourseTree>(`/authoring/courses/${courseId}`),
  updateCourse: (courseId: string, dto: Partial<CourseBasics>) =>
    api.patch<CourseTree>(`/authoring/courses/${courseId}`, dto),
  setCompletionRules: (courseId: string, dto: CompletionRules) =>
    api.patch<CompletionRules & { id: string }>(`/authoring/courses/${courseId}/completion`, dto),
  checklist: (courseId: string) => api.get<PublishChecklist>(`/authoring/courses/${courseId}/checklist`),
  preview: (courseId: string) => api.get<CoursePreview>(`/authoring/courses/${courseId}/preview`),
  publish: (courseId: string) => api.post<CourseTree>(`/authoring/courses/${courseId}/publish`, {}),
  unpublish: (courseId: string) => api.post<CourseTree>(`/authoring/courses/${courseId}/unpublish`, {}),
  archive: (courseId: string) => api.post<CourseTree>(`/authoring/courses/${courseId}/archive`, {}),

  // sections
  createSection: (courseId: string, dto: { title: string; description?: string; weekNumber?: number }) =>
    api.post<AuthoredSection>(`/authoring/courses/${courseId}/sections`, dto),
  updateSection: (id: string, dto: { title?: string; description?: string; weekNumber?: number }) =>
    api.patch<AuthoredSection>(`/authoring/sections/${id}`, dto),
  deleteSection: (id: string) => api.delete<{ ok: true }>(`/authoring/sections/${id}`),
  duplicateSection: (id: string) => api.post<AuthoredSection>(`/authoring/sections/${id}/duplicate`, {}),
  reorderSections: (courseId: string, ids: string[]) =>
    api.patch<AuthoredSection[]>(`/authoring/courses/${courseId}/sections/reorder`, { ids }),

  // lessons
  createLesson: (sectionId: string, dto: Partial<AuthoredLesson> & { title: string }) =>
    api.post<AuthoredLesson>(`/authoring/sections/${sectionId}/lessons`, dto),
  getLesson: (id: string) => api.get<AuthoredLesson>(`/authoring/lessons/${id}`),
  updateLesson: (id: string, dto: Partial<AuthoredLesson>) =>
    api.patch<AuthoredLesson>(`/authoring/lessons/${id}`, dto),
  deleteLesson: (id: string) => api.delete<{ ok: true }>(`/authoring/lessons/${id}`),
  duplicateLesson: (id: string) => api.post<AuthoredLesson>(`/authoring/lessons/${id}/duplicate`, {}),
  reorderLessons: (sectionId: string, ids: string[]) =>
    api.patch<AuthoredLesson[]>(`/authoring/sections/${sectionId}/lessons/reorder`, { ids }),

  // lesson content
  saveContent: (lessonId: string, blocks: ContentBlock[]) =>
    api.put<ContentBlock[]>(`/authoring/lessons/${lessonId}/content`, { blocks }),

  // quizzes
  listQuizzes: (courseId: string) => api.get<AuthoredQuiz[]>(`/authoring/courses/${courseId}/quizzes`),
  createQuiz: (courseId: string, dto: Partial<AuthoredQuiz> & { title: string }) =>
    api.post<AuthoredQuiz>(`/authoring/courses/${courseId}/quizzes`, dto),
  getQuiz: (id: string) => api.get<AuthoredQuiz>(`/authoring/quizzes/${id}`),
  updateQuiz: (id: string, dto: Partial<AuthoredQuiz>) => api.patch<AuthoredQuiz>(`/authoring/quizzes/${id}`, dto),
  deleteQuiz: (id: string) => api.delete<{ ok: true }>(`/authoring/quizzes/${id}`),

  // assignments
  listAssignments: (courseId: string) => api.get<AuthoredAssignment[]>(`/authoring/courses/${courseId}/assignments`),
  createAssignment: (courseId: string, dto: Partial<AuthoredAssignment> & { title: string }) =>
    api.post<AuthoredAssignment>(`/authoring/courses/${courseId}/assignments`, dto),
  updateAssignment: (id: string, dto: Partial<AuthoredAssignment>) =>
    api.patch<AuthoredAssignment>(`/authoring/assignments/${id}`, dto),
  setAssignmentStatus: (id: string, status: "DRAFT" | "PUBLISHED" | "CLOSED") =>
    api.patch<AuthoredAssignment>(`/authoring/assignments/${id}/status/${status}`, {}),
  deleteAssignment: (id: string) => api.delete<{ ok: true }>(`/authoring/assignments/${id}`),

  // exam
  getExam: (courseId: string) => api.get<AuthoredExam | null>(`/authoring/courses/${courseId}/exam`),
  upsertExam: (courseId: string, dto: Partial<AuthoredExam> & { title: string; questions?: AuthoredQuestion[] }) =>
    api.put<AuthoredExam>(`/authoring/courses/${courseId}/exam`, dto),
  setExamStatus: (courseId: string, status: "DRAFT" | "SCHEDULED" | "OPEN" | "CLOSED") =>
    api.patch<AuthoredExam>(`/authoring/courses/${courseId}/exam/status/${status}`, {}),
  deleteExam: (courseId: string) => api.delete<{ ok: true }>(`/authoring/courses/${courseId}/exam`),
};

/* --------------------------------------------- teacher library (sidebar) */

export interface TeacherLessonRow {
  id: string; title: string; type: string; status: LessonStatus; estimatedMin: number;
  isRequired: boolean; order: number; updatedAt: string;
  section: { id: string; title: string } | null;
  course: { id: string; title: string };
  subject: string; subjectAccent?: string;
  blockCount: number; completedBy: number; hasContent: boolean;
}

export interface TeacherQuizRow {
  id: string; title: string; published: boolean; passingScore: number; maxAttempts: number;
  timeLimitSec: number | null; isRequired: boolean; createdAt: string;
  course: { id: string; title: string } | null;
  lesson: { id: string; title: string } | null;
  questionCount: number; attemptCount: number;
  averagePercent: number | null; passRate: number | null;
}

export interface TeacherExamRow {
  id: string; title: string; status: string; scheduledAt: string | null;
  availableFrom: string | null; availableUntil: string | null;
  durationMin: number | null; passingScore: number; issuesCertificate: boolean;
  course: { id: string; title: string };
  class: { id: string; name: string } | null;
  quizId: string; questionCount: number; sat: number;
  averagePercent: number | null; passRate: number | null;
}

export interface TeacherResourceRow {
  id: string; name: string; description: string; url: string;
  kind: "video" | "document" | "image" | "other";
  sizeBytes: number; mimeType: string | null; createdAt: string;
  course: { id: string; title: string } | null;
  lesson: { id: string; title: string } | null;
}

export const teacherLibraryApi = {
  lessons: (q: { page?: number; pageSize?: number; search?: string; courseId?: string; status?: string }) =>
    api.get<Paginated<TeacherLessonRow>>("/teacher/lessons", q),
  quizzes: (q: { page?: number; pageSize?: number; search?: string; courseId?: string; kind?: string }) =>
    api.get<Paginated<TeacherQuizRow>>("/teacher/quizzes", q),
  exams: (q: { page?: number; pageSize?: number; search?: string; status?: string }) =>
    api.get<Paginated<TeacherExamRow>>("/teacher/exams", q),
  resources: (q: { page?: number; pageSize?: number; search?: string; courseId?: string; kind?: string }) =>
    api.get<Paginated<TeacherResourceRow>>("/teacher/resources", q),
  addResource: (dto: { name: string; url: string; description?: string; courseId?: string; lessonId?: string; mimeType?: string; sizeBytes?: number }) =>
    api.post<TeacherResourceRow>("/teacher/resources", dto),
  attachResource: (id: string, lessonId: string | null) =>
    api.patch<TeacherResourceRow>(`/teacher/resources/${id}/attach`, { lessonId }),
  deleteResource: (id: string) => api.delete<{ ok: true }>(`/teacher/resources/${id}`),
};

/* ------------------------------------------------------------- the studio */

export type ItemStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface LearningOutcome {
  id: string;
  courseId: string;
  sectionId: string | null;
  text: string;
  order: number;
}

export interface CourseInstructor {
  id: string;
  role: "LEAD" | "CO_INSTRUCTOR" | "ASSISTANT";
  bio: string | null;
  order: number;
  user: { id: string; name: string; avatarUrl: string | null; email: string };
}

export interface ReadinessLine {
  key: string;
  label: string;
  count: number;
  ok: boolean;
  required: boolean;
  detail?: string;
}

export interface Readiness {
  status: CourseStatus;
  access: CourseAccess;
  lines: ReadinessLine[];
  blockers: string[];
  ready: boolean;
}

export interface CourseVersionRow {
  id: string;
  version: number;
  note: string | null;
  createdAt: string;
  publishedBy: { id: string; name: string } | null;
}

export interface ExamRow {
  id: string;
  title: string;
  status: string;
  sectionId: string | null;
  passingScore: number;
  durationMin: number | null;
  section: { id: string; title: string; weekNumber: number | null; order: number } | null;
  quiz: { id: string; _count: { questions: number; attempts: number } };
}

export const studioApi = {
  outcomes: (courseId: string, sectionId?: string) =>
    api.get<LearningOutcome[]>(`/authoring/courses/${courseId}/outcomes`, sectionId ? { sectionId } : undefined),
  addOutcome: (courseId: string, dto: { text: string; sectionId?: string }) =>
    api.post<LearningOutcome>(`/authoring/courses/${courseId}/outcomes`, dto),
  updateOutcome: (id: string, dto: { text: string }) => api.patch<LearningOutcome>(`/authoring/outcomes/${id}`, dto),
  deleteOutcome: (id: string) => api.delete<{ ok: true }>(`/authoring/outcomes/${id}`),
  reorderOutcomes: (courseId: string, ids: string[], sectionId?: string) =>
    api.patch<LearningOutcome[]>(
      `/authoring/courses/${courseId}/outcomes/reorder${sectionId ? `?sectionId=${sectionId}` : ""}`,
      { ids },
    ),

  instructors: (courseId: string) => api.get<CourseInstructor[]>(`/authoring/courses/${courseId}/instructors`),
  addInstructor: (courseId: string, dto: { email: string; role?: CourseInstructor["role"]; bio?: string }) =>
    api.post<CourseInstructor>(`/authoring/courses/${courseId}/instructors`, dto),
  removeInstructor: (courseId: string, id: string) =>
    api.delete<{ ok: true }>(`/authoring/courses/${courseId}/instructors/${id}`),

  setItemStatus: (id: string, status: ItemStatus) =>
    api.patch<ContentBlock & { id: string; status: ItemStatus }>(`/authoring/content/${id}/status/${status}`, {}),

  readiness: (courseId: string) => api.get<Readiness>(`/authoring/courses/${courseId}/readiness`),
  versions: (courseId: string) => api.get<CourseVersionRow[]>(`/authoring/courses/${courseId}/versions`),

  exams: (courseId: string) => api.get<ExamRow[]>(`/authoring/courses/${courseId}/exams`),
  moduleExam: (courseId: string, sectionId: string) =>
    api.get<AuthoredExam | null>(`/authoring/courses/${courseId}/sections/${sectionId}/exam`),
  upsertModuleExam: (courseId: string, sectionId: string, dto: Partial<AuthoredExam> & { title: string; questions?: AuthoredQuestion[] }) =>
    api.put<AuthoredExam>(`/authoring/courses/${courseId}/sections/${sectionId}/exam`, dto),
  deleteModuleExam: (courseId: string, sectionId: string) =>
    api.delete<{ ok: true }>(`/authoring/courses/${courseId}/sections/${sectionId}/exam`),
};
