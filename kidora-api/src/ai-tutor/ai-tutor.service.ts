import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { AiService } from '../modules/ai/ai.service';
import type { TutorResponsePayload } from '../modules/ai/ai.types';

export interface TutorReply {
  answer: string;
  suggestions: string[];
  recommendedLessons: { id: string; title: string; slug: string }[];
  /** True when Kai could not reach the AI service; the UI says so. */
  degraded: boolean;
}

const DEFAULT_SUGGESTIONS = ['Can you give me an example?', 'Show me a practice question', 'Explain it a simpler way'];

const OFFLINE_ANSWER =
  "Kai is taking a short rest right now 🦉 Keep going with your lesson and ask me again in a minute, or ask your teacher.";

/**
 * Kai, the chat box at /ai-tutor (POST /ai/chat).
 *
 * Every answer comes from the Kidora AI service, which owns the model call,
 * the kids-learning-only scope rules and moderation on the way in and out.
 * Nothing here talks to OpenAI directly, so no reply can skip those checks.
 */
@Injectable()
export class AiTutorService {
  private logger = new Logger('KaiChat');

  constructor(private prisma: PrismaService, private ai: AiService) {}

  async chat(user: AuthUser, message: string, studentId?: string): Promise<TutorReply> {
    let reply: TutorResponsePayload;
    try {
      reply = await this.ai.kaiChat(user, message, studentId);
    } catch (err) {
      if (!(err instanceof ServiceUnavailableException)) throw err;
      this.logger.warn('AI service unreachable; answered with the offline message.');
      return { answer: OFFLINE_ANSWER, suggestions: [], recommendedLessons: [], degraded: true };
    }
    // A safety reply ("talk to a trusted adult") stands alone: no chips, no lessons.
    const quiet = reply.degraded || reply.recommended_next_step === 'ask_teacher';
    return {
      answer: KaiText.compose(reply),
      // An empty list from the AI service is deliberate; only an older
      // service that sends none gets the defaults.
      suggestions: quiet ? [] : reply.suggestions ?? DEFAULT_SUGGESTIONS,
      recommendedLessons: quiet ? [] : await this.recommend(message),
      degraded: reply.degraded,
    };
  }

  history(userId: string) {
    return this.prisma.aIConversation.findMany({ where: { userId }, orderBy: { createdAt: 'asc' }, take: 100 });
  }

  /**
   * Same checked answer, sent as Server-Sent tokens for UIs that type it out.
   * The whole reply is moderated before the first word is sent.
   */
  async *stream(user: AuthUser, message: string, studentId?: string): AsyncGenerator<string> {
    const { answer } = await this.chat(user, message, studentId);
    for (const word of answer.split(/(?<=\s)/)) yield word;
  }

  private async recommend(message: string) {
    // Naive keyword → subject match against real, published lessons.
    const m = message.toLowerCase();
    const subjectSlug = m.includes('read') || m.includes('word') ? 'english'
      : m.includes('science') || m.includes('planet') ? 'science'
      : m.includes('code') || m.includes('program') ? 'coding' : 'math';
    const courses = await this.prisma.course.findMany({
      where: { subject: { slug: subjectSlug }, published: true },
      include: { lessons: { where: { status: 'PUBLISHED' }, take: 2 } },
      take: 1,
    });
    return courses.flatMap((c) => c.lessons.map((l) => ({ id: l.id, title: l.title, slug: c.slug })));
  }
}

/** Turns the structured tutor reply into the chat bubble's text. */
export const KaiText = {
  compose(r: Pick<TutorResponsePayload, 'message' | 'explanation' | 'example' | 'question'>): string {
    const parts: string[] = [];
    for (const p of [r.message, r.explanation, r.example, r.question]) {
      const t = p?.trim();
      // The model sometimes repeats the message as the explanation.
      if (t && !parts.some((x) => x.includes(t) || t.includes(x))) parts.push(t);
    }
    return parts.join('\n\n');
  },
};
