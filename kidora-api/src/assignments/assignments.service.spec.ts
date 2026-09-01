import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { AppRole } from '../common/enums/role.enum';
import { TenantContext } from '../common/tenancy/tenant.types';

const ctx = (over: Partial<TenantContext> = {}): TenantContext => ({
  userId: 'teacher-a', role: AppRole.TEACHER, schoolId: 'school-a', districtId: null,
  gradeId: null, isPlatformAdmin: false, isSchoolAdmin: false, ...over,
});

function make(over: any = {}) {
  const prisma: any = {
    assignment: {
      findUnique: jest.fn().mockResolvedValue(
        over.assignment ?? {
          id: 'as1', teacherId: 'teacher-a', courseId: 'c1', points: 20, title: 'Draw a fraction',
          published: true, course: { schoolId: 'school-a', teacherId: 'teacher-a' },
        },
      ),
      create: jest.fn(), update: jest.fn(), delete: jest.fn(), findMany: jest.fn(),
    },
    assignmentSubmission: {
      findUnique: jest.fn().mockResolvedValue(over.submission ?? null),
      upsert: jest.fn().mockImplementation(({ create, update }: any) => Promise.resolve(create ?? update)),
      update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'sub1', ...data })),
      count: jest.fn().mockResolvedValue(over.submissionCount ?? 0),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  prisma.assignmentSubmission.findUnique = jest.fn().mockResolvedValue(over.submission ?? null);
  const access: any = {
    assertCanEdit: jest.fn().mockResolvedValue({ id: 'c1' }),
    assertCanLearn: jest.fn().mockResolvedValue({ id: 'c1' }),
    learnerFilter: jest.fn().mockReturnValue({}),
  };
  const audit: any = { record: jest.fn() };
  const rewards: any = { awardXp: jest.fn().mockResolvedValue({}) };
  const notifications: any = { create: jest.fn() };
  return {
    service: new AssignmentsService(prisma, access, audit, rewards, notifications),
    prisma, access, rewards, notifications,
  };
}

describe('AssignmentsService.grade', () => {
  const submission = {
    id: 'sub1', assignmentId: 'as1', studentId: 'stu1',
    assignment: { id: 'as1', teacherId: 'teacher-a', points: 20, title: 'Draw a fraction', courseId: 'c1' },
  };

  it('clamps the score to the assignment’s own points', async () => {
    const { service, prisma } = make({ submission });
    prisma.assignmentSubmission.findUnique.mockResolvedValue(submission);
    const res: any = await service.grade(ctx(), 'sub1', { score: 9999 });
    expect(res.score).toBe(20);
  });

  it('clamps a negative score to zero', async () => {
    const { service, prisma } = make({ submission });
    prisma.assignmentSubmission.findUnique.mockResolvedValue(submission);
    const res: any = await service.grade(ctx(), 'sub1', { score: -50 });
    expect(res.score).toBe(0);
  });

  it('returns work for revision instead of grading when asked', async () => {
    const { service, prisma, rewards } = make({ submission });
    prisma.assignmentSubmission.findUnique.mockResolvedValue(submission);
    const res: any = await service.grade(ctx(), 'sub1', { score: 10, returnForRevision: true });
    expect(res.status).toBe('RETURNED');
    expect(rewards.awardXp).not.toHaveBeenCalled();
  });

  it('stops a teacher from another school grading', async () => {
    const { service, prisma } = make({ submission });
    prisma.assignmentSubmission.findUnique.mockResolvedValue(submission);
    prisma.assignment.findUnique.mockResolvedValue({
      id: 'as1', teacherId: 'teacher-b', courseId: 'c1', points: 20,
      course: { schoolId: 'school-b', teacherId: 'teacher-b' },
    });
    await expect(service.grade(ctx(), 'sub1', { score: 10 })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('stops a student grading their own work', async () => {
    const { service, prisma } = make({ submission });
    prisma.assignmentSubmission.findUnique.mockResolvedValue(submission);
    await expect(
      service.grade(ctx({ userId: 'stu1', role: AppRole.CHILD }), 'sub1', { score: 20 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('404s on an unknown submission', async () => {
    const { service, prisma } = make();
    prisma.assignmentSubmission.findUnique.mockResolvedValue(null);
    await expect(service.grade(ctx(), 'nope', { score: 1 })).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AssignmentsService.submit', () => {
  const studentCtx = ctx({ userId: 'stu1', role: AppRole.CHILD });

  it('rejects an empty submission', async () => {
    const { service } = make();
    await expect(service.submit(studentCtx, 'as1', {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rewards only the first submission, not a resubmit', async () => {
    const first = make();
    await first.service.submit(studentCtx, 'as1', { text: 'here it is' });
    expect(first.rewards.awardXp).toHaveBeenCalledTimes(1);

    const again = make({ submission: { id: 'sub1', status: 'SUBMITTED' } });
    await again.service.submit(studentCtx, 'as1', { text: 'revised' });
    expect(again.rewards.awardXp).not.toHaveBeenCalled();
  });

  it('locks a submission once it has been graded', async () => {
    const { service } = make({ submission: { id: 'sub1', status: 'GRADED' } });
    await expect(service.submit(studentCtx, 'as1', { text: 'sneaky edit' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows a resubmit after the work was returned for revision', async () => {
    const { service } = make({ submission: { id: 'sub1', status: 'RETURNED' } });
    await expect(service.submit(studentCtx, 'as1', { text: 'fixed' })).resolves.toBeDefined();
  });

  it('refuses an unpublished assignment', async () => {
    const { service } = make({
      assignment: { id: 'as1', published: false, courseId: 'c1', teacherId: 'teacher-a' },
    });
    await expect(service.submit(studentCtx, 'as1', { text: 'x' })).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AssignmentsService.remove', () => {
  it('refuses to delete an assignment students have submitted to', async () => {
    const { service } = make({ submissionCount: 3 });
    await expect(service.remove(ctx(), 'as1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
