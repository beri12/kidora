import { ForbiddenException } from '@nestjs/common';
import { TenancyService } from '../common/tenancy.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import type { AuthUser } from '../common/decorators/current-user.decorator';

/** Authorization rules from spec §86, tested with a mocked Prisma. */
const prisma = {
  parentStudent: { findUnique: jest.fn() },
  schoolClass: { findUnique: jest.fn() },
  course: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  classEnrollment: { count: jest.fn() },
  classTeacher: { findMany: jest.fn() },
};
const svc = new TenancyService(prisma as never);
const teacherA: AuthUser = { id: 't1', role: 'TEACHER', schoolId: 'A' };
const adminA: AuthUser = { id: 'a1', role: 'SCHOOL_ADMIN', schoolId: 'A' };
const parent: AuthUser = { id: 'p1', role: 'PARENT', schoolId: null };

beforeEach(() => jest.clearAllMocks());

describe('tenancy', () => {
  it('school admin cannot touch another school', () => {
    expect(() => svc.assertSameSchool(adminA, 'B')).toThrow(ForbiddenException);
    expect(() => svc.assertSameSchool(adminA, 'A')).not.toThrow();
  });
  it('parent cannot access an unlinked child', async () => {
    prisma.parentStudent.findUnique.mockResolvedValue(null);
    await expect(svc.assertParentOf('p1', 'kid9')).rejects.toThrow(ForbiddenException);
    prisma.parentStudent.findUnique.mockResolvedValue({ id: 'x' });
    await expect(svc.assertParentOf('p1', 'kid1')).resolves.toBeUndefined();
  });
  it('teacher cannot access a class in another school or one they do not teach', async () => {
    prisma.schoolClass.findUnique.mockResolvedValue({ schoolId: 'B', teachers: [{ id: 'ct' }] });
    await expect(svc.assertTeacherOfClass(teacherA, 'c1')).rejects.toThrow(ForbiddenException);
    prisma.schoolClass.findUnique.mockResolvedValue({ schoolId: 'A', teachers: [] });
    await expect(svc.assertTeacherOfClass(teacherA, 'c1')).rejects.toThrow(ForbiddenException);
    prisma.schoolClass.findUnique.mockResolvedValue({ schoolId: 'A', teachers: [{ id: 'ct' }] });
    await expect(svc.assertTeacherOfClass(teacherA, 'c1')).resolves.toBeUndefined();
  });
  it('teacher cannot see a student without a shared class', async () => {
    prisma.classEnrollment.count.mockResolvedValue(0);
    await expect(svc.assertTeacherOfStudent(teacherA, 's1')).rejects.toThrow(ForbiddenException);
  });
  it('parent has no school context for school routes', () => {
    expect(() => svc.requireSchool(parent)).toThrow(ForbiddenException);
  });
});

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());
  const ctx = (user: AuthUser | undefined, roles: string[]) => ({
    getHandler: () => ({}), getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  });
  it('student cannot open school routes', () => {
    jest.spyOn(Reflector.prototype, 'getAllAndOverride').mockReturnValue(['SCHOOL_ADMIN']);
    expect(() => guard.canActivate(ctx({ id: 's', role: 'CHILD', schoolId: 'A' }, ['SCHOOL_ADMIN']) as never)).toThrow(ForbiddenException);
    expect(guard.canActivate(ctx(adminA, ['SCHOOL_ADMIN']) as never)).toBe(true);
  });
});
