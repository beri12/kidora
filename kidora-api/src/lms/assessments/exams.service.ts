import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../common/tenancy.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import type { CreateExamDto } from './dto';

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService, private tenancy: TenancyService) {}

  async create(u: AuthUser, dto: CreateExamDto) {
    await this.tenancy.assertTeacherOfCourse(u, dto.courseId);
    if (dto.classId) await this.tenancy.assertTeacherOfClass(u, dto.classId);
    const quiz = await this.prisma.quiz.findUnique({ where: { id: dto.quizId }, select: { exam: { select: { id: true } } } });
    if (!quiz) throw new NotFoundException('Question bank not found.'); if (quiz.exam) throw new BadRequestException('That quiz is already used by an exam.');
    const schoolId = this.tenancy.requireSchool(u);
    return this.prisma.$transaction(async (tx) => {
      await tx.quiz.update({ where: { id: dto.quizId }, data: { kind: 'FINAL_EXAM' } });
      return tx.exam.create({ data: { title: dto.title, description: dto.description ?? '', schoolId, courseId: dto.courseId, classId: dto.classId, quizId: dto.quizId, teacherId: u.id, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null, availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : null, availableUntil: dto.availableUntil ? new Date(dto.availableUntil) : null, durationMin: dto.durationMin, passingScore: dto.passingScore ?? 60, status: dto.scheduledAt ? 'SCHEDULED' : 'DRAFT' } });
    });
  }

  async setStatus(u: AuthUser, id: string, status: 'SCHEDULED' | 'OPEN' | 'CLOSED') {
    const x = await this.prisma.exam.findUnique({ where: { id }, select: { schoolId: true, teacherId: true, classId: true, courseId: true, title: true, scheduledAt: true } });
    if (!x) throw new NotFoundException(); this.tenancy.assertSameSchool(u, x.schoolId);
    if (x.teacherId !== u.id) await this.tenancy.assertTeacherOfCourse(u, x.courseId);
    const exam = await this.prisma.exam.update({ where: { id }, data: { status } });
    if (status === 'SCHEDULED' || status === 'OPEN') {
      const ids = x.classId ? (await this.prisma.classEnrollment.findMany({ where: { classId: x.classId, status: 'ACTIVE' }, select: { studentId: true } })).map((s) => s.studentId) : (await this.prisma.courseEnrollment.findMany({ where: { courseId: x.courseId }, select: { studentId: true } })).map((s) => s.studentId);
      if (ids.length) await this.prisma.notification.createMany({ data: ids.map((userId) => ({ userId, type: 'EXAM_SCHEDULED' as const, title: status === 'OPEN' ? 'Exam is open' : 'Exam scheduled', body: x.title, link: '/student/exams' })) });
    }
    return exam;
  }

  listForTeacher(u: AuthUser) {
    return this.prisma.exam.findMany({ where: { schoolId: u.schoolId ?? undefined, OR: [{ teacherId: u.id }, { class: { teachers: { some: { teacherId: u.id } } } }] }, orderBy: { scheduledAt: 'asc' }, include: { course: { select: { title: true } }, class: { select: { name: true } }, _count: { select: { attempts: true } } } });
  }
}
