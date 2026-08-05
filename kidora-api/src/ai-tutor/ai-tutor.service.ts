import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface TutorReply {
  answer: string;
  suggestions: string[];
  recommendedLessons: { id: string; title: string; slug: string }[];
}

// Kai — the AI tutor. This service wraps the model call so the provider
// (OpenAI/Anthropic/etc.) can be swapped without touching controllers.
// A kid-safe heuristic reply is used when no AI key is configured.
@Injectable()
export class AiTutorService {
  constructor(private prisma: PrismaService) {}

  async chat(userId: string, message: string): Promise<TutorReply> {
    const answer = await this.generate(message);
    const recommendedLessons = await this.recommend(message);
    const suggestions = this.followups(message);
    // Persist conversation history for context + parent visibility.
    await this.prisma.aIConversation.create({ data: { userId, message, response: answer } });
    return { answer, suggestions, recommendedLessons };
  }

  history(userId: string) {
    return this.prisma.aIConversation.findMany({ where: { userId }, orderBy: { createdAt: 'asc' }, take: 100 });
  }

  // ---- provider integration point ----
  private async generate(message: string): Promise<string> {
    const key = process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY;
    if (!key) return this.fallback(message);
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
          messages: [
            { role: 'system', content: this.systemPrompt() },
            { role: 'user', content: message },
          ],
          temperature: 0.6,
          max_tokens: 400,
        }),
      });
      const data: any = await res.json();
      return data?.choices?.[0]?.message?.content?.trim() || this.fallback(message);
    } catch {
      return this.fallback(message);
    }
  }

  // Kid-safe system prompt shared by chat + streaming.
  private systemPrompt(): string {
    return [
      'You are Kai, a friendly, encouraging AI tutor for children aged 3–12 on the Kidora platform.',
      'Always be warm, patient and playful. Use simple words and short sentences.',
      'Never give the final answer outright for homework — guide with hints and small steps.',
      'Keep every reply under 90 words. Add one cheerful emoji. Never discuss unsafe topics.',
    ].join(' ');
  }

  // Streaming variant for the AI Tutor chat UI (Server-Sent tokens).
  async *stream(userId: string, message: string): AsyncGenerator<string> {
    const key = process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY;
    if (!key) { yield this.fallback(message); await this.prisma.aIConversation.create({ data: { userId, message, response: this.fallback(message) } }); return; }
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        stream: true,
        messages: [{ role: 'system', content: this.systemPrompt() }, { role: 'user', content: message }],
      }),
    });
    const reader = (res.body as any).getReader();
    const decoder = new TextDecoder();
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value).split('\n')) {
        const t = line.replace(/^data: /, '').trim();
        if (!t || t === '[DONE]') continue;
        try { const tok = JSON.parse(t).choices?.[0]?.delta?.content; if (tok) { full += tok; yield tok; } } catch {}
      }
    }
    await this.prisma.aIConversation.create({ data: { userId, message, response: full } });
  }

  private fallback(message: string): string {
    const m = message.toLowerCase();
    const mult = m.match(/(\d+)\s*[x*×]\s*(\d+)/);
    if (mult) return `Let's solve ${mult[1]} × ${mult[2]}! Think of it as adding ${mult[1]} to itself ${mult[2]} times. The answer is ${Number(mult[1]) * Number(mult[2])}. 🎉`;
    const add = m.match(/(\d+)\s*\+\s*(\d+)/);
    if (add) return `${add[1]} + ${add[2]} = ${Number(add[1]) + Number(add[2])}. Great question! ➕`;
    return "Great question! Let's break it into small steps and figure it out together. Can you tell me what part feels tricky? 🌟";
  }

  private followups(_message: string): string[] {
    return ['Can you give me an example?', 'Show me a practice question', 'Explain it a simpler way'];
  }

  private async recommend(message: string) {
    // Naive keyword → subject match against real courses.
    const m = message.toLowerCase();
    const subjectSlug = m.includes('read') || m.includes('word') ? 'english'
      : m.includes('science') || m.includes('planet') ? 'science'
      : m.includes('code') || m.includes('program') ? 'coding' : 'math';
    const courses = await this.prisma.course.findMany({ where: { subject: { slug: subjectSlug } }, include: { lessons: { take: 2 } }, take: 1 });
    return courses.flatMap((c) => c.lessons.map((l) => ({ id: l.id, title: l.title, slug: c.slug })));
  }
}
