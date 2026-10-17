import { ServiceUnavailableException } from '@nestjs/common';
import { AiTutorService, KaiText } from './ai-tutor.service';

const prismaStub: any = {
  aIConversation: { findMany: jest.fn().mockResolvedValue([]) },
  course: { findMany: jest.fn().mockResolvedValue([{ slug: 'math', lessons: [{ id: 'l1', title: 'Times tables' }] }]) },
};
const user: any = { id: 'u1', role: 'CHILD', email: 'kid@example.com' };

describe('AiTutorService (Kai chat)', () => {
  it('answers through the AI service and composes one bubble', async () => {
    const ai: any = {
      kaiChat: jest.fn().mockResolvedValue({
        message: 'Think of 7 x 8 as 7 groups of 8! 🦉', explanation: null, example: 'Like 7 boxes with 8 crayons each.',
        question: 'What is 7 x 2?', suggestions: ['Show me another one'], degraded: false,
      }),
    };
    const r = await new AiTutorService(prismaStub, ai).chat(user, 'what is 7 x 8?');
    expect(ai.kaiChat).toHaveBeenCalledWith(user, 'what is 7 x 8?', undefined);
    expect(r.answer).toBe('Think of 7 x 8 as 7 groups of 8! 🦉\n\nLike 7 boxes with 8 crayons each.\n\nWhat is 7 x 2?');
    expect(r.suggestions).toEqual(['Show me another one']);
    expect(r.recommendedLessons).toEqual([{ id: 'l1', title: 'Times tables', slug: 'math' }]);
    expect(r.degraded).toBe(false);
  });

  it('says honestly when the AI service is down, and never makes up an answer', async () => {
    const ai: any = { kaiChat: jest.fn().mockRejectedValue(new ServiceUnavailableException()) };
    const r = await new AiTutorService(prismaStub, ai).chat(user, 'what is 7 x 8?');
    expect(r.degraded).toBe(true);
    expect(r.answer).not.toContain('56');
    expect(r.suggestions).toEqual([]);
  });

  it('adds nothing under a safety reply', async () => {
    const ai: any = {
      kaiChat: jest.fn().mockResolvedValue({
        message: 'Please talk to a trusted adult.', suggestions: [], recommended_next_step: 'ask_teacher', degraded: false,
      }),
    };
    const r = await new AiTutorService(prismaStub, ai).chat(user, 'something sad');
    expect(r.suggestions).toEqual([]);
    expect(r.recommendedLessons).toEqual([]);
  });

  it('passes other errors (e.g. a forbidden studentId) through', async () => {
    const ai: any = { kaiChat: jest.fn().mockRejectedValue(new Error('That student is not linked to your account.')) };
    await expect(new AiTutorService(prismaStub, ai).chat(user, 'hi', 'someone-else')).rejects.toThrow('not linked');
  });

  it('does not repeat the message when the explanation echoes it', () => {
    expect(KaiText.compose({ message: 'Plants need light.', explanation: 'Plants need light.', example: null, question: null }))
      .toBe('Plants need light.');
  });
});
