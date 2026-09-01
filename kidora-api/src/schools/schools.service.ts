import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TenantService } from '../common/tenancy/tenant.service';
import { TenantContext } from '../common/tenancy/tenant.types';
import { AuditService } from '../common/services/audit.service';
import { AppRole } from '../common/enums/role.enum';
import {
  AddClassStudentsDto,
  CreateClassDto,
  CreateGradeDto,
  ListQueryDto,
  UpdateClassDto,
  UpdateSchoolDto,
} from './dto/school.dto';

// Columns that are safe to return for a person. Deliberately excludes
// passwordHash, mfaSecret, backupCodes, tokens and login history.
const PERSON_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarColor: true,
  avatarUrl: true,
  points: true,
  streak: true,
  createdAt: true,
  gradeId: true,
} as const;

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class SchoolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantService,
    private readonly audit: AuditService,
  ) {}

  private page(query: ListQueryDto) {
    const pageSize = Math.min(query.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const page = query.page ?? 1;
    return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
  }

  // ---------------------------------------------------------------- school

  async me(tenant: TenantContext) {
    const schoolId = this.tenants.requireSchoolId(tenant);
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        district: { select: { id: true, name: true, region: true } },
        _count: { select: { members: true, grades: true, classes: true, courses: true } },
      },
    });
    if (!school) throw new NotFoundException('School not found');
    return school;
  }

  async update(tenant: TenantContext, dto: UpdateSchoolDto) {
    const schoolId = this.tenants.requireSchoolId(tenant);
    const school = await this.prisma.school.update({ where: { id: schoolId }, data: dto });
    await this.audit.record({
      actorId: tenant.userId, schoolId, action: 'school.update', entity: 'School',
      entityId: schoolId, meta: { ...dto },
    });
    return school;
  }

  /**
   * Dashboard rollup for one school. Every count is filtered by the resolved
   * tenant, so a school administrator can never see another school's numbers.
   */
  async dashboard(tenant: TenantContext) {
    const schoolId = this.tenants.requireSchoolId(tenant);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [students, teachers, classes, courses, publishedCourses, activeToday, certificates] =
      await Promise.all([
        this.prisma.user.count({ where: { schoolId, role: 'CHILD' } }),
        this.prisma.user.count({ where: { schoolId, role: 'TEACHER' } }),
        this.prisma.schoolClass.count({ where: { schoolId, isActive: true } }),
        this.prisma.course.count({ where: { schoolId } }),
        this.prisma.course.count({ where: { schoolId, published: true } }),
        this.prisma.user.count({ where: { schoolId, role: 'CHILD', updatedAt: { gte: dayAgo } } }),
        this.prisma.certificate.count({ where: { schoolId } }),
      ]);

    const progressRows = await this.prisma.courseProgress.findMany({
      where: { course: { schoolId } },
      select: { percent: true, completed: true, studentId: true },
    });
    const completionRate = progressRows.length
      ? Math.round((progressRows.filter((r) => r.completed).length / progressRows.length) * 100)
      : 0;
    const avgProgress = progressRows.length
      ? Math.round(progressRows.reduce((a, r) => a + r.percent, 0) / progressRows.length)
      : 0;

    const quizRows = await this.prisma.quizAttempt.findMany({
      where: { status: 'SUBMITTED', student: { schoolId } },
      select: { percent: true },
      take: 2000,
      orderBy: { submittedAt: 'desc' },
    });
    const averageScore = quizRows.length
      ? Math.round(quizRows.reduce((a, r) => a + r.percent, 0) / quizRows.length)
      : 0;

    // "At risk" is deliberately private to staff and framed as needing support,
    // never surfaced to children as a ranking (see PHASE 32).
    const atRisk = progressRows.filter((r) => !r.completed && r.percent < 25).length;

    const recentActivity = await this.prisma.analyticsEvent.findMany({
      where: { schoolId, createdAt: { gte: weekAgo } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, name: true, createdAt: true, props: true },
    });

    return {
      students,
      teachers,
      classes,
      courses,
      publishedCourses,
      activeToday,
      certificates,
      completionRate,
      avgProgress,
      averageScore,
      atRisk,
      recentActivity,
    };
  }

  // ---------------------------------------------------------------- people

  async students(tenant: TenantContext, query: ListQueryDto) {
    const schoolId = this.tenants.requireSchoolId(tenant);
    const { skip, take, page, pageSize } = this.page(query);

    const where: any = { schoolId, role: 'CHILD' };
    if (query.q) where.name = { contains: query.q, mode: 'insensitive' };
    if (query.gradeId) where.gradeId = query.gradeId;
    if (query.classId) where.classEnrollments = { some: { classId: query.classId, active: true } };

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          ...PERSON_SELECT,
          grade: { select: { id: true, name: true } },
          _count: { select: { certificates: true, enrollments: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { rows, total, page, pageSize };
  }

  async teachers(tenant: TenantContext, query: ListQueryDto) {
    const schoolId = this.tenants.requireSchoolId(tenant);
    const { skip, take, page, pageSize } = this.page(query);

    const where: any = { schoolId, role: 'TEACHER' };
    if (query.q) where.name = { contains: query.q, mode: 'insensitive' };

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: { ...PERSON_SELECT, _count: { select: { coursesOwned: true, homeroomClasses: true } } },
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { rows, total, page, pageSize };
  }

  // ---------------------------------------------------------------- grades

  async grades(tenant: TenantContext) {
    const schoolId = this.tenants.requireSchoolId(tenant);
    return this.prisma.grade.findMany({
      where: { OR: [{ schoolId }, { schoolId: null }] },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { classes: true, courses: true, students: true } } },
    });
  }

  async createGrade(tenant: TenantContext, dto: CreateGradeDto) {
    const schoolId = this.tenants.requireSchoolId(tenant);
    const existing = await this.prisma.grade.findFirst({ where: { schoolId, name: dto.name } });
    if (existing) throw new BadRequestException('A grade with that name already exists');
    const grade = await this.prisma.grade.create({
      data: { name: dto.name, level: dto.level ?? 0, schoolId },
    });
    await this.audit.record({
      actorId: tenant.userId, schoolId, action: 'grade.create', entity: 'Grade', entityId: grade.id,
      meta: { name: grade.name },
    });
    return grade;
  }

  async deleteGrade(tenant: TenantContext, id: string) {
    const schoolId = this.tenants.requireSchoolId(tenant);
    const grade = await this.prisma.grade.findUnique({ where: { id } });
    if (!grade) throw new NotFoundException('Grade not found');
    // A platform-wide grade (schoolId null) is shared and never deletable here.
    if (grade.schoolId !== schoolId) throw new ForbiddenException('Not your grade');
    await this.prisma.grade.delete({ where: { id } });
    await this.audit.record({
      actorId: tenant.userId, schoolId, action: 'grade.delete', entity: 'Grade', entityId: id,
    });
    return { ok: true };
  }

  // ---------------------------------------------------------------- classes

  async classes(tenant: TenantContext, query: ListQueryDto) {
    const schoolId = this.tenants.requireSchoolId(tenant);
    const where: any = { schoolId };
    if (query.gradeId) where.gradeId = query.gradeId;
    if (query.q) where.name = { contains: query.q, mode: 'insensitive' };
    return this.prisma.schoolClass.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        grade: { select: { id: true, name: true } },
        homeroomTeacher: { select: { id: true, name: true } },
        _count: { select: { students: true } },
      },
    });
  }

  async createClass(tenant: TenantContext, dto: CreateClassDto) {
    const schoolId = this.tenants.requireSchoolId(tenant);
    await this.assertGradeInSchool(schoolId, dto.gradeId);
    await this.assertTeacherInSchool(schoolId, dto.homeroomTeacherId);

    const created = await this.prisma.schoolClass.create({
      data: {
        name: dto.name,
        schoolId,
        gradeId: dto.gradeId ?? null,
        homeroomTeacherId: dto.homeroomTeacherId ?? null,
        academicYear: dto.academicYear ?? null,
      },
    });
    await this.audit.record({
      actorId: tenant.userId, schoolId, action: 'class.create', entity: 'SchoolClass',
      entityId: created.id, meta: { name: created.name },
    });
    return created;
  }

  async updateClass(tenant: TenantContext, id: string, dto: UpdateClassDto) {
    const schoolId = this.tenants.requireSchoolId(tenant);
    await this.assertClassInSchool(schoolId, id);
    await this.assertGradeInSchool(schoolId, dto.gradeId);
    await this.assertTeacherInSchool(schoolId, dto.homeroomTeacherId);
    return this.prisma.schoolClass.update({
      where: { id },
      data: {
        name: dto.name,
        gradeId: dto.gradeId,
        homeroomTeacherId: dto.homeroomTeacherId,
        academicYear: dto.academicYear,
        isActive: dto.isActive,
      },
    });
  }

  async classRoster(tenant: TenantContext, id: string) {
    const schoolId = this.tenants.requireSchoolId(tenant);
    await this.assertClassInSchool(schoolId, id);
    return this.prisma.classEnrollment.findMany({
      where: { classId: id, active: true },
      include: { student: { select: PERSON_SELECT } },
      orderBy: { enrolledAt: 'asc' },
    });
  }

  /**
   * Adds students to a class. Every id is re-checked against the caller's own
   * school, so a crafted request cannot pull a child out of another school.
   */
  async addStudents(tenant: TenantContext, classId: string, dto: AddClassStudentsDto) {
    const schoolId = this.tenants.requireSchoolId(tenant);
    await this.assertClassInSchool(schoolId, classId);

    const students = await this.prisma.user.findMany({
      where: { id: { in: dto.studentIds }, schoolId, role: 'CHILD' },
      select: { id: true },
    });
    if (students.length !== dto.studentIds.length) {
      throw new ForbiddenException('One or more students do not belong to your school');
    }

    await this.prisma.$transaction(
      students.map((s) =>
        this.prisma.classEnrollment.upsert({
          where: { classId_studentId: { classId, studentId: s.id } },
          update: { active: true },
          create: { classId, studentId: s.id },
        }),
      ),
    );
    await this.audit.record({
      actorId: tenant.userId, schoolId, action: 'class.students.add', entity: 'SchoolClass',
      entityId: classId, meta: { count: students.length },
    });
    return { added: students.length };
  }

  async removeStudent(tenant: TenantContext, classId: string, studentId: string) {
    const schoolId = this.tenants.requireSchoolId(tenant);
    await this.assertClassInSchool(schoolId, classId);
    await this.prisma.classEnrollment.updateMany({
      where: { classId, studentId },
      data: { active: false },
    });
    await this.audit.record({
      actorId: tenant.userId, schoolId, action: 'class.students.remove', entity: 'SchoolClass',
      entityId: classId, meta: { studentId },
    });
    return { ok: true };
  }

  async setStudentGrade(tenant: TenantContext, studentId: string, gradeId?: string) {
    const schoolId = this.tenants.requireSchoolId(tenant);
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, schoolId, role: 'CHILD' },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Student not found in your school');
    await this.assertGradeInSchool(schoolId, gradeId);
    return this.prisma.user.update({
      where: { id: studentId },
      data: { gradeId: gradeId ?? null },
      select: PERSON_SELECT,
    });
  }

  // ---------------------------------------------------------------- courses

  async courses(tenant: TenantContext, query: ListQueryDto & { status?: string; teacherId?: string }) {
    const schoolId = this.tenants.requireSchoolId(tenant);
    const where: any = { schoolId };
    if (query.gradeId) where.gradeId = query.gradeId;
    if (query.teacherId) where.teacherId = query.teacherId;
    if (query.status === 'published') where.published = true;
    if (query.status === 'draft') where.published = false;
    if (query.q) where.title = { contains: query.q, mode: 'insensitive' };

    return this.prisma.course.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        teacher: { select: { id: true, name: true } },
        grade: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, accent: true } },
        _count: { select: { lessons: true, sections: true, enrollments: true } },
      },
    });
  }

  // ---------------------------------------------------------------- guards

  private async assertClassInSchool(schoolId: string, classId: string) {
    const row = await this.prisma.schoolClass.findUnique({
      where: { id: classId },
      select: { schoolId: true },
    });
    if (!row) throw new NotFoundException('Class not found');
    if (row.schoolId !== schoolId) throw new ForbiddenException('Class belongs to another school');
  }

  private async assertGradeInSchool(schoolId: string, gradeId?: string | null) {
    if (!gradeId) return;
    const row = await this.prisma.grade.findUnique({
      where: { id: gradeId },
      select: { schoolId: true },
    });
    if (!row) throw new NotFoundException('Grade not found');
    if (row.schoolId && row.schoolId !== schoolId) {
      throw new ForbiddenException('Grade belongs to another school');
    }
  }

  private async assertTeacherInSchool(schoolId: string, teacherId?: string | null) {
    if (!teacherId) return;
    const row = await this.prisma.user.findFirst({
      where: { id: teacherId, schoolId, role: { in: [AppRole.TEACHER, AppRole.SCHOOL_ADMIN, AppRole.SCHOOL_LEADER] as any } },
      select: { id: true },
    });
    if (!row) throw new ForbiddenException('Teacher is not a member of your school');
  }
}
