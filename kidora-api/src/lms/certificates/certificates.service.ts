import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../common/activity.service';

@Injectable()
export class CertificatesService {
  constructor(private prisma: PrismaService, private activity: ActivityService) {}

  private code() { return `KID-${new Date().getFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}`; }

  /** One certificate per student per course. Re-issuing returns the existing one. */
  async issueForExam(studentId: string, examId: string, score: number) {
    const exam = await this.prisma.exam.findUniqueOrThrow({ where: { id: examId }, select: { courseId: true, schoolId: true, course: { select: { title: true, grade: { select: { name: true } } } }, school: { select: { name: true } } } });
    const existing = await this.prisma.certificate.findFirst({ where: { userId: studentId, courseId: exam.courseId, revoked: false } });
    if (existing) return existing;
    const s = await this.prisma.user.findUniqueOrThrow({ where: { id: studentId }, select: { name: true, grade: { select: { name: true } } } });
    const cert = await this.prisma.certificate.create({ data: { userId: studentId, courseId: exam.courseId, schoolId: exam.schoolId, courseName: exam.course.title, studentName: s.name, schoolName: exam.school.name, gradeName: s.grade?.name ?? exam.course.grade?.name, score, code: this.code() } });
    await Promise.all([
      this.prisma.notification.create({ data: { userId: studentId, type: 'CERTIFICATE', title: 'Certificate earned!', body: exam.course.title, link: '/student/certificates' } }),
      this.activity.log({ userId: studentId, schoolId: exam.schoolId, type: 'CERTIFICATE_ISSUED', title: `Earned certificate: ${exam.course.title}`, entityType: 'certificate', entityId: cert.id }),
    ]);
    const parents = await this.prisma.parentStudent.findMany({ where: { studentId }, select: { parentId: true } });
    if (parents.length) await this.prisma.notification.createMany({ data: parents.map((p) => ({ userId: p.parentId, type: 'CERTIFICATE' as const, title: `${s.name} earned a certificate`, body: exam.course.title, link: '/parent/achievements' })) });
    return cert;
  }

  /** Public verification. Exposes only what a certificate shows, never the account. */
  async verify(code: string) {
    const c = await this.prisma.certificate.findUnique({ where: { code }, select: { code: true, studentName: true, schoolName: true, courseName: true, gradeName: true, issuedAt: true, revoked: true } });
    if (!c) throw new NotFoundException('No certificate with this ID.');
    return { valid: !c.revoked, ...c };
  }

  /** Backfill: give legacy certificates a code. Idempotent. */
  async backfillCodes() {
    const rows = await this.prisma.certificate.findMany({ where: { code: null }, select: { id: true } });
    for (const r of rows) await this.prisma.certificate.update({ where: { id: r.id }, data: { code: this.code() } });
    return rows.length;
  }
}
