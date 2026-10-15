import {
  BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import type { EnrollmentSource, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { LearningService } from './learning.service';

/** No 0/O, 1/I/L: a code read aloud in a classroom must be typed right first time. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LEN = 6;
/** 31^6 ≈ 887 million codes per prefix; with the limits below guessing is hopeless. */
const MAX_FAILED_PER_HOUR = 10;

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];
const SCHOOL_ROLES = ['SCHOOL_ADMIN', 'SCHOOL_LEADER'];

/** Upper case, no spaces; the dash is optional when typing ("cpp7k4m9x" works). */
export function normalizeCode(raw: string): string {
  const s = String(raw ?? '').toUpperCase().replace(/[\s_]/g, '').replace(/[^A-Z0-9-]/g, '');
  if (s.includes('-')) return s;
  // Without a dash, the random part is always the last six characters.
  return s.length > CODE_LEN ? `${s.slice(0, -CODE_LEN)}-${s.slice(-CODE_LEN)}` : s;
}

/** "C++ Programming for Beginners" → "CPP"; "Math 3" → "MAT". Letters only, 2–4 long. */
export function codePrefix(title: string): string {
  const t = title.toUpperCase().replace(/\+/g, 'P').replace(/#/g, 'S');
  const words = t.split(/[^A-Z0-9]+/).filter(Boolean);
  const first = (words[0] ?? '').replace(/[^A-Z]/g, '');
  const initials = words.map((w) => w[0]).join('').replace(/[^A-Z]/g, '');
  const p = first.length >= 2 ? first.slice(0, 3) : initials.slice(0, 3);
  return p.length >= 2 ? p : 'KID';
}

export function randomPart(): string {
  let s = '';
  for (let i = 0; i < CODE_LEN; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

/**
 * Course access codes and assigned enrolments.
 *
 * Every way a course reaches a student is recorded on the enrolment as its
 * `source` (and `assignedById` when someone else gave it), so the student,
 * their parent and the school can see why a course is there. Access itself is
 * always decided here and in LearningService — never by the client.
 */
@Injectable()
export class CourseAccessService {
  constructor(
    private prisma: PrismaService,
    private learning: LearningService,
    private cache: CacheService,
  ) {}

  /* ---------------------------------------------------------- managing */

  /** Who may see and change a course's code: its teachers, its school's leaders, platform admins. */
  private async assertManages(u: AuthUser, courseId: string) {
    const c = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true, title: true, teacherId: true, schoolId: true, accessCode: true, accessCodeEnabled: true,
        accessCodeRotatedAt: true, instructors: { select: { userId: true } },
      },
    });
    if (!c) throw new NotFoundException('Course not found.');
    const ok =
      ADMIN_ROLES.includes(u.role)
      || c.teacherId === u.id
      || c.instructors.some((i) => i.userId === u.id)
      || (SCHOOL_ROLES.includes(u.role) && !!u.schoolId && c.schoolId === u.schoolId);
    if (!ok) throw new ForbiddenException('Only this course’s teachers can manage its code.');
    return c;
  }

  private async uniqueCode(title: string) {
    const prefix = codePrefix(title);
    for (let i = 0; i < 8; i++) {
      const code = `${prefix}-${randomPart()}`;
      const taken = await this.prisma.course.findUnique({ where: { accessCode: code }, select: { id: true } });
      if (!taken) return code;
    }
    throw new HttpException('Could not create a code. Please try again.', HttpStatus.SERVICE_UNAVAILABLE);
  }

  private view(c: { accessCode: string | null; accessCodeEnabled: boolean; accessCodeRotatedAt: Date | null }) {
    return { code: c.accessCode, enabled: Boolean(c.accessCode) && c.accessCodeEnabled, rotatedAt: c.accessCodeRotatedAt };
  }

  async getCode(u: AuthUser, courseId: string) {
    return this.view(await this.assertManages(u, courseId));
  }

  /** Creates the code on first use; afterwards issues a new one (the old stops working at once). */
  async rotateCode(u: AuthUser, courseId: string) {
    const c = await this.assertManages(u, courseId);
    const updated = await this.prisma.course.update({
      where: { id: c.id },
      data: { accessCode: await this.uniqueCode(c.title), accessCodeEnabled: true, accessCodeRotatedAt: new Date() },
      select: { accessCode: true, accessCodeEnabled: true, accessCodeRotatedAt: true },
    });
    return this.view(updated);
  }

  async setCodeEnabled(u: AuthUser, courseId: string, enabled: boolean) {
    const c = await this.assertManages(u, courseId);
    if (enabled && !c.accessCode) return this.rotateCode(u, courseId);
    const updated = await this.prisma.course.update({
      where: { id: c.id }, data: { accessCodeEnabled: enabled },
      select: { accessCode: true, accessCodeEnabled: true, accessCodeRotatedAt: true },
    });
    return this.view(updated);
  }

  /* ------------------------------------------------------ joining by code */

  /**
   * A student joins a course with its code.
   *
   * A code is an invitation: it opens INVITE_ONLY courses. It does not
   * override the other rules — a SCHOOL_ONLY course still needs the student
   * to be in that school, a PREMIUM course still needs a plan (unless the
   * student's own school runs it), and prerequisites still apply.
   */
  async joinByCode(u: AuthUser, rawCode: string) {
    if (u.role !== 'CHILD') throw new ForbiddenException('Course codes are for student accounts.');
    const failKey = `course-code-fail:${u.id}`;
    const fails = (await this.cache.get<number>(failKey)) ?? 0;
    if (fails >= MAX_FAILED_PER_HOUR) {
      throw new HttpException('Too many wrong codes. Please try again in an hour, or ask your teacher.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = normalizeCode(rawCode);
    const bad = async (): Promise<never> => {
      await this.cache.set(failKey, fails + 1, 3600);
      // One message for "no such code" and "code switched off": neither tells
      // a guesser anything.
      throw new NotFoundException('That code didn’t work. Check it with your teacher and try again.');
    };
    if (!/^[A-Z0-9]{2,4}-[A-Z0-9]{6}$/.test(code)) return bad();

    const course = await this.prisma.course.findUnique({
      where: { accessCode: code },
      select: {
        id: true, slug: true, title: true, shortDescription: true, thumbnailUrl: true, accent: true,
        accessCodeEnabled: true, published: true, status: true, access: true, schoolId: true, archivedAt: true,
        prerequisites: { select: { prerequisite: { select: { id: true, title: true } } } },
      },
    });
    if (!course || !course.accessCodeEnabled) return bad();

    const summary = {
      id: course.id, slug: course.slug, title: course.title, shortDescription: course.shortDescription,
      thumbnailUrl: course.thumbnailUrl, accent: course.accent,
    };

    const existing = await this.prisma.courseEnrollment.findUnique({
      where: { courseId_studentId: { courseId: course.id, studentId: u.id } }, select: { id: true },
    });
    if (existing) return { enrolled: true, alreadyEnrolled: true, course: summary };

    if (!course.published || course.status !== 'PUBLISHED' || course.archivedAt) {
      throw new ForbiddenException('This course isn’t open yet. Ask your teacher when it starts.');
    }
    if (course.access === 'SCHOOL_ONLY' && (!u.schoolId || course.schoolId !== u.schoolId)) {
      throw new ForbiddenException('This course is only for students of its school.');
    }
    if (course.access === 'PREMIUM') {
      const ownSchoolCourse = !!u.schoolId && course.schoolId === u.schoolId;
      if (!ownSchoolCourse && !(await this.learning.hasPremiumAccess(u.id))) {
        throw new ForbiddenException('This is a premium course. A Student plan, a parent’s Family plan or your school’s plan unlocks it.');
      }
    }
    const missing = await this.missingPrerequisites(u.id, course.prerequisites.map((p) => p.prerequisite));
    if (missing.length) throw new ForbiddenException(`Finish “${missing[0].title}” first.`);

    await this.createEnrollment(course.id, u.id, 'ACCESS_CODE', null);
    await this.cache.del(failKey);
    return { enrolled: true, alreadyEnrolled: false, course: summary };
  }

  private async missingPrerequisites(studentId: string, prereqs: { id: string; title: string }[]) {
    if (!prereqs.length) return [];
    const done = await this.prisma.courseEnrollment.findMany({
      where: { studentId, status: 'COMPLETED', courseId: { in: prereqs.map((p) => p.id) } }, select: { courseId: true },
    });
    const ids = new Set(done.map((d) => d.courseId));
    return prereqs.filter((p) => !ids.has(p.id));
  }

  private async createEnrollment(courseId: string, studentId: string, source: EnrollmentSource, assignedById: string | null) {
    const first = await this.prisma.lesson.findFirst({
      where: { courseId, status: 'PUBLISHED' }, orderBy: [{ section: { order: 'asc' } }, { order: 'asc' }], select: { id: true },
    });
    // upsert: a double click, or two assigners at once, still leaves one row;
    // an existing enrolment keeps its original source and progress.
    return this.prisma.courseEnrollment.upsert({
      where: { courseId_studentId: { courseId, studentId } },
      create: { courseId, studentId, source, assignedById, lastLessonId: first?.id ?? null, lastActivityAt: new Date() },
      update: {},
    });
  }

  /* ------------------------------------------------------------ assigning */

  /** The students this person may put on a course. */
  private studentScope(u: AuthUser): Prisma.UserWhereInput | null {
    if (u.role === 'PARENT') {
      return { role: 'CHILD', OR: [{ studentLinks: { some: { parentId: u.id } } }, { childProfileAccount: { parentId: u.id } }] };
    }
    if (u.role === 'TEACHER') {
      return { role: 'CHILD', classEnrollments: { some: { status: 'ACTIVE', class: { teachers: { some: { teacherId: u.id } } } } } };
    }
    if (SCHOOL_ROLES.includes(u.role) && u.schoolId) return { role: 'CHILD', schoolId: u.schoolId };
    if (ADMIN_ROLES.includes(u.role)) return { role: 'CHILD' };
    return null;
  }

  private sourceFor(role: string): EnrollmentSource {
    if (role === 'PARENT') return 'PARENT';
    if (role === 'TEACHER') return 'TEACHER';
    if (role === 'SCHOOL_LEADER') return 'SCHOOL_LEADER';
    if (role === 'SCHOOL_ADMIN') return 'SCHOOL';
    return 'ADMIN';
  }

  async assignableStudents(u: AuthUser, courseId: string) {
    const scope = this.studentScope(u);
    if (!scope) throw new ForbiddenException('You cannot assign courses.');
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!course) throw new NotFoundException('Course not found.');
    const rows = await this.prisma.user.findMany({
      where: scope, orderBy: { name: 'asc' }, take: 500,
      select: {
        id: true, name: true, avatarColor: true, gradeLevel: true, grade: { select: { name: true } },
        courseEnrollments: { where: { courseId }, select: { source: true } },
      },
    });
    return rows.map((s) => ({
      id: s.id, name: s.name, avatarColor: s.avatarColor, grade: s.grade?.name ?? s.gradeLevel ?? null,
      enrolled: s.courseEnrollments.length > 0, source: s.courseEnrollments[0]?.source ?? null,
    }));
  }

  /**
   * Parent, teacher, school or admin enrols students.
   *
   * The assigner must be responsible for every student (linked child, a
   * student in a class they teach, a student of their school). What they may
   * assign depends on who they are:
   *   - a teacher or school leader may assign their own / their school's
   *     courses whatever the access mode — they are the ones inviting;
   *   - anything else must already be open to that student (published,
   *     their school, a plan for premium, prerequisites met). A parent cannot
   *     use assignment to skip a paywall or an invitation.
   */
  async assign(u: AuthUser, courseId: string, studentIds: string[]) {
    const scope = this.studentScope(u);
    if (!scope) throw new ForbiddenException('You cannot assign courses.');
    const ids = [...new Set(studentIds)].slice(0, 500);
    if (!ids.length) throw new BadRequestException('Choose at least one student.');

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true, title: true, published: true, status: true, archivedAt: true, schoolId: true, teacherId: true,
        instructors: { select: { userId: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found.');
    if (!course.published || course.status !== 'PUBLISHED' || course.archivedAt) {
      throw new BadRequestException('Publish the course before assigning it.');
    }

    const allowed = await this.prisma.user.findMany({ where: { AND: [scope, { id: { in: ids } }] }, select: { id: true, schoolId: true } });
    if (allowed.length !== ids.length) throw new ForbiddenException('You can only assign courses to your own students or children.');

    const owns =
      ADMIN_ROLES.includes(u.role)
      || course.teacherId === u.id
      || course.instructors.some((i) => i.userId === u.id)
      || (SCHOOL_ROLES.includes(u.role) && !!u.schoolId && course.schoolId === u.schoolId);

    const source = this.sourceFor(u.role);
    const results: { studentId: string; status: 'ENROLLED' | 'ALREADY_ENROLLED' | 'NOT_ALLOWED'; message?: string }[] = [];
    for (const s of allowed) {
      const had = await this.prisma.courseEnrollment.findUnique({
        where: { courseId_studentId: { courseId, studentId: s.id } }, select: { id: true },
      });
      if (had) { results.push({ studentId: s.id, status: 'ALREADY_ENROLLED' }); continue; }
      if (!owns) {
        const d = await this.learning.accessDecision({ id: s.id, role: 'CHILD', schoolId: s.schoolId }, courseId);
        if (!d.allowed) { results.push({ studentId: s.id, status: 'NOT_ALLOWED', message: d.message }); continue; }
      }
      await this.createEnrollment(courseId, s.id, source, u.id);
      await this.prisma.notification.create({
        data: {
          userId: s.id, type: 'NEW_COURSE', title: 'A new course for you',
          body: `You now have “${course.title}”.`, link: `/student/courses/${courseId}`,
        },
      }).catch(() => undefined);
      results.push({ studentId: s.id, status: 'ENROLLED' });
    }
    return {
      enrolled: results.filter((r) => r.status === 'ENROLLED').length,
      alreadyEnrolled: results.filter((r) => r.status === 'ALREADY_ENROLLED').length,
      notAllowed: results.filter((r) => r.status === 'NOT_ALLOWED').length,
      results,
    };
  }
}
