import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TenantContext } from '../common/tenancy/tenant.types';
import { AppRole } from '../common/enums/role.enum';

/**
 * One place that answers "may this person see / edit this course?".
 *
 * Read visibility for a learner is:
 *   published
 *   AND (PUBLIC, or belongs to the learner's school)
 *   AND (course has no grade, or matches the learner's grade)
 *   OR   the learner has an explicit Enrollment.
 *
 * Nothing here reads a schoolId from the request — it comes from TenantContext,
 * which SchoolAccessGuard resolved from the database.
 */
@Injectable()
export class CourseAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Prisma filter for the courses a learner is allowed to see. */
  learnerFilter(tenant: TenantContext): Prisma.CourseWhereInput {
    if (tenant.isPlatformAdmin) return {};

    const visible: Prisma.CourseWhereInput[] = [
      { visibility: 'PUBLIC' },
      ...(tenant.schoolId ? [{ schoolId: tenant.schoolId } as Prisma.CourseWhereInput] : []),
    ];

    const gradeMatch: Prisma.CourseWhereInput[] = [
      { gradeId: null },
      ...(tenant.gradeId ? [{ gradeId: tenant.gradeId } as Prisma.CourseWhereInput] : []),
    ];

    return {
      OR: [
        { AND: [{ published: true }, { OR: visible }, { OR: gradeMatch }] },
        // An explicit enrolment always wins over the grade/school heuristics.
        { enrollments: { some: { studentId: tenant.userId, status: { not: 'DROPPED' } } } },
      ],
    };
  }

  /** Filter for staff browsing their own school's library. */
  staffFilter(tenant: TenantContext): Prisma.CourseWhereInput {
    if (tenant.isPlatformAdmin) return {};
    if (tenant.role === AppRole.TEACHER) {
      return {
        OR: [
          { teacherId: tenant.userId },
          ...(tenant.schoolId ? [{ schoolId: tenant.schoolId } as Prisma.CourseWhereInput] : []),
        ],
      };
    }
    return tenant.schoolId ? { schoolId: tenant.schoolId } : { id: '__none__' };
  }

  /** Throws unless the learner may open this course. */
  async assertCanLearn(tenant: TenantContext, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { AND: [{ id: courseId }, this.learnerFilter(tenant)] },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  /**
   * Throws unless the caller may edit this course. Ownership first, then
   * same-school staff; a teacher can never reach another school's course.
   */
  async assertCanEdit(tenant: TenantContext, courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    if (tenant.isPlatformAdmin) return course;

    if (course.teacherId === tenant.userId) return course;

    const sameSchool = !!course.schoolId && course.schoolId === tenant.schoolId;
    if (sameSchool && (tenant.isSchoolAdmin || tenant.role === AppRole.DISTRICT_ADMIN)) return course;

    throw new ForbiddenException('You cannot modify this course');
  }

  /**
   * Publishing is stricter than editing: a course may only be published into
   * the publisher's own school unless a platform admin is doing it.
   */
  async assertCanPublish(tenant: TenantContext, courseId: string) {
    const course = await this.assertCanEdit(tenant, courseId);
    if (tenant.isPlatformAdmin) return course;
    if (course.schoolId && course.schoolId !== tenant.schoolId) {
      throw new ForbiddenException('You cannot publish into another school');
    }
    if (!course.schoolId && course.visibility === 'PUBLIC') {
      throw new ForbiddenException('Only a platform admin can publish a course platform-wide');
    }
    return course;
  }

  /** Walks a section/lesson/activity back to its course and checks edit rights. */
  async assertCanEditSection(tenant: TenantContext, sectionId: string) {
    const section = await this.prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Section not found');
    await this.assertCanEdit(tenant, section.courseId);
    return section;
  }

  async assertCanEditLesson(tenant: TenantContext, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.assertCanEdit(tenant, lesson.courseId);
    return lesson;
  }

  async assertCanEditActivity(tenant: TenantContext, activityId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: { lesson: { select: { courseId: true } } },
    });
    if (!activity) throw new NotFoundException('Activity not found');
    await this.assertCanEdit(tenant, activity.lesson.courseId);
    return activity;
  }
}
