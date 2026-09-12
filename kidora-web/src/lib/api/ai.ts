import { api } from "./client";

/** AiTutorController (@Controller('ai')). */
export interface AiMessage { id: string; message: string; response: string; createdAt: string }

export const aiApi = {
  history: () => api.get<AiMessage[]>("/ai/chat/history"),
  ask: (message: string, studentId?: string) => api.post<TutorReply>("/ai/chat", { message, studentId }),
};

/** Shape returned by AiTutorService.chat(). */
export interface TutorReply {
  answer: string;
  suggestions: string[];
  recommendedLessons?: { id: string; title: string }[];
}

/* --------------------------------------------- teaching aids (teachers only) */

export interface LessonPlanDraft {
  type: "lesson_plan";
  title: string;
  summary: string;
  objectives: string[];
  sections: { heading: string; body: string }[];
  activities: string[];
  check_questions: string[];
  materials: string[];
  estimated_min: number;
  degraded: boolean;
}

export interface DraftQuestion {
  prompt: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "MULTIPLE_SELECT" | "SHORT_ANSWER";
  options: string[];
  correct?: number | null;
  correct_options: number[];
  answer_text?: string | null;
  explanation?: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
}

export interface QuizDraftResult {
  type: "quiz_draft";
  title: string;
  questions: DraftQuestion[];
  degraded: boolean;
}

export interface ClassAnalysisResult {
  type: "class_analysis";
  summary: string;
  strengths: string[];
  weaknesses: string[];
  interventions: { focus: string; why: string; suggestion: string }[];
  differentiation: string[];
  degraded: boolean;
}

export const teachingAiApi = {
  lessonPlan: (dto: {
    subject: string; grade: string; topic: string; objectives?: string[];
    difficulty?: "EASY" | "MEDIUM" | "HARD"; durationMin?: number; language?: string; notes?: string;
  }) => api.post<LessonPlanDraft>("/ai/teaching/lesson-plan", dto),

  quizDraft: (dto: {
    subject: string; grade: string; topic: string; questionCount?: number;
    difficulty?: "EASY" | "MEDIUM" | "HARD"; questionTypes?: string[]; language?: string;
  }) => api.post<QuizDraftResult>("/ai/teaching/quiz", dto),

  analyseClass: (dto: { classId?: string; courseId?: string; question?: string }) =>
    api.post<ClassAnalysisResult>("/ai/teaching/analyse-class", dto),
};
