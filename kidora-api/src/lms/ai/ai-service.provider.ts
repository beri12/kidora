import type { AiClient } from '../../modules/ai/ai.client';
import type { AiProvider } from './ai-provider';

/**
 * The LMS tutor's model calls go through the Kidora AI service, like the Kai
 * chat: one place owns the model, the kids-learning-only scope rules and
 * moderation in both directions. The LMS prompt (lesson text, task) is sent as
 * instructions and sits under those rules, never over them.
 */
export class AiServiceAiProvider implements AiProvider {
  constructor(private client: AiClient) {}

  async complete(p: Parameters<AiProvider['complete']>[0]) {
    const r = await this.client.complete({
      instructions: p.system,
      messages: p.messages.slice(-12),
      audience: p.audience ?? 'child',
    });
    // No model configured: report "unavailable" instead of saving the
    // fallback text as if it were a tutor answer.
    if (r.degraded) throw new Error('AI service has no model configured');
    return { text: r.text, tokens: r.tokens };
  }
}
