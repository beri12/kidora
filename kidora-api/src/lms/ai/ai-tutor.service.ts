import { BadRequestException, ForbiddenException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { AIKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KIDORA_AI_PROVIDER, type AiProvider } from './ai-provider';
import { todayDate } from '../gamification/level.util';

const SYSTEM_BASE = `You are Kidora, a friendly tutor for school children. Explain simply, one idea at a time, with encouragement.
Only help with school subjects and study skills. Never give full answers to graded assignments or exams; give hints and steps.
Never ask for or discuss personal information. If a topic is unsafe or off-topic, gently steer back to learning.`;

const KIND_PROMPTS: Record<AIKind, string> = {
  TUTOR: 'Answer the learner\'s question.', EXPLAIN: 'Explain the lesson content below in plain language with one example.',
  PRACTICE: 'Create 3 short practice questions on the lesson topic. Do not give answers until asked.',
  HINT: 'Give one hint, not the answer.', MISTAKE: 'Explain why the learner\'s answer was wrong and how to think about it.',
  RECOMMEND: 'Suggest what to study next based on the progress summary.', TEACHER_ASSIST: 'You are assisting a teacher. Be concise and practical.',
};

@Injectable()
export class AiTutorService {
  constructor(private prisma: PrismaService, @Inject(KIDORA_AI_PROVIDER) private provider: AiProvider) {}

  async ask(userId: string, p: { message: string; kind?: AIKind; lessonId?: string; courseId?: string }) {
    if (!p.message?.trim()) throw new BadRequestException('Message is empty.');
    const kind = p.kind ?? 'TUTOR';
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { role: true, schoolId: true, school: { select: { settings: { select: { aiTutorDailyLimit: true } } } } } });
    if (kind === 'TEACHER_ASSIST' && user.role === 'CHILD') throw new ForbiddenException();
    const limit = user.school?.settings?.aiTutorDailyLimit ?? 30;
    const usage = await this.prisma.aIUsage.upsert({ where: { userId_date: { userId, date: todayDate() } }, create: { userId, date: todayDate() }, update: {} });
    if (usage.requests >= limit) throw new BadRequestException(`Daily limit of ${limit} questions reached. See you tomorrow!`);

    let context = '';
    if (p.lessonId) {
      const l = await this.prisma.lesson.findUnique({ where: { id: p.lessonId }, select: { title: true, description: true, status: true, courseId: true, contents: { where: { type: 'TEXT' }, orderBy: { order: 'asc' }, take: 5, select: { body: true } } } });
      if (!l || l.status !== 'PUBLISHED') throw new BadRequestException('Lesson not available.');
      if (user.role === 'CHILD') { const e = await this.prisma.courseEnrollment.count({ where: { studentId: userId, courseId: l.courseId } }); if (!e) throw new ForbiddenException('Not enrolled in this course.'); }
      context = `\nLesson: ${l.title}\n${l.description}\n${l.contents.map((c) => c.body).filter(Boolean).join('\n').slice(0, 6000)}`;
    }
    const history = await this.prisma.aIConversation.findMany({ where: { userId, kind }, orderBy: { createdAt: 'desc' }, take: 6 });
    const messages = [...history.reverse().flatMap((h) => [{ role: 'user' as const, content: h.message }, { role: 'assistant' as const, content: h.response }]), { role: 'user' as const, content: p.message.slice(0, 2000) }];

    let text = '', tokens = 0;
    try { const r = await this.provider.complete({ system: `${SYSTEM_BASE}\n${KIND_PROMPTS[kind]}${context}`, messages, maxTokens: 600 }); text = r.text; tokens = r.tokens ?? 0; }
    catch { throw new ServiceUnavailableException('The tutor is unavailable right now. Please try again later.'); }

    const row = await this.prisma.aIConversation.create({ data: { userId, message: p.message, response: text, kind, lessonId: p.lessonId, courseId: p.courseId } });
    await this.prisma.aIUsage.update({ where: { id: usage.id }, data: { requests: { increment: 1 }, tokens: { increment: tokens } } });
    return { reply: { id: row.id, role: 'assistant', content: text, createdAt: row.createdAt }, remainingToday: limit - usage.requests - 1 };
  }

  async history(userId: string, pageSize = 50) {
    const rows = await this.prisma.aIConversation.findMany({ where: { userId, kind: { in: ['TUTOR', 'EXPLAIN', 'PRACTICE', 'HINT', 'MISTAKE', 'RECOMMEND'] } }, orderBy: { createdAt: 'desc' }, take: pageSize });
    const items = rows.reverse().flatMap((r) => [{ id: `${r.id}:u`, role: 'user', content: r.message, createdAt: r.createdAt }, { id: `${r.id}:a`, role: 'assistant', content: r.response, createdAt: r.createdAt }]);
    return { items, page: 1, pageSize, total: items.length };
  }
}
