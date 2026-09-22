import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './dto/calendar.dto';

const SCHOOL_ROLES: Role[] = ['SCHOOL_ADMIN', 'SCHOOL_LEADER', 'DISTRICT_ADMIN', 'SUPER_ADMIN', 'ADMIN'];

/** One row on the calendar, whatever it was derived from. */
export interface CalendarItem {
  id: string;
  source: 'event' | 'assignment' | 'exam' | 'lesson';
  type: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string | null;
  allDay: boolean;
  location?: string | null;
  color?: string | null;
  courseId?: string | null;
  courseTitle?: string | null;
  classId?: string | null;
  studentId?: string | null;
  studentName?: string | null;
  /** Only true for rows the caller may edit — derived rows never are. */
  editable: boolean;
  href?: string;
}

const COLORS = { assignment: '#F59E0B', exam: '#EF4444', lesson: '#0EA5E9', event: '#8B5CF6' };

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  private isSchoolRole(u: AuthUser) { return SCHOOL_ROLES.includes(u.role); }

  /** Student ids the caller is allowed to see calendar data for. */
  private async visibleStudentIds(u: AuthUser, childId?: string): Promise<string[]> {
    if (u.role === 'CHILD') return [u.id];

    if (u.role === 'PARENT') {
      const links = await this.prisma.parentStudent.findMany({
        where: { parentId: u.id }, select: { studentId: true },
      });
      const mine = links.map((l) => l.studentId);
      if (!childId) return mine;
      // A parent asking for one child must actually be linked to them.
      if (!mine.includes(childId)) throw new ForbiddenException('That student is not linked to your account.');
      return [childId];
    }

    if (u.role === 'TEACHER') {
      const rows = await this.prisma.classEnrollment.findMany({
        where: { class: { teachers: { some: { teacherId: u.id } } } },
        select: { studentId: true },
      });
      return [...new Set(rows.map((r) => r.studentId))];
    }

    if (this.isSchoolRole(u) && u.schoolId) {
      const rows = await this.prisma.user.findMany({ where: { role: 'CHILD', schoolId: u.schoolId }, select: { id: true } });
      return rows.map((r) => r.id);
    }
    return [];
  }

  private async classIdsFor(u: AuthUser, studentIds: string[]): Promise<string[]> {
    if (u.role === 'TEACHER') {
      const rows = await this.prisma.classTeacher.findMany({ where: { teacherId: u.id }, select: { classId: true } });
      return rows.map((r) => r.classId);
    }
    if (!studentIds.length) return [];
    const rows = await this.prisma.classEnrollment.findMany({
      where: { studentId: { in: studentIds } }, select: { classId: true },
    });
    return [...new Set(rows.map((r) => r.classId))];
  }

  /**
   * Everything happening between two dates, from three sources: explicit
   * CalendarEvent rows, assignment due dates and scheduled exams. Deadlines are
   * read from their own tables rather than duplicated, so they always match
   * what the assignment and exam pages show.
   */
  async range(u: AuthUser, fromIso: string, toIso: string, childId?: string, kinds?: string) {
    const from = new Date(fromIso);
    const to = new Date(toIso);
    const want = kinds ? new Set(kinds.split(',').map((k) => k.trim())) : null;
    const include = (k: string) => !want || want.has(k);

    const studentIds = await this.visibleStudentIds(u, childId);
    const classIds = await this.classIdsFor(u, studentIds);

    const items: CalendarItem[] = [];

    // --- explicit events -----------------------------------------------------
    if (include('event')) {
      const or: Prisma.CalendarEventWhereInput[] = [{ createdById: u.id }];
      if (classIds.length) or.push({ classId: { in: classIds } });
      if (studentIds.length) or.push({ studentId: { in: studentIds } });
      // School-wide events: schoolId set but no narrower audience.
      if (u.schoolId) or.push({ schoolId: u.schoolId, classId: null, studentId: null });

      const events = await this.prisma.calendarEvent.findMany({
        where: { startsAt: { gte: from, lte: to }, OR: or },
        orderBy: { startsAt: 'asc' },
        include: { course: { select: { id: true, title: true } }, student: { select: { id: true, name: true } } },
      });
      items.push(...events.map((e) => ({
        id: e.id,
        source: 'event' as const,
        type: e.type,
        title: e.title,
        description: e.description,
        startsAt: e.startsAt.toISOString(),
        endsAt: e.endsAt?.toISOString() ?? null,
        allDay: e.allDay,
        location: e.location,
        color: e.color ?? COLORS.event,
        courseId: e.courseId,
        courseTitle: e.course?.title ?? null,
        classId: e.classId,
        studentId: e.studentId,
        studentName: e.student?.name ?? null,
        // Only the author edits; everyone else sees it read-only.
        editable: e.createdById === u.id,
      })));
    }

    // --- assignment deadlines ------------------------------------------------
    if (include('assignment')) {
      const where: Prisma.AssignmentWhereInput = {
        dueAt: { gte: from, lte: to },
        status: { not: 'DRAFT' },
        ...(u.role === 'TEACHER'
          ? { teacherId: u.id }
          : classIds.length || studentIds.length
            ? { OR: [{ classId: { in: classIds } }, { submissions: { some: { studentId: { in: studentIds } } } }] }
            : this.isSchoolRole(u) && u.schoolId ? { schoolId: u.schoolId } : { id: '__none__' }),
      };
      const rows = await this.prisma.assignment.findMany({
        where, orderBy: { dueAt: 'asc' }, take: 500,
        select: { id: true, title: true, description: true, dueAt: true, classId: true, course: { select: { id: true, title: true } } },
      });
      items.push(...rows.map((a) => ({
        id: a.id, source: 'assignment' as const, type: 'ASSIGNMENT', title: a.title,
        description: a.description, startsAt: a.dueAt!.toISOString(), endsAt: null,
        allDay: true, location: null, color: COLORS.assignment,
        courseId: a.course?.id ?? null, courseTitle: a.course?.title ?? null,
        classId: a.classId, studentId: null, studentName: null,
        editable: false,
        href: u.role === 'CHILD' ? '/student/assignments' : u.role === 'PARENT' ? '/parent/assignments' : '/teacher/assignments',
      })));
    }

    // --- scheduled exams -----------------------------------------------------
    if (include('exam')) {
      const where: Prisma.ExamWhereInput = {
        scheduledAt: { gte: from, lte: to },
        status: { in: ['SCHEDULED', 'OPEN'] },
        ...(u.role === 'TEACHER'
          ? { teacherId: u.id }
          : classIds.length
            ? { classId: { in: classIds } }
            : this.isSchoolRole(u) && u.schoolId ? { schoolId: u.schoolId } : { id: '__none__' }),
      };
      const rows = await this.prisma.exam.findMany({
        where, orderBy: { scheduledAt: 'asc' }, take: 500,
        select: { id: true, title: true, description: true, scheduledAt: true, durationMin: true, classId: true, course: { select: { id: true, title: true } } },
      });
      items.push(...rows.map((e) => ({
        id: e.id, source: 'exam' as const, type: 'EXAM', title: e.title,
        description: e.description, startsAt: e.scheduledAt!.toISOString(),
        endsAt: e.durationMin ? new Date(e.scheduledAt!.getTime() + e.durationMin * 60000).toISOString() : null,
        allDay: false, location: null, color: COLORS.exam,
        courseId: e.course?.id ?? null, courseTitle: e.course?.title ?? null,
        classId: e.classId, studentId: null, studentName: null,
        editable: false,
        href: u.role === 'CHILD' ? '/student/exams' : u.role === 'PARENT' ? '/parent/assessments' : '/teacher/assignments',
      })));
    }

    items.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return items;
  }

  /** Next few things coming up, for dashboard widgets. */
  async upcoming(u: AuthUser, days = 14, childId?: string) {
    const now = new Date();
    const to = new Date(now.getTime() + days * 86400000);
    return (await this.range(u, now.toISOString(), to.toISOString(), childId)).slice(0, 20);
  }

  /** Every audience field is checked before it is stored. */
  private async assertCanTarget(u: AuthUser, dto: CreateCalendarEventDto) {
    if (dto.classId) {
      const cls = await this.prisma.schoolClass.findUnique({
        where: { id: dto.classId },
        select: { schoolId: true, teachers: { where: { teacherId: u.id }, select: { id: true } } },
      });
      if (!cls) throw new NotFoundException('Class not found.');
      const allowed = this.isSchoolRole(u) ? cls.schoolId === u.schoolId : cls.teachers.length > 0;
      if (!allowed) throw new ForbiddenException('You cannot add events to that class.');
    }

    if (dto.studentId) {
      const visible = await this.visibleStudentIds(u);
      if (!visible.includes(dto.studentId)) throw new ForbiddenException('That student is not in your care.');
    }

    if (dto.courseId) {
      const c = await this.prisma.course.findUnique({ where: { id: dto.courseId }, select: { schoolId: true, teacherId: true } });
      if (!c) throw new NotFoundException('Course not found.');
      const allowed = this.isSchoolRole(u) ? c.schoolId === u.schoolId : c.teacherId === u.id;
      if (!allowed) throw new ForbiddenException('You cannot add events to that course.');
    }

    // Only school staff may publish to the whole school.
    if (dto.schoolWide && !(this.isSchoolRole(u) || u.role === 'TEACHER')) {
      throw new ForbiddenException('Only school staff can create school-wide events.');
    }
  }

  async create(u: AuthUser, dto: CreateCalendarEventDto) {
    await this.assertCanTarget(u, dto);
    return this.prisma.calendarEvent.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() ?? '',
        type: dto.type ?? 'EVENT',
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        allDay: dto.allDay ?? false,
        location: dto.location?.trim() || null,
        color: dto.color || null,
        createdById: u.id,
        // A personal event has no schoolId, so it stays private to its author.
        schoolId: dto.schoolWide || dto.classId || dto.courseId ? u.schoolId : null,
        classId: dto.classId ?? null,
        courseId: dto.courseId ?? null,
        studentId: dto.studentId ?? null,
      },
    });
  }

  private async own(u: AuthUser, id: string) {
    const e = await this.prisma.calendarEvent.findUnique({ where: { id }, select: { id: true, createdById: true } });
    if (!e) throw new NotFoundException('Event not found.');
    // Deliberately author-only: a school admin can create their own events but
    // cannot silently rewrite a teacher's.
    if (e.createdById !== u.id) throw new ForbiddenException('You can only change events you created.');
    return e;
  }

  async update(u: AuthUser, id: string, dto: UpdateCalendarEventDto) {
    await this.own(u, id);
    await this.assertCanTarget(u, dto);
    return this.prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.startsAt !== undefined ? { startsAt: new Date(dto.startsAt) } : {}),
        ...(dto.endsAt !== undefined ? { endsAt: dto.endsAt ? new Date(dto.endsAt) : null } : {}),
        ...(dto.allDay !== undefined ? { allDay: dto.allDay } : {}),
        ...(dto.location !== undefined ? { location: dto.location || null } : {}),
        ...(dto.color !== undefined ? { color: dto.color || null } : {}),
      },
    });
  }

  async remove(u: AuthUser, id: string) {
    await this.own(u, id);
    await this.prisma.calendarEvent.delete({ where: { id } });
    return { ok: true };
  }
}
