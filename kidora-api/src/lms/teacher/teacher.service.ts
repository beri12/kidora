import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache.service';
import { TenancyService } from '../common/tenancy.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { PaginationDto, paginate, skip } from '../common/dto/pagination.dto';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class TeacherService {
  constructor(private prisma: PrismaService, private cache: CacheService, private tenancy: TenancyService, private analytics: AnalyticsService) {}

  dashboard(u: AuthUser, range?: string) {
    return this.cache.wrap(`dash:teacher:${u.id}:${range ?? 'week'}`, 60, () => this.build(u, range));
  }

  private async build(u: AuthUser, range?: string) {
    const from = this.analytics.rangeFrom(range);
    const classIds = await this.tenancy.teacherClassIds(u.id);
    const classes = await this.classes(u);
    const studentIds = [...new Set((await this.prisma.classEnrollment.findMany({ where: { classId: { in: classIds }, status: 'ACTIVE' }, select: { studentId: true } })).map((e) => e.studentId))];
    const [profile, coursesTeaching, pending, pendingDueSoon, badges, badgesPrev, newStudents, tasks, activity, topics, schedule, unread, unreadMsgs, progress] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: u.id }, select: { id: true, name: true, avatarUrl: true, avatarColor: true, role: true, schoolId: true, emailVerified: true, classesTaught: { select: { subject: { select: { name: true } } }, take: 1 } } }),
      this.prisma.course.count({ where: { status: 'PUBLISHED', OR: [{ teacherId: u.id }, { classCourses: { some: { classId: { in: classIds } } } }] } }),
      this.prisma.assignmentSubmission.count({ where: { status: 'SUBMITTED', assignment: { OR: [{ teacherId: u.id }, { classId: { in: classIds } }] } } }),
      this.prisma.assignment.count({ where: { status: 'PUBLISHED', OR: [{ teacherId: u.id }, { classId: { in: classIds } }], dueAt: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) } } }),
      this.prisma.userBadge.count({ where: { userId: { in: studentIds }, earnedAt: { gte: from } } }),
      this.prisma.userBadge.count({ where: { userId: { in: studentIds }, earnedAt: { gte: new Date(from.getTime() - (Date.now() - from.getTime())), lt: from } } }),
      this.prisma.classEnrollment.count({ where: { classId: { in: classIds }, enrolledAt: { gte: from } } }),
      this.tasks(u),
      this.activity(u, { page: 1, pageSize: 5 }),
      this.analytics.topicMastery(classIds),
      this.prisma.exam.findMany({ where: { OR: [{ teacherId: u.id }, { classId: { in: classIds } }], scheduledAt: { gte: new Date() } }, orderBy: { scheduledAt: 'asc' }, take: 4, select: { id: true, title: true, scheduledAt: true, durationMin: true, class: { select: { name: true } } } }),
      this.prisma.notification.count({ where: { userId: u.id, read: false } }),
      this.unreadMessages(u.id),
      this.analytics.classProgressSeries(classIds.slice(0, 6), from),
    ]);
    const avgProgress = classes.length ? Math.round(classes.reduce((a, c) => a + c.completionPercent, 0) / classes.length) : 0;
    return {
      profile: { id: profile.id, name: profile.name, avatarUrl: profile.avatarUrl, avatarColor: profile.avatarColor, role: profile.role, schoolId: profile.schoolId, subject: profile.classesTaught[0]?.subject?.name ?? null, verified: profile.emailVerified },
      kpis: {
        students: { value: studentIds.length, unit: 'count', caption: `Across ${classes.length} classes`, trend: newStudents ? { delta: newStudents, label: 'new this period' } : undefined },
        coursesTeaching: { value: coursesTeaching, unit: 'count', caption: 'Active courses' },
        pendingAssignments: { value: pending, unit: 'count', caption: pendingDueSoon ? `${pendingDueSoon} due this week` : 'Pending to grade' },
        averageClassProgress: { value: avgProgress, unit: 'percent', trend: progress.series.length ? { delta: Math.round((progress.series.reduce((a, s) => a + s.values[s.values.length - 1] - s.values[0], 0)) / progress.series.length), label: 'in this period' } : undefined },
        badgesAwarded: { value: badges, unit: 'count', trend: { delta: badges - badgesPrev, label: 'vs previous period' } },
      },
      classes, classProgress: progress, tasks: tasks.slice(0, 6), activity: activity.items, topics: topics.slice(0, 6),
      schedule: schedule.map((s) => ({ id: s.id, date: s.scheduledAt!, className: s.class?.name ?? '', title: s.title, startsAt: s.scheduledAt!, endsAt: new Date(s.scheduledAt!.getTime() + (s.durationMin ?? 60) * 60000) })),
      unreadNotifications: unread, unreadMessages: unreadMsgs,
    };
  }

  async classes(u: AuthUser) {
    const rows = await this.prisma.classTeacher.findMany({ where: { teacherId: u.id }, select: { subject: { select: { name: true, accent: true } }, class: { select: { id: true, name: true, grade: { select: { name: true } }, enrollments: { where: { status: 'ACTIVE' }, select: { studentId: true } }, updatedAt: true } } } });
    return Promise.all(rows.map(async (r) => {
      const ids = r.class.enrollments.map((e) => e.studentId);
      const h = await this.analytics.studentHealth(ids, u.schoolId);
      const vals = [...h.values()];
      const last = await this.prisma.activityEvent.findFirst({ where: { userId: { in: ids } }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
      return { id: r.class.id, name: r.class.name, grade: r.class.grade.name, subject: r.subject?.name ?? null, subjectAccent: r.subject?.accent, studentCount: ids.length, averageScore: Math.round(vals.reduce((a, v) => a + v.score, 0) / Math.max(1, vals.length)), completionPercent: Math.round(vals.reduce((a, v) => a + v.progress, 0) / Math.max(1, vals.length)), atRiskCount: vals.filter((v) => v.health === 'AT_RISK').length, lastActivityAt: last?.createdAt ?? null };
    }));
  }

  async classDetail(u: AuthUser, classId: string) {
    await this.tenancy.assertTeacherOfClass(u, classId);
    const base = (await this.classes(u)).find((c) => c.id === classId) ?? (await this.schoolClassSummary(u, classId));
    const enr = await this.prisma.classEnrollment.findMany({ where: { classId, status: 'ACTIVE' }, select: { student: { select: { id: true, name: true, avatarUrl: true } } } });
    const h = await this.analytics.studentHealth(enr.map((e) => e.student.id), u.schoolId);
    const students = enr.map((e) => ({ id: e.student.id, name: e.student.name, avatarUrl: e.student.avatarUrl, className: base.name, grade: base.grade, progressPercent: h.get(e.student.id)?.progress ?? 0, averageScore: h.get(e.student.id)?.score ?? 0, health: h.get(e.student.id)?.health ?? 'ON_TRACK' }));
    return { ...base, students, progress: await this.analytics.classProgressSeries([classId], this.analytics.rangeFrom('month')) };
  }
  private async schoolClassSummary(u: AuthUser, classId: string) {
    const c = await this.prisma.schoolClass.findUniqueOrThrow({ where: { id: classId }, select: { id: true, name: true, grade: { select: { name: true } }, enrollments: { where: { status: 'ACTIVE' }, select: { studentId: true } } } });
    const h = await this.analytics.studentHealth(c.enrollments.map((e) => e.studentId), u.schoolId); const vals = [...h.values()];
    return { id: c.id, name: c.name, grade: c.grade.name, subject: null, subjectAccent: undefined, studentCount: vals.length, averageScore: Math.round(vals.reduce((a, v) => a + v.score, 0) / Math.max(1, vals.length)), completionPercent: Math.round(vals.reduce((a, v) => a + v.progress, 0) / Math.max(1, vals.length)), atRiskCount: vals.filter((v) => v.health === 'AT_RISK').length, lastActivityAt: null };
  }

  async students(u: AuthUser, q: PaginationDto & { classId?: string }) {
    const classIds = q.classId ? [q.classId] : await this.tenancy.teacherClassIds(u.id);
    if (q.classId) await this.tenancy.assertTeacherOfClass(u, q.classId);
    const where = { classId: { in: classIds }, status: 'ACTIVE' as const, student: q.search ? { name: { contains: q.search, mode: 'insensitive' as const } } : undefined };
    const [rows, total] = await Promise.all([
      this.prisma.classEnrollment.findMany({ where, skip: skip(q), take: q.pageSize, orderBy: { student: { name: 'asc' } }, select: { student: { select: { id: true, name: true, avatarUrl: true } }, class: { select: { name: true, grade: { select: { name: true } } } } } }),
      this.prisma.classEnrollment.count({ where }),
    ]);
    const h = await this.analytics.studentHealth(rows.map((r) => r.student.id), u.schoolId);
    return paginate(rows.map((r) => ({ id: r.student.id, name: r.student.name, avatarUrl: r.student.avatarUrl, className: r.class.name, grade: r.class.grade.name, progressPercent: h.get(r.student.id)?.progress ?? 0, averageScore: h.get(r.student.id)?.score ?? 0, health: h.get(r.student.id)?.health ?? 'ON_TRACK' })), total, q);
  }

  async courses(u: AuthUser, status?: string) {
    const classIds = await this.tenancy.teacherClassIds(u.id);
    const rows = await this.prisma.course.findMany({ where: { ...(status ? { status: status as 'DRAFT' } : {}), OR: [{ teacherId: u.id }, { classCourses: { some: { classId: { in: classIds } } } }] }, orderBy: { updatedAt: 'desc' }, select: { id: true, slug: true, title: true, status: true, thumbnailUrl: true, accent: true, subject: { select: { name: true, accent: true } }, grade: { select: { name: true } }, teacher: { select: { name: true } }, _count: { select: { lessons: true, enrollments: true } } } });
    return rows.map((c) => ({ id: c.id, slug: c.slug, title: c.title, status: c.status, subject: c.subject?.name ?? 'General', subjectAccent: c.subject?.accent ?? c.accent, grade: c.grade?.name ?? null, teacher: c.teacher?.name ?? null, thumbnailUrl: c.thumbnailUrl, progressPercent: 0, lessonsCompleted: 0, totalLessons: c._count.lessons, studentCount: c._count.enrollments, currentLesson: null, lastActivityAt: null }));
  }

  async tasks(u: AuthUser, bucket?: string) {
    const classIds = await this.tenancy.teacherClassIds(u.id);
    const [assignments, exams] = await Promise.all([
      this.prisma.assignment.findMany({ where: { status: 'PUBLISHED', OR: [{ teacherId: u.id }, { classId: { in: classIds } }], dueAt: { not: null } }, orderBy: { dueAt: 'asc' }, take: 50, select: { id: true, title: true, dueAt: true, class: { select: { name: true } }, course: { select: { title: true } }, _count: { select: { submissions: { where: { status: 'SUBMITTED' } } } } } }),
      this.prisma.exam.findMany({ where: { status: { in: ['SCHEDULED', 'OPEN'] }, OR: [{ teacherId: u.id }, { classId: { in: classIds } }], scheduledAt: { not: null } }, orderBy: { scheduledAt: 'asc' }, take: 20, select: { id: true, title: true, scheduledAt: true, class: { select: { name: true } }, course: { select: { title: true } } } }),
    ]);
    const bucketOf = (d: Date) => { const days = Math.round((new Date(d.toDateString()).getTime() - new Date(new Date().toDateString()).getTime()) / 86400000); return days < 0 ? 'OVERDUE' : days === 0 ? 'TODAY' : days === 1 ? 'TOMORROW' : 'UPCOMING'; };
    const list = [
      ...assignments.map((a) => ({ id: a.id, type: 'ASSIGNMENT' as const, title: a._count.submissions ? `${a.title} (${a._count.submissions} to grade)` : a.title, className: a.class?.name ?? a.course?.title ?? '', dueAt: a.dueAt!, bucket: bucketOf(a.dueAt!), href: `/teacher/assignments/${a.id}` })),
      ...exams.map((x) => ({ id: x.id, type: 'EXAM' as const, title: x.title, className: x.class?.name ?? x.course.title, dueAt: x.scheduledAt!, bucket: bucketOf(x.scheduledAt!), href: `/teacher/exams/${x.id}` })),
    ].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
    return bucket ? list.filter((t) => t.bucket === bucket) : list;
  }

  async activity(u: AuthUser, q: PaginationDto) {
    const classIds = await this.tenancy.teacherClassIds(u.id);
    const where = { user: { role: 'CHILD' as const, classEnrollments: { some: { classId: { in: classIds } } } } };
    const [rows, total] = await Promise.all([
      this.prisma.activityEvent.findMany({ where, orderBy: { createdAt: 'desc' }, skip: skip(q), take: q.pageSize, select: { id: true, type: true, title: true, xpDelta: true, createdAt: true, user: { select: { id: true, name: true, avatarUrl: true, avatarColor: true, grade: { select: { name: true } } } } } }),
      this.prisma.activityEvent.count({ where }),
    ]);
    return paginate(rows.map((r) => ({ id: r.id, type: r.type, title: r.title, xpDelta: r.xpDelta, createdAt: r.createdAt, actor: { id: r.user.id, name: r.user.name, avatarUrl: r.user.avatarUrl, avatarColor: r.user.avatarColor, grade: r.user.grade?.name ?? null } })), total, q);
  }

  async assignments(u: AuthUser, q: PaginationDto & { classId?: string; status?: string }) {
    const classIds = await this.tenancy.teacherClassIds(u.id);
    const where = { OR: [{ teacherId: u.id }, { classId: { in: classIds } }], ...(q.classId ? { classId: q.classId } : {}), ...(q.status ? { status: q.status as 'DRAFT' } : {}) };
    const [rows, total] = await Promise.all([
      this.prisma.assignment.findMany({ where, orderBy: { dueAt: 'asc' }, skip: skip(q), take: q.pageSize, select: { id: true, title: true, dueAt: true, maxScore: true, status: true, course: { select: { title: true, subject: { select: { name: true } } } }, class: { select: { name: true, _count: { select: { enrollments: true } } } }, _count: { select: { submissions: true } } } }),
      this.prisma.assignment.count({ where }),
    ]);
    return paginate(rows.map((a) => ({ id: a.id, title: a.title, course: a.course?.title ?? a.class?.name ?? null, subject: a.course?.subject?.name ?? null, dueAt: a.dueAt, maxScore: a.maxScore, status: a.status === 'PUBLISHED' ? 'PENDING' as const : 'UPCOMING' as const, submitted: a._count.submissions, total: a.class?._count.enrollments ?? 0 })), total, q);
  }

  /** Student × assessment matrix for one class (paginated by student). */
  async gradebook(u: AuthUser, q: PaginationDto & { classId?: string; courseId?: string }) {
    const classIds = q.classId ? [q.classId] : await this.tenancy.teacherClassIds(u.id);
    if (q.classId) await this.tenancy.assertTeacherOfClass(u, q.classId);
    const [assignments, exams, quizzes] = await Promise.all([
      this.prisma.assignment.findMany({ where: { status: { not: 'DRAFT' }, classId: { in: classIds }, ...(q.courseId ? { courseId: q.courseId } : {}) }, orderBy: { createdAt: 'asc' }, select: { id: true, title: true, maxScore: true } }),
      this.prisma.exam.findMany({ where: { classId: { in: classIds }, ...(q.courseId ? { courseId: q.courseId } : {}) }, select: { id: true, title: true, quizId: true } }),
      this.prisma.quiz.findMany({ where: { kind: { not: 'FINAL_EXAM' }, ...(q.courseId ? { OR: [{ courseId: q.courseId }, { lesson: { courseId: q.courseId } }] } : { OR: [{ course: { classCourses: { some: { classId: { in: classIds } } } } }, { lesson: { course: { classCourses: { some: { classId: { in: classIds } } } } } }] }) }, select: { id: true, title: true }, take: 30 }),
    ]);
    const assessments = [...assignments.map((a) => ({ id: a.id, title: a.title, type: 'ASSIGNMENT' as const, max: a.maxScore })), ...quizzes.map((z) => ({ id: z.id, title: z.title, type: 'QUIZ' as const, max: 100 })), ...exams.map((x) => ({ id: x.id, title: x.title, type: 'EXAM' as const, max: 100 }))];
    const where = { classId: { in: classIds }, status: 'ACTIVE' as const };
    const [enr, total] = await Promise.all([this.prisma.classEnrollment.findMany({ where, skip: skip(q), take: q.pageSize, orderBy: { student: { name: 'asc' } }, select: { student: { select: { id: true, name: true, avatarUrl: true } } } }), this.prisma.classEnrollment.count({ where })]);
    const ids = enr.map((e) => e.student.id);
    const [subs, attempts] = await Promise.all([
      this.prisma.assignmentSubmission.findMany({ where: { studentId: { in: ids }, assignmentId: { in: assignments.map((a) => a.id) } }, select: { studentId: true, assignmentId: true, score: true, status: true } }),
      this.prisma.quizAttempt.findMany({ where: { studentId: { in: ids }, status: { not: 'IN_PROGRESS' }, OR: [{ quizId: { in: quizzes.map((z) => z.id) } }, { examId: { in: exams.map((x) => x.id) } }] }, orderBy: { percent: 'desc' }, select: { studentId: true, quizId: true, examId: true, percent: true } }),
    ]);
    const rows = enr.map((e) => {
      const cells = assessments.map((a) => {
        if (a.type === 'ASSIGNMENT') { const s = subs.find((x) => x.studentId === e.student.id && x.assignmentId === a.id); return { assessmentId: a.id, score: s?.score ?? null, max: a.max, status: !s ? 'MISSING' as const : s.status === 'GRADED' ? 'GRADED' as const : 'SUBMITTED' as const }; }
        const at = attempts.find((x) => x.studentId === e.student.id && (a.type === 'EXAM' ? x.examId === a.id : x.quizId === a.id && !x.examId));
        return { assessmentId: a.id, score: at?.percent ?? null, max: 100, status: at ? 'GRADED' as const : 'MISSING' as const };
      });
      const graded = cells.filter((c) => c.score != null); const average = graded.length ? Math.round(graded.reduce((s, c) => s + (c.score! / c.max) * 100, 0) / graded.length) : null;
      return { student: e.student, cells, average };
    });
    return { assessments, rows: paginate(rows, total, q) };
  }

  async analyticsView(u: AuthUser, f: { classId?: string; courseId?: string; from?: string; to?: string }) {
    const classIds = f.classId ? [f.classId] : await this.tenancy.teacherClassIds(u.id);
    if (f.classId) await this.tenancy.assertTeacherOfClass(u, f.classId);
    const from = f.from ? new Date(f.from) : this.analytics.rangeFrom('month');
    const enr = await this.prisma.classEnrollment.findMany({ where: { classId: { in: classIds }, status: 'ACTIVE' }, select: { studentId: true, student: { select: { name: true, avatarUrl: true } }, class: { select: { name: true, grade: { select: { name: true } } } } } });
    const ids = [...new Set(enr.map((e) => e.studentId))];
    const [series, topics, summary, health] = await Promise.all([this.analytics.classProgressSeries(classIds.slice(0, 6), from), this.analytics.topicMastery(classIds), this.analytics.assessmentSummary(ids, from), this.analytics.studentHealth(ids, u.schoolId)]);
    const atRisk = enr.filter((e) => health.get(e.studentId)?.health !== 'ON_TRACK').map((e) => ({ id: e.studentId, name: e.student.name, avatarUrl: e.student.avatarUrl, className: e.class.name, grade: e.class.grade.name, progressPercent: health.get(e.studentId)!.progress, averageScore: health.get(e.studentId)!.score, health: health.get(e.studentId)!.health }));
    return { classPerformance: series, topics, assignmentCompletion: summary.assignmentCompletion, quizAverage: summary.quizAverage, examAverage: summary.examAverage, atRisk };
  }

  private async unreadMessages(userId: string) {
    const members = await this.prisma.conversationMember.findMany({ where: { userId }, select: { conversationId: true, lastReadAt: true } });
    const counts = await Promise.all(members.map((m) => this.prisma.message.count({ where: { conversationId: m.conversationId, senderId: { not: userId }, createdAt: m.lastReadAt ? { gt: m.lastReadAt } : undefined } })));
    return counts.reduce((a, b) => a + b, 0);
  }
}
