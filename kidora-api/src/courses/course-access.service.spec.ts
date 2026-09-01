import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CourseAccessService } from './course-access.service';
import { AppRole } from '../common/enums/role.enum';
import { TenantContext } from '../common/tenancy/tenant.types';

const ctx = (over: Partial<TenantContext> = {}): TenantContext => ({
  userId: 'teacher-a',
  role: AppRole.TEACHER,
  schoolId: 'school-a',
  districtId: null,
  gradeId: 'grade-5',
  isPlatformAdmin: false,
  isSchoolAdmin: false,
  ...over,
});

describe('CourseAccessService', () => {
  let prisma: any;
  let service: CourseAccessService;

  beforeEach(() => {
    prisma = {
      course: { findFirst: jest.fn(), findUnique: jest.fn() },
      section: { findUnique: jest.fn() },
      lesson: { findUnique: jest.fn() },
      activity: { findUnique: jest.fn() },
    };
    service = new CourseAccessService(prisma);
  });

  describe('learnerFilter', () => {
    it('limits a learner to public or own-school published courses, or an enrolment', () => {
      const filter: any = service.learnerFilter(ctx({ role: AppRole.CHILD }));
      const [published, enrolled] = filter.OR;
      expect(published.AND[0]).toEqual({ published: true });
      expect(published.AND[1].OR).toEqual([{ visibility: 'PUBLIC' }, { schoolId: 'school-a' }]);
      expect(published.AND[2].OR).toEqual([{ gradeId: null }, { gradeId: 'grade-5' }]);
      expect(enrolled.enrollments.some.studentId).toBe('teacher-a');
    });

    it('does not add a school clause for a learner with no school', () => {
      const filter: any = service.learnerFilter(ctx({ schoolId: null, role: AppRole.CHILD }));
      expect(filter.OR[0].AND[1].OR).toEqual([{ visibility: 'PUBLIC' }]);
    });

    it('is unrestricted for a platform admin', () => {
      expect(service.learnerFilter(ctx({ isPlatformAdmin: true }))).toEqual({});
    });
  });

  describe('staffFilter', () => {
    it('gives a teacher their own courses plus their school', () => {
      const filter: any = service.staffFilter(ctx());
      expect(filter.OR).toEqual([{ teacherId: 'teacher-a' }, { schoolId: 'school-a' }]);
    });

    it('returns a filter that matches nothing for staff with no school', () => {
      const filter: any = service.staffFilter(ctx({ role: AppRole.SCHOOL_ADMIN, schoolId: null }));
      expect(filter).toEqual({ id: '__none__' });
    });
  });

  describe('assertCanLearn', () => {
    it('404s when the course is outside the learner’s reach', async () => {
      prisma.course.findFirst.mockResolvedValue(null);
      await expect(service.assertCanLearn(ctx(), 'c1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('assertCanEdit', () => {
    it('lets the owning teacher edit', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'c1', teacherId: 'teacher-a', schoolId: 'school-a' });
      await expect(service.assertCanEdit(ctx(), 'c1')).resolves.toMatchObject({ id: 'c1' });
    });

    it('stops a teacher editing another school’s course', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'c1', teacherId: 'teacher-b', schoolId: 'school-b' });
      await expect(service.assertCanEdit(ctx(), 'c1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('stops a teacher editing a colleague’s course in their own school', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'c1', teacherId: 'teacher-b', schoolId: 'school-a' });
      await expect(service.assertCanEdit(ctx(), 'c1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lets a school admin edit any course in their own school', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'c1', teacherId: 'teacher-b', schoolId: 'school-a' });
      await expect(
        service.assertCanEdit(ctx({ role: AppRole.SCHOOL_ADMIN, isSchoolAdmin: true }), 'c1'),
      ).resolves.toMatchObject({ id: 'c1' });
    });
  });

  describe('assertCanPublish', () => {
    it('stops a teacher publishing into another school', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: 'c1', teacherId: 'teacher-a', schoolId: 'school-b' });
      await expect(service.assertCanPublish(ctx(), 'c1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('stops a teacher publishing a course platform-wide', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: 'c1', teacherId: 'teacher-a', schoolId: null, visibility: 'PUBLIC',
      });
      await expect(service.assertCanPublish(ctx(), 'c1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows publishing inside the teacher’s own school', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: 'c1', teacherId: 'teacher-a', schoolId: 'school-a', visibility: 'SCHOOL',
      });
      await expect(service.assertCanPublish(ctx(), 'c1')).resolves.toMatchObject({ id: 'c1' });
    });
  });

  describe('walking child entities back to the course', () => {
    it('refuses a lesson in another school’s course', async () => {
      prisma.lesson.findUnique.mockResolvedValue({ id: 'l1', courseId: 'c9' });
      prisma.course.findUnique.mockResolvedValue({ id: 'c9', teacherId: 'x', schoolId: 'school-b' });
      await expect(service.assertCanEditLesson(ctx(), 'l1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses an activity in another school’s course', async () => {
      prisma.activity.findUnique.mockResolvedValue({ id: 'a1', lesson: { courseId: 'c9' } });
      prisma.course.findUnique.mockResolvedValue({ id: 'c9', teacherId: 'x', schoolId: 'school-b' });
      await expect(service.assertCanEditActivity(ctx(), 'a1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
