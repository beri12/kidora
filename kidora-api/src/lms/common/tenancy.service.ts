import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from './decorators/current-user.decorator';
import { SCHOOL_ADMIN_ROLES } from './decorators/roles.decorator';

/**
 * Every cross-entity authorization check lives here (spec §76).
 * Controllers never trust ids from the client without one of these.
 */
@Injectable()
export class TenancyService {
  constructor(private prisma: PrismaService) {}

  isPlatformAdmin(u: AuthUser) { return u.role === 'SUPER_ADMIN' || u.role === 'ADMIN'; }

  /** School admin (or platform admin) may only touch their own school. */
  requireSchool(u: AuthUser): string {
    if (!u.schoolId) throw new ForbiddenException('No school linked to this account.');
    return u.schoolId;
  }

  assertSameSchool(u: AuthUser, resourceSchoolId: string | null | undefined) {
    if (this.isPlatformAdmin(u)) return;
    if (!resourceSchoolId || resourceSchoolId !== u.schoolId) throw new ForbiddenException('This resource belongs to another school.');
  }

  /** Parent ↔ student link (ParentStudent). */
  async assertParentOf(parentId: string, studentId: string) {
    const link = await this.prisma.parentStudent.findUnique({ where: { parentId_studentId: { parentId, studentId } }, select: { id: true } });
    if (!link) throw new ForbiddenException('This student is not linked to your account.');
  }

  /** Teacher must teach the class (ClassTeacher) and be in the same school. */
  async assertTeacherOfClass(u: AuthUser, classId: string) {
    const cls = await this.prisma.schoolClass.findUnique({ where: { id: classId }, select: { schoolId: true, teachers: { where: { teacherId: u.id }, select: { id: true } } } });
    if (!cls) throw new NotFoundException('Class not found.');
    if (SCHOOL_ADMIN_ROLES.includes(u.role)) { this.assertSameSchool(u, cls.schoolId); return; }
    if (cls.schoolId !== u.schoolId || !cls.teachers.length) throw new ForbiddenException('You do not teach this class.');
  }

  /** Teacher must own the course or teach a class that has it. */
  async assertTeacherOfCourse(u: AuthUser, courseId: string) {
    const c = await this.prisma.course.findUnique({ where: { id: courseId }, select: { schoolId: true, teacherId: true, classCourses: { select: { class: { select: { teachers: { where: { teacherId: u.id }, select: { id: true } } } } } } } });
    if (!c) throw new NotFoundException('Course not found.');
    if (SCHOOL_ADMIN_ROLES.includes(u.role)) { this.assertSameSchool(u, c.schoolId); return; }
    const teaches = c.teacherId === u.id || c.classCourses.some((cc) => cc.class.teachers.length > 0);
    if (!teaches) throw new ForbiddenException('You do not teach this course.');
  }

  /** Teacher may see a student only if they share a class. */
  async assertTeacherOfStudent(u: AuthUser, studentId: string) {
    if (SCHOOL_ADMIN_ROLES.includes(u.role)) {
      const s = await this.prisma.user.findUnique({ where: { id: studentId }, select: { schoolId: true } });
      if (!s) throw new NotFoundException('Student not found.');
      this.assertSameSchool(u, s.schoolId); return;
    }
    const shared = await this.prisma.classEnrollment.count({ where: { studentId, class: { teachers: { some: { teacherId: u.id } } } } });
    if (!shared) throw new ForbiddenException('This student is not in your classes.');
  }

  /** Class ids a teacher is allowed to query (empty array = none). */
  async teacherClassIds(teacherId: string) {
    const rows = await this.prisma.classTeacher.findMany({ where: { teacherId }, select: { classId: true } });
    return rows.map((r) => r.classId);
  }
}
