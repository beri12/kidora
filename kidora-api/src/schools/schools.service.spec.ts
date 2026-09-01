import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { TenantService } from '../common/tenancy/tenant.service';
import { AppRole } from '../common/enums/role.enum';
import { TenantContext } from '../common/tenancy/tenant.types';

const head = (over: Partial<TenantContext> = {}): TenantContext => ({
  userId: 'head-a', role: AppRole.SCHOOL_ADMIN, schoolId: 'school-a', districtId: null,
  gradeId: null, isPlatformAdmin: false, isSchoolAdmin: true, ...over,
});

function make(over: any = {}) {
  const prisma: any = {
    school: { findUnique: jest.fn(), update: jest.fn() },
    schoolClass: {
      findUnique: jest.fn().mockResolvedValue(over.class ?? { schoolId: 'school-a' }),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'cl1', ...data })),
      update: jest.fn(),
    },
    grade: {
      findUnique: jest.fn().mockResolvedValue(over.grade ?? { schoolId: 'school-a' }),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'g1', ...data })),
      delete: jest.fn(),
    },
    user: {
      findMany: jest.fn().mockResolvedValue(over.students ?? []),
      findFirst: jest.fn().mockResolvedValue('teacher' in over ? over.teacher : { id: 't1' }),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn(),
    },
    classEnrollment: { upsert: jest.fn(), updateMany: jest.fn(), findMany: jest.fn() },
    course: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const tenants = new TenantService(prisma);
  const audit: any = { record: jest.fn() };
  return { service: new SchoolsService(prisma, tenants, audit), prisma, audit };
}

describe('SchoolsService tenant scoping', () => {
  it('always filters students by the caller’s own school', async () => {
    const { service, prisma } = make();
    await service.students(head(), {});
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ schoolId: 'school-a', role: 'CHILD' }) }),
    );
  });

  it('always filters teachers by the caller’s own school', async () => {
    const { service, prisma } = make();
    await service.teachers(head(), {});
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ schoolId: 'school-a', role: 'TEACHER' }) }),
    );
  });

  it('always filters the course library by the caller’s own school', async () => {
    const { service, prisma } = make();
    await service.courses(head(), {});
    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ schoolId: 'school-a' }) }),
    );
  });

  it('refuses everything for an account with no school', async () => {
    const { service } = make();
    await expect(service.students(head({ schoolId: null }), {})).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.classes(head({ schoolId: null }), {})).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('caps page size so a caller cannot pull the whole roster in one request', async () => {
    const { service, prisma } = make();
    await service.students(head(), { pageSize: 100000 });
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
  });
});

describe('SchoolsService class management', () => {
  it('refuses a class that belongs to another school', async () => {
    const { service } = make({ class: { schoolId: 'school-b' } });
    await expect(service.classRoster(head(), 'cl1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses a grade that belongs to another school', async () => {
    const { service } = make({ grade: { schoolId: 'school-b' } });
    await expect(service.createClass(head(), { name: '5A', gradeId: 'g-other' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('accepts a platform-wide grade (schoolId null)', async () => {
    const { service } = make({ grade: { schoolId: null } });
    await expect(service.createClass(head(), { name: '5A', gradeId: 'g-shared' })).resolves.toMatchObject({
      schoolId: 'school-a',
    });
  });

  it('refuses a homeroom teacher who is not in the school', async () => {
    const { service } = make({ teacher: null });
    await expect(
      service.createClass(head(), { name: '5A', homeroomTeacherId: 'outsider' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses to add a student from another school to a class', async () => {
    const { service, prisma } = make();
    // Only one of the two requested ids resolves inside the caller's school.
    prisma.user.findMany.mockResolvedValue([{ id: 'stu-a' }]);
    await expect(
      service.addStudents(head(), 'cl1', { studentIds: ['stu-a', 'stu-from-school-b'] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('adds students that all belong to the caller’s school', async () => {
    const { service, prisma } = make();
    prisma.user.findMany.mockResolvedValue([{ id: 'stu-a' }, { id: 'stu-b' }]);
    await expect(service.addStudents(head(), 'cl1', { studentIds: ['stu-a', 'stu-b'] })).resolves.toEqual({
      added: 2,
    });
  });

  it('refuses to delete a shared platform-wide grade', async () => {
    const { service } = make({ grade: { schoolId: null } });
    await expect(service.deleteGrade(head(), 'g-shared')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('404s a grade that does not exist', async () => {
    const { service, prisma } = make();
    prisma.grade.findUnique.mockResolvedValue(null);
    await expect(service.deleteGrade(head(), 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses to move a student from another school into a grade', async () => {
    const { service, prisma } = make();
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.setStudentGrade(head(), 'outsider', 'g1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
