/** Contracts shared with the Python AI service (apps/ai-service). */

export interface StudentContext {
  student_id: string;
  grade?: string | null;
  subject?: string | null;
  course_id?: string | null;
  course_title?: string | null;
  lesson_id?: string | null;
  lesson_title?: string | null;
  /** 0-1 probability the learner has mastered the current topic. */
  mastery: number;
  recent_mistakes: string[];
}

export interface TutorRequestPayload {
  message: string;
  context: StudentContext;
  history: { role: string; content: string }[];
}

export interface TutorResponsePayload {
  type: 'tutor_response';
  message: string;
  explanation?: string | null;
  example?: string | null;
  question?: string | null;
  hint?: string | null;
  difficulty: number;
  recommended_next_step: 'practice' | 'quiz' | 'revise' | 'advance' | 'ask_teacher';
  learning_objective?: string | null;
  /** True when the AI service fell back; the UI should say so. */
  degraded: boolean;
}

export interface AiHealth {
  status: 'ok' | 'degraded';
  service: string;
  environment: string;
  llm_provider: string;
  llm_configured: boolean;
  version: string;
}

/* --------------------------------------------- teaching aids (teachers only) */

export interface ClassContextPayload {
  class_name?: string | null;
  course_title?: string | null;
  subject?: string | null;
  grade?: string | null;
  student_count: number;
  average_score?: number | null;
  completion_percent?: number | null;
  topics: { topic: string; mastered: number; total: number; mastery_percent: number }[];
  struggling: { name: string; progress_percent: number; average_score: number; health: string }[];
  thriving: { name: string; progress_percent: number; average_score: number; health: string }[];
}

export interface LessonPlanPayload {
  subject: string;
  grade: string;
  topic: string;
  objectives: string[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  duration_min: number;
  language: string;
  notes?: string | null;
}

export interface LessonPlanResult {
  type: 'lesson_plan';
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

export interface QuizDraftPayload {
  subject: string;
  grade: string;
  topic: string;
  question_count: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  question_types: string[];
  language: string;
}

export interface DraftQuestionResult {
  prompt: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'MULTIPLE_SELECT' | 'SHORT_ANSWER';
  options: string[];
  correct?: number | null;
  correct_options: number[];
  answer_text?: string | null;
  explanation?: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface QuizDraftResult {
  type: 'quiz_draft';
  title: string;
  questions: DraftQuestionResult[];
  degraded: boolean;
}

export interface ClassAnalysisPayload {
  context: ClassContextPayload;
  question?: string | null;
}

export interface ClassAnalysisResult {
  type: 'class_analysis';
  summary: string;
  strengths: string[];
  weaknesses: string[];
  interventions: { focus: string; why: string; suggestion: string }[];
  differentiation: string[];
  degraded: boolean;
}
