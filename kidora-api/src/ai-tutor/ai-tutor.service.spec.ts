import { AiTutorService } from './ai-tutor.service';

// Prisma is stubbed — we only test the offline reply heuristic + history write.
const prismaStub: any = {
  aIConversation: { create: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]) },
  course: { findMany: jest.fn().mockResolvedValue([]) },
};

describe('AiTutorService (offline fallback)', () => {
  const svc = new AiTutorService(prismaStub);
  const oldKey = process.env.AI_API_KEY;
  beforeAll(() => { delete process.env.AI_API_KEY; });
  afterAll(() => { if (oldKey) process.env.AI_API_KEY = oldKey; });

  it('solves a multiplication question', async () => {
    const r = await svc.chat('u1', 'what is 7 x 8?');
    expect(r.answer).toContain('56');
    expect(prismaStub.aIConversation.create).toHaveBeenCalled();
  });

  it('returns follow-up suggestions', async () => {
    const r = await svc.chat('u1', 'help');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
