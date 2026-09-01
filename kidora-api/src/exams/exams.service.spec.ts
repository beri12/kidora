import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { QuestionType } from '@prisma/client';
import { ExamsService } from './exams.service';
import { AppRole } from '../common/enums/role.enum';
import { TenantContext } from '../common/tenancy/tenant.types';

const student = (over: Partial<TenantContext> = {}): TenantContext => ({
  userId: 'stu1', role: AppRole.CHILD, schoolId: 'school-a', districtId: null,
  gradeId: 'g5', isPlatformAdmin: false, isSchoolAdmin: false, ...over,
});

const EXAM = {
  id: 'ex1', courseId: 'c1', teacherId: 'teacher-a', title: 'Final', published: true,
  timeLimitMin: 30, passingScore: 70, maxAttempts: 2, questionCount: null,
  shuffleQuestions: false, shuffleOptions: false, isFinal: true,
  xpReward: 150, coinReward: 50,
  course: { id: 'c1', title: 'Fractions', schoolId: 'school-a' },
  questions: [
    { id: 'q1', prompt: 'a', type: QuestionType.MULTIPLE_CHOICE, options: ['x', 'y'], correct: 0, points: 1, data: null },
    { id: 'q2', prompt: 'b', type: QuestionType.MULTIPLE_CHOICE, options: ['x', 'y'], correct: 1, points: 1, data: null },
    { id: 'q3', prompt: 'c', type: QuestionType.MULTIPLE_CHOICE, options: ['x', 'y'], correct: 0, points: 1, data: null },
    { id: 'q4', prompt: 'd', type: QuestionType.MULTIPLE_CHOICE, options: ['x', 'y'], correct: 1, points: 1, data: null },
  ],
};

function make(over: any = {}) {
  const attempt = over.attempt ?? null;
  const prisma: any = {
    exam: { findUnique: jest.fn().mockResolvedValue(over.exam ?? EXAM) },
    examQuestion: { deleteMany: jest.fn(), createMany: jest.fn() },
    examAttempt: {
      findFirst: jest.fn().mockResolvedValue(attempt),
      findUnique: jest.fn().mockResolvedValue(over.attemptById ?? attempt),
      findMany: jest.fn().mockResolvedValue(over.attempts ?? []),
      count: jest.fn().mockResolvedValue(over.used ?? 0),
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'at1', ...data })),
      update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'at1', attemptNo: 1, ...data })),
    },
  };
  const access: any = { assertCanLearn: jest.fn().mockResolvedValue({}), assertCanEdit: jest.fn() };
  const audit: any = { record: jest.fn() };
  const rewards: any = { awardXp: jest.fn().mockResolvedValue({ xp: 150, coins: 50 }) };
  const certificates: any = { maybeIssueForCourse: jest.fn().mockResolvedValue(null) };
  const notifications: any = { create: jest.fn() };
  return {
    service: new ExamsService(prisma, access, audit, rewards, certificates, notifications),
    prisma, access, rewards, certificates,
  };
}

