import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AiHealth, ClassAnalysisPayload, ClassAnalysisResult, LessonPlanPayload, LessonPlanResult,
  QuizDraftPayload, QuizDraftResult, TutorRequestPayload, TutorResponsePayload,
} from './ai.types';

/**
 * HTTP client for the Python AI service.
 *
 * The shared token proves the call came from this API rather than the open
 * internet; it is not a user credential. Authorization has already happened in
 * AiService before anything reaches here.
 */
@Injectable()
export class AiClient {
  private readonly logger = new Logger('AiClient');

  constructor(private config: ConfigService) {}

  private get baseUrl() {
    return (process.env.AI_SERVICE_URL ?? 'http://ai-service:8000').replace(/\/$/, '');
  }

  private get headers(): Record<string, string> {
    const token = process.env.AI_SERVICE_TOKEN;
    return { 'Content-Type': 'application/json', ...(token ? { 'X-Kidora-Service-Token': token } : {}) };
  }

  private async post<T>(path: string, body: unknown, timeoutMs = 35_000): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/ai${path}`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`AI service responded ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      // Never surface the internal URL or error to a child's browser.
      this.logger.error(`AI request to ${path} failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        'The AI tutor is temporarily unavailable. Carry on with your lesson and try again shortly.',
      );
    } finally {
      clearTimeout(timer);
    }
  }

  /** Teacher-facing. Generation can take longer than a tutor turn, so the
   *  timeout is wider — but still bounded. */
  lessonPlan(payload: LessonPlanPayload) {
    return this.post<LessonPlanResult>('/teaching/lesson-plan', payload, 60_000);
  }

  quizDraft(payload: QuizDraftPayload) {
    return this.post<QuizDraftResult>('/teaching/quiz', payload, 60_000);
  }

  analyseClass(payload: ClassAnalysisPayload) {
    return this.post<ClassAnalysisResult>('/teaching/analyse-class', payload, 60_000);
  }

  tutorChat(payload: TutorRequestPayload) {
    return this.post<TutorResponsePayload>('/tutor/chat', payload);
  }

  async health(): Promise<AiHealth | { status: 'unreachable' }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/ai/health`, {
        headers: this.headers,
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) return { status: 'unreachable' };
      return (await res.json()) as AiHealth;
    } catch {
      return { status: 'unreachable' };
    }
  }
}
