import { CertificatesService } from './certificates.service';

function makePrisma(over: any = {}) {
  return {
    course: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'c1',
        title: 'Fractions Quest',
        lessons: [{ id: 'l1', isRequired: true }, { id: 'l2', isRequired: true }],
        quizzes: [{ id: 'qz1', passingScore: 60 }],
        exams: [{ id: 'ex1' }],
        ...over.course,
      }),
    },
    progress: { count: jest.fn().mockResolvedValue(over.lessonsDone ?? 2) },
    quizAttempt: { findMany: jest.fn().mockResolvedValue(over.quizPasses ?? [{ quizId: 'qz1', percent: 80 }]) },
    examAttempt: { findMany: jest.fn().mockResolvedValue(over.examPasses ?? [{ examId: 'ex1', percent: 90 }]) },
    certificate: {
      findFirst: jest.fn().mockResolvedValue(over.existing ?? null),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'cert1', ...data })),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        name: 'Hanna', schoolId: 's1', grade: { name: 'Grade 5' }, school: { name: 'Sunrise' },
      }),
    },
  } as any;
}

describe('CertificatesService.checkEligibility', () => {
  const notifications: any = { create: jest.fn() };

  it('is eligible only when lessons, quizzes and the final exam are all done', async () => {
    const prisma = makePrisma();
    const res = await new CertificatesService(prisma, notifications).checkEligibility('u1', 'c1');
    expect(res).toMatchObject({ eligible: true, lessonsComplete: true, quizzesPassed: true, examPassed: true });
  });

  it('is not eligible with lessons outstanding', async () => {
    const prisma = makePrisma({ lessonsDone: 1 });
    const res = await new CertificatesService(prisma, notifications).checkEligibility('u1', 'c1');
    expect(res.eligible).toBe(false);
    expect(res.lessonsComplete).toBe(false);
  });

  it('is not eligible with a quiz unpassed', async () => {
    const prisma = makePrisma({ quizPasses: [] });
    const res = await new CertificatesService(prisma, notifications).checkEligibility('u1', 'c1');
    expect(res.eligible).toBe(false);
    expect(res.quizzesPassed).toBe(false);
  });

  it('is not eligible with the final exam unpassed', async () => {
    const prisma = makePrisma({ examPasses: [] });
    const res = await new CertificatesService(prisma, notifications).checkEligibility('u1', 'c1');
    expect(res.eligible).toBe(false);
    expect(res.examPassed).toBe(false);
  });

  it('does not require an exam when the course has none', async () => {
    const prisma = makePrisma({ course: { exams: [] }, examPasses: [] });
    const res = await new CertificatesService(prisma, notifications).checkEligibility('u1', 'c1');
    expect(res.examRequired).toBe(false);
    expect(res.eligible).toBe(true);
  });
});

describe('CertificatesService.maybeIssueForCourse', () => {
  const notifications: any = { create: jest.fn() };

  it('refuses to issue when the learner is not eligible', async () => {
    const prisma = makePrisma({ lessonsDone: 0 });
    const cert = await new CertificatesService(prisma, notifications).maybeIssueForCourse('u1', 'c1');
    expect(cert).toBeNull();
    expect(prisma.certificate.create).not.toHaveBeenCalled();
  });

  it('issues once and returns the existing row on a repeat call', async () => {
    const prisma = makePrisma({ existing: { id: 'already', courseName: 'Fractions Quest' } });
    const cert = await new CertificatesService(prisma, notifications).maybeIssueForCourse('u1', 'c1');
    expect(cert).toMatchObject({ id: 'already' });
    expect(prisma.certificate.create).not.toHaveBeenCalled();
  });

  it('stamps the certificate with a serial, the school and the grade', async () => {
    const prisma = makePrisma();
    const cert: any = await new CertificatesService(prisma, notifications).maybeIssueForCourse('u1', 'c1', 95);
    expect(cert.serial).toMatch(/^KID-[0-9A-F]{10}$/);
    expect(cert).toMatchObject({
      courseName: 'Fractions Quest', schoolName: 'Sunrise', gradeName: 'Grade 5',
      studentName: 'Hanna', score: 95,
    });
  });
});