describe('ExamsService.start', () => {
  it('freezes the served question set into the attempt', async () => {
    const { service, prisma } = make();
    await service.start(student(), 'ex1');
    expect(prisma.examAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ questionIds: ['q1', 'q2', 'q3', 'q4'], attemptNo: 1 }),
      }),
    );
  });

  it('draws only questionCount questions when the exam samples its pool', async () => {
    const { service, prisma } = make({ exam: { ...EXAM, questionCount: 2, shuffleQuestions: true } });
    await service.start(student(), 'ex1');
    const data = prisma.examAttempt.create.mock.calls[0][0].data;
    expect(data.questionIds).toHaveLength(2);
  });

  it('refuses once every attempt is used', async () => {
    const { service } = make({ used: 2 });
    await expect(service.start(student(), 'ex1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses an exam with no questions', async () => {
    const { service } = make({ exam: { ...EXAM, questions: [] } });
    await expect(service.start(student(), 'ex1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404s an unpublished exam', async () => {
    const { service } = make({ exam: { ...EXAM, published: false } });
    await expect(service.start(student(), 'ex1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('never serves the answer key', async () => {
    const { service } = make();
    const served: any = await service.start(student(), 'ex1');
    expect(served.questions.every((q: any) => !('correct' in q))).toBe(true);
  });

  it('checks course access before serving anything', async () => {
    const { service, access } = make();
    await service.start(student(), 'ex1');
    expect(access.assertCanLearn).toHaveBeenCalledWith(expect.anything(), 'c1');
  });
});

describe('ExamsService.submit', () => {
  const openAttempt = {
    id: 'at1', examId: 'ex1', studentId: 'stu1', attemptNo: 1, status: 'IN_PROGRESS',
    questionIds: ['q1', 'q2', 'q3', 'q4'], expiresAt: new Date(Date.now() + 60_000),
  };

  it('grades on the server and passes at or above the passing score', async () => {
    const { service } = make({ attempt: openAttempt });
    const res: any = await service.submit(student(), 'ex1', {
      answers: { q1: 0, q2: 1, q3: 0, q4: 1 },
    });
    expect(res).toMatchObject({ score: 4, maxScore: 4, percent: 100, passed: true });
  });

  it('fails below the passing score', async () => {
    const { service } = make({ attempt: openAttempt });
    const res: any = await service.submit(student(), 'ex1', { answers: { q1: 0, q2: 0, q3: 1, q4: 0 } });
    expect(res.percent).toBe(25);
    expect(res.passed).toBe(false);
  });

  it('ignores a forged score in the payload', async () => {
    const { service } = make({ attempt: openAttempt });
    const res: any = await service.submit(student(), 'ex1', {
      answers: { q1: 1, q2: 0, q3: 1, q4: 0 }, score: 100, passed: true, percent: 100,
    } as any);
    expect(res.score).toBe(0);
    expect(res.passed).toBe(false);
  });

  it('only grades the questions this attempt was actually served', async () => {
    const { service } = make({ attempt: { ...openAttempt, questionIds: ['q1', 'q2'] } });
    const res: any = await service.submit(student(), 'ex1', {
      answers: { q1: 0, q2: 1, q3: 0, q4: 1 },
    });
    expect(res.total).toBe(2);
    expect(res.maxScore).toBe(2);
  });

  it('marks a submission after the deadline as expired and not passed', async () => {
    const { service } = make({ attempt: { ...openAttempt, expiresAt: new Date(Date.now() - 1000) } });
    const res: any = await service.submit(student(), 'ex1', { answers: { q1: 0, q2: 1, q3: 0, q4: 1 } });
    expect(res.expired).toBe(true);
    expect(res.passed).toBe(false);
  });

  it('refuses a submission with no attempt open', async () => {
    const { service } = make({ attempt: null });
    await expect(service.submit(student(), 'ex1', { answers: {} })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('pays out the first pass only', async () => {
    const first = make({ attempt: openAttempt });
    await first.service.submit(student(), 'ex1', { answers: { q1: 0, q2: 1, q3: 0, q4: 1 } });
    expect(first.rewards.awardXp).toHaveBeenCalledTimes(1);

    const repeat = make({ attempt: openAttempt });
    repeat.prisma.examAttempt.count.mockResolvedValue(1); // an earlier pass exists
    await repeat.service.submit(student(), 'ex1', { answers: { q1: 0, q2: 1, q3: 0, q4: 1 } });
    expect(repeat.rewards.awardXp).not.toHaveBeenCalled();
  });

  it('asks for a certificate only after a passing final exam', async () => {
    const passing = make({ attempt: openAttempt });
    await passing.service.submit(student(), 'ex1', { answers: { q1: 0, q2: 1, q3: 0, q4: 1 } });
    expect(passing.certificates.maybeIssueForCourse).toHaveBeenCalledWith('stu1', 'c1', 100);

    const failing = make({ attempt: openAttempt });
    await failing.service.submit(student(), 'ex1', { answers: { q1: 1, q2: 0, q3: 1, q4: 0 } });
    expect(failing.certificates.maybeIssueForCourse).not.toHaveBeenCalled();
  });
});

describe('ExamsService teacher guards', () => {
  const otherSchoolTeacher = (): TenantContext => ({
    userId: 'teacher-b', role: AppRole.TEACHER, schoolId: 'school-b', districtId: null,
    gradeId: null, isPlatformAdmin: false, isSchoolAdmin: false,
  });

  it('stops a teacher from another school editing the exam', async () => {
    const { service } = make();
    await expect(service.update(otherSchoolTeacher(), 'ex1', {} as any)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('stops a teacher from another school reading the results', async () => {
    const { service } = make();
    await expect(service.results(otherSchoolTeacher(), 'ex1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses to delete an exam students have already sat', async () => {
    const { service, prisma } = make();
    prisma.examAttempt.count.mockResolvedValue(4);
    const owner: TenantContext = {
      userId: 'teacher-a', role: AppRole.TEACHER, schoolId: 'school-a', districtId: null,
      gradeId: null, isPlatformAdmin: false, isSchoolAdmin: false,
    };
    await expect(service.remove(owner, 'ex1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
