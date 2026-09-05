/**
 * Provider abstraction (spec §19). Swap the implementation in lms.module.ts
 * (KIDORA_AI_PROVIDER token). If your repo already has an AI service that
 * powers AIConversation, adapt it to this interface instead of adding a second one.
 */
export const KIDORA_AI_PROVIDER = 'KIDORA_AI_PROVIDER';
export interface AiProvider { complete(p: { system: string; messages: { role: 'user' | 'assistant'; content: string }[]; maxTokens?: number }): Promise<{ text: string; tokens?: number }>; }

/** Default when nothing is configured: fails loudly instead of faking answers. */
export class UnconfiguredAiProvider implements AiProvider {
  async complete(): Promise<{ text: string }> { throw new Error('AI provider is not configured (KIDORA_AI_PROVIDER).'); }
}
