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
