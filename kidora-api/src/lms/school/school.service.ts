import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache.service';
import { TenancyService } from '../common/tenancy.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AuditService } from '../common/audit.service';
import { ActivityService } from '../common/activity.service';
import { PaginationDto, paginate, skip } from '../common/dto/pagination.dto';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import type { CreateStudentDto, CreateTeacherDto, CreateClassDto } from './dto';

@Injectable()
export class SchoolService {
  constructor(private prisma: PrismaService, private cache: CacheService, private tenancy: TenancyService, private analytics: AnalyticsService, private audit: AuditService, private activity: ActivityService) {}

  dashboard(u: AuthUser, range?: string) {
    const schoolId = this.tenancy.requireSchool(u);
    return this.cache.wrap(`dash:school:${schoolId}:${range ?? 'week'}:${u.id}`, 120, () => this.build(u, schoolId, range));
  }

  private async build(u: AuthUser, schoolId: string, range?: string) {
    const from = this.analytics.rangeFrom(range);
    const prevFrom = new Date(from.getTime() - (Date.now() - from.getTime()));
    const studentIds = (await this.prisma.user.findMany({ where: { schoolId, role: 'CHILD', active: true }, select: { id: true } })).map((s) => s.id);
    const [school, admin, teachers, courses, classes, newStudents, newStudentsPrev, avgCompletion, health, alerts, summary, subjects, topClasses, recent, unread, classIds] = await Promise.all([
      this.prisma.school.findUniqueOrThrow({ where: { id: schoolId }, select: { id: true, name: true, logoUrl: true, plan: true } }),
      this.prisma.user.findUniqueOrThrow({ where: { id: u.id }, select: { id: true, name: true, avatarUrl: true, avatarColor: true, role: true, schoolId: true } }),
      this.prisma.user.count({ where: { schoolId, role: 'TEACHER', active: true } }),
      this.prisma.course.count({ where: { schoolId, status: { not: 'ARCHIVED' } } }),
      this.prisma.schoolClass.count({ where: { schoolId, active: true } }),
      this.prisma.user.count({ where: { schoolId, role: 'CHILD', createdAt: { gte: from } } }),
      this.prisma.user.count({ where: { schoolId, role: 'CHILD', createdAt: { gte: prevFrom, lt: from } } }),
      this.prisma.courseEnrollment.aggregate({ where: { studentId: { in: studentIds }, status: { not: 'DROPPED' } }, _avg: { progressPercent: true } }),
      this.analytics.studentHealth(studentIds, schoolId),
      this.prisma.notification.findMany({ where: { userId: u.id, type: { in: ['RISK_ALERT', 'COURSE_APPROVAL', 'EXAM_SCHEDULED', 'REGISTRATION', 'ANNOUNCEMENT', 'SYSTEM'] } }, orderBy: { createdAt: 'desc' }, take: 6 }),
      this.analytics.assessmentSummary(studentIds, from),
      this.analytics.subjectPerformance(studentIds),
      this.topClasses(schoolId),
      this.prisma.activityEvent.findMany({ where: { schoolId, type: { in: ['COURSE_CREATED', 'COURSE_PUBLISHED', 'STUDENT_REGISTERED', 'TEACHER_REGISTERED', 'QUIZ_SUBMITTED', 'ASSIGNMENT_GRADED', 'REPORT_GENERATED', 'CERTIFICATE_ISSUED'] } }, orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, type: true, title: true, xpDelta: true, createdAt: true, user: { select: { id: true, name: true, avatarUrl: true, avatarColor: true, grade: { select: { name: true } } } } } }),
      this.prisma.notification.count({ where: { userId: u.id, read: false } }),
      this.prisma.schoolClass.findMany({ where: { schoolId, active: true }, select: { id: true }, take: 6 }),
    ]);
    const vals = [...health.values()];
    const progress = await this.analytics.classProgressSeries(classIds.map((c) => c.id), from);
    return {
      school, admin,
      kpis: {
        students: { value: studentIds.length, unit: 'count', trend: { delta: newStudents - newStudentsPrev, label: 'new vs previous period' } },
        teachers: { value: teachers, unit: 'count' }, courses: { value: courses, unit: 'count' }, classes: { value: classes, unit: 'count' },
        averageCompletion: { value: Math.round(avgCompletion._avg.progressPercent ?? 0), unit: 'percent' },
      },
      learningProgress: progress,
      studentHealth: { onTrack: vals.filter((v) => v.health === 'ON_TRACK').length, needsSupport: vals.filter((v) => v.health === 'NEEDS_SUPPORT').length, atRisk: vals.filter((v) => v.health === 'AT_RISK').length, total: vals.length },
      alerts,
      academicOverview: { courseCompletion: Math.round(avgCompletion._avg.progressPercent ?? 0), assignmentCompletion: summary.assignmentCompletion, quizAverage: summary.quizAverage, examPassRate: summary.examPassRate },
      topSubjects: subjects.slice(0, 5), topClasses: topClasses.slice(0, 5),
      recentActivity: recent.map((r) => ({ id: r.id, type: r.type, title: r.title, xpDelta: r.xpDelta, createdAt: r.createdAt, actor: { id: r.user.id, name: r.user.name, avatarUrl: r.user.avatarUrl, avatarColor: r.user.avatarColor, grade: r.user.grade?.name ?? null } })),
      unreadNotifications: unread,
    };
  }

  private async topClasses(schoolId: string) {
    const rows = await this.prisma.schoolClass.findMany({ where: { schoolId, active: true }, select: { id: true, name: true, grade: { select: { name: true } }, teachers: { take: 1, select: { subject: { select: { name: true, accent: true } } } }, enrollments: { where: { status: 'ACTIVE' }, select: { studentId: true } } } });
    const all = await this.analytics.studentHealth(rows.flatMap((r) => r.enrollments.map((e) => e.studentId)), schoolId);
    return rows.map((r) => { const v = r.enrollments.map((e) => all.get(e.studentId)).filter(Boolean) as { progress: number; score: number; health: string }[]; return { id: r.id, name: r.name, grade: r.grade.name, subject: r.teachers[0]?.subject?.name ?? null, subjectAccent: r.teachers[0]?.subject?.accent, studentCount: r.enrollments.length, averageScore: Math.round(v.reduce((a, x) => a + x.score, 0) / Math.max(1, v.length)), completionPercent: Math.round(v.reduce((a, x) => a + x.progress, 0) / Math.max(1, v.length)), atRiskCount: v.filter((x) => x.health === 'AT_RISK').length, lastActivityAt: null }; }).sort((a, b) => b.averageScore - a.averageScore);
  }

  async students(u: AuthUser, q: PaginationDto & { gradeId?: string; classId?: string; status?: string }) {
    const schoolId = this.tenancy.requireSchool(u);
    const where = { schoolId, role: 'CHILD' as const, active: true, ...(q.gradeId ? { gradeId: q.gradeId } : {}), ...(q.classId ? { classEnrollments: { some: { classId: q.classId } } } : {}), ...(q.search ? { OR: [{ name: { contains: q.search, mode: 'insensitive' as const } }, { email: { contains: q.search, mode: 'insensitive' as const } }] } : {}) };
    // Health filter needs computed metrics: filter after scoring the page candidates (bounded by pageSize×5).
    const take = q.status ? q.pageSize * 5 : q.pageSize;
    const [rows, total] = await Promise.all([this.prisma.user.findMany({ where, orderBy: { name: 'asc' }, skip: skip(q), take, select: { id: true, name: true, avatarUrl: true, grade: { select: { name: true } }, classEnrollments: { where: { status: 'ACTIVE' }, take: 1, select: { class: { select: { name: true } } } } } }), this.prisma.user.count({ where })]);
    const h = await this.analytics.studentHealth(rows.map((r) => r.id), schoolId);
    let items = rows.map((r) => ({ id: r.id, name: r.name, avatarUrl: r.avatarUrl, grade: r.grade?.name ?? null, className: r.classEnrollments[0]?.class.name ?? null, progressPercent: h.get(r.id)?.progress ?? 0, averageScore: h.get(r.id)?.score ?? 0, health: h.get(r.id)?.health ?? 'ON_TRACK', lastActiveAt: h.get(r.id)?.lastActiveAt ?? null }));
    if (q.status) items = items.filter((i) => i.health === q.status).slice(0, q.pageSize);
    return paginate(items, q.status ? items.length : total, q);
  }

  async teachers(u: AuthUser, q: PaginationDto) {
    const schoolId = this.tenancy.requireSchool(u);
    const where = { schoolId, role: 'TEACHER' as const, active: true, ...(q.search ? { OR: [{ name: { contains: q.search, mode: 'insensitive' as const } }, { email: { contains: q.search, mode: 'insensitive' as const } }] } : {}) };
    const [rows, total] = await Promise.all([this.prisma.user.findMany({ where, orderBy: { name: 'asc' }, skip: skip(q), take: q.pageSize, select: { id: true, name: true, email: true, avatarUrl: true, emailVerified: true, classesTaught: { select: { classId: true, subject: { select: { name: true } }, class: { select: { _count: { select: { enrollments: true } } } } } } } }), this.prisma.user.count({ where })]);
    return paginate(rows.map((t) => ({ id: t.id, name: t.name, email: t.email, avatarUrl: t.avatarUrl, subject: t.classesTaught[0]?.subject?.name ?? null, classCount: new Set(t.classesTaught.map((c) => c.classId)).size, studentCount: t.classesTaught.reduce((a, c) => a + c.class._count.enrollments, 0), verified: t.emailVerified })), total, q);
  }

  async classes(u: AuthUser, q: PaginationDto & { gradeId?: string }) {
    const schoolId = this.tenancy.requireSchool(u);
    const where = { schoolId, active: true, ...(q.gradeId ? { gradeId: q.gradeId } : {}), ...(q.search ? { name: { contains: q.search, mode: 'insensitive' as const } } : {}) };
    const [rows, total] = await Promise.all([this.prisma.schoolClass.findMany({ where, orderBy: [{ grade: { level: 'asc' } }, { name: 'asc' }], skip: skip(q), take: q.pageSize, select: { id: true } }), this.prisma.schoolClass.count({ where })]);
    const all = await this.topClasses(schoolId);
    return paginate(rows.map((r) => all.find((c) => c.id === r.id)!).filter(Boolean), total, q);
  }

  async courses(u: AuthUser, q: PaginationDto & { status?: string; subjectId?: string; gradeId?: string }) {
    const schoolId = this.tenancy.requireSchool(u);
    const where = { OR: [{ schoolId }, { schoolId: null, status: 'PUBLISHED' as const }], ...(q.status ? { status: q.status as 'DRAFT' } : {}), ...(q.subjectId ? { subjectId: q.subjectId } : {}), ...(q.gradeId ? { gradeId: q.gradeId } : {}), ...(q.search ? { title: { contains: q.search, mode: 'insensitive' as const } } : {}) };
    const [rows, total] = await Promise.all([this.prisma.course.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: skip(q), take: q.pageSize, select: { id: true, slug: true, title: true, status: true, thumbnailUrl: true, accent: true, subject: { select: { name: true, accent: true } }, grade: { select: { name: true } }, teacher: { select: { name: true } }, _count: { select: { lessons: true } } } }), this.prisma.course.count({ where })]);
    return paginate(rows.map((c) => ({ id: c.id, slug: c.slug, title: c.title, status: c.status, subject: c.subject?.name ?? 'General', subjectAccent: c.subject?.accent ?? c.accent, grade: c.grade?.name ?? null, teacher: c.teacher?.name ?? null, thumbnailUrl: c.thumbnailUrl, progressPercent: 0, lessonsCompleted: 0, totalLessons: c._count.lessons, currentLesson: null, lastActivityAt: null })), total, q);
  }

  async analyticsView(u: AuthUser, f: { from?: string; to?: string }) {
    const schoolId = this.tenancy.requireSchool(u);
    const from = f.from ? new Date(f.from) : this.analytics.rangeFrom('month');
    const ids = (await this.prisma.user.findMany({ where: { schoolId, role: 'CHILD', active: true }, select: { id: true } })).map((s) => s.id);
    const classIds = (await this.prisma.schoolClass.findMany({ where: { schoolId, active: true }, select: { id: true }, take: 6 })).map((c) => c.id);
    const [progress, subjects, h] = await Promise.all([this.analytics.classProgressSeries(classIds, from), this.analytics.subjectPerformance(ids), this.analytics.studentHealth(ids, schoolId)]);
    const v = [...h.values()];
    await this.activity.log({ userId: u.id, schoolId, type: 'REPORT_GENERATED', title: 'Generated analytics report' });
    return { progress, subjects, health: { onTrack: v.filter((x) => x.health === 'ON_TRACK').length, needsSupport: v.filter((x) => x.health === 'NEEDS_SUPPORT').length, atRisk: v.filter((x) => x.health === 'AT_RISK').length, total: v.length } };
  }

  /** Reads the existing Subscription of the school admin (existing billing flow is untouched). */
  async billing(u: AuthUser) {
    const schoolId = this.tenancy.requireSchool(u);
    const [school, sub, used] = await Promise.all([this.prisma.school.findUniqueOrThrow({ where: { id: schoolId }, select: { plan: true, studentLimit: true, storageBytes: true } }), this.prisma.subscription.findUnique({ where: { userId: u.id } }), this.prisma.user.count({ where: { schoolId, role: 'CHILD', active: true } })]);
    return { plan: sub?.plan ?? school.plan, status: sub?.status ?? 'active', studentLimit: school.studentLimit, studentsUsed: used, storageUsedBytes: Number(school.storageBytes), storageLimitBytes: 50 * 1024 ** 3, renewsAt: sub?.renewsAt ?? null, provider: sub?.provider ?? null };
  }

  /** Creates a student account in this school. Password/invite flow reuses your existing auth (see note). */
  async createStudent(u: AuthUser, dto: CreateStudentDto, ip?: string) {
    const schoolId = this.tenancy.requireSchool(u);
    const [school, count] = await Promise.all([this.prisma.school.findUniqueOrThrow({ where: { id: schoolId }, select: { studentLimit: true } }), this.prisma.user.count({ where: { schoolId, role: 'CHILD', active: true } })]);
    if (count >= school.studentLimit) throw new BadRequestException('Student limit reached for your plan.');
    if (await this.prisma.user.findUnique({ where: { email: dto.email } })) throw new ConflictException('An account with this email already exists.');
    if (dto.classId) { const c = await this.prisma.schoolClass.findUnique({ where: { id: dto.classId }, select: { schoolId: true, gradeId: true } }); if (!c) throw new BadRequestException('Class not found.'); this.tenancy.assertSameSchool(u, c.schoolId); dto.gradeId = dto.gradeId ?? c.gradeId; }
    const student = await this.prisma.user.create({ data: { name: dto.name, email: dto.email, role: 'CHILD', schoolId, gradeId: dto.gradeId, displayName: dto.displayName ?? dto.name.split(' ')[0], wallet: { create: {} }, ...(dto.classId ? { classEnrollments: { create: { classId: dto.classId } } } : {}) }, select: { id: true, name: true, email: true } });
    if (dto.parentEmail) { const parent = await this.prisma.user.findUnique({ where: { email: dto.parentEmail }, select: { id: true, role: true } }); if (parent?.role === 'PARENT') await this.prisma.parentStudent.create({ data: { parentId: parent.id, studentId: student.id } }); }
    await Promise.all([this.audit.record({ actorId: u.id, schoolId, action: 'student.create', entityType: 'User', entityId: student.id, after: { name: student.name, email: student.email }, ip }), this.activity.log({ userId: student.id, schoolId, type: 'STUDENT_REGISTERED', title: `${student.name} joined the school` })]);
    return student;
  }

  async createTeacher(u: AuthUser, dto: CreateTeacherDto, ip?: string) {
    const schoolId = this.tenancy.requireSchool(u);
    if (await this.prisma.user.findUnique({ where: { email: dto.email } })) throw new ConflictException('An account with this email already exists.');
    const t = await this.prisma.user.create({ data: { name: dto.name, email: dto.email, role: 'TEACHER', schoolId }, select: { id: true, name: true, email: true } });
    await Promise.all([this.audit.record({ actorId: u.id, schoolId, action: 'teacher.create', entityType: 'User', entityId: t.id, after: { name: t.name, email: t.email }, ip }), this.activity.log({ userId: t.id, schoolId, type: 'TEACHER_REGISTERED', title: `${t.name} joined as a teacher` })]);
    return t;
  }

  async createClass(u: AuthUser, dto: CreateClassDto, ip?: string) {
    const schoolId = this.tenancy.requireSchool(u);
    const grade = await this.prisma.grade.findUnique({ where: { id: dto.gradeId }, select: { schoolId: true } });
    if (!grade) throw new BadRequestException('Grade not found.'); this.tenancy.assertSameSchool(u, grade.schoolId);
    if (dto.teacherId) { const t = await this.prisma.user.findUnique({ where: { id: dto.teacherId }, select: { schoolId: true, role: true } }); if (t?.role !== 'TEACHER') throw new BadRequestException('Teacher not found.'); this.tenancy.assertSameSchool(u, t.schoolId); }
    const c = await this.prisma.schoolClass.create({ data: { name: dto.name, schoolId, gradeId: dto.gradeId, academicYear: dto.academicYear ?? '', ...(dto.teacherId ? { teachers: { create: { teacherId: dto.teacherId, subjectId: dto.subjectId, isPrimary: true } } } : {}) } });
    await this.audit.record({ actorId: u.id, schoolId, action: 'class.create', entityType: 'SchoolClass', entityId: c.id, after: { name: c.name }, ip });
    return c;
  }

  /** Approve a course in REVIEW (spec §27). */
  async approveCourse(u: AuthUser, courseId: string, approve: boolean, note?: string, ip?: string) {
    const c = await this.prisma.course.findUnique({ where: { id: courseId }, select: { schoolId: true, status: true, title: true, teacherId: true } });
    if (!c) throw new BadRequestException('Course not found.'); this.tenancy.assertSameSchool(u, c.schoolId);
    const updated = await this.prisma.course.update({ where: { id: courseId }, data: approve ? { status: 'PUBLISHED', published: true, publishedAt: new Date(), reviewNote: note } : { status: 'DRAFT', reviewNote: note } });
    await Promise.all([
      this.audit.record({ actorId: u.id, schoolId: c.schoolId, action: approve ? 'course.publish' : 'course.reject', entityType: 'Course', entityId: courseId, before: { status: c.status }, after: { status: updated.status }, ip }),
      approve ? this.activity.log({ userId: u.id, schoolId: c.schoolId, type: 'COURSE_PUBLISHED', title: `Published course: ${c.title}`, entityType: 'course', entityId: courseId }) : Promise.resolve(),
      c.teacherId ? this.prisma.notification.create({ data: { userId: c.teacherId, type: 'COURSE_APPROVAL', title: approve ? 'Course approved' : 'Course needs changes', body: `${c.title}${note ? `: ${note}` : ''}`, link: `/teacher/courses/${courseId}` } }) : Promise.resolve(),
    ]);
    return updated;
  }
}
