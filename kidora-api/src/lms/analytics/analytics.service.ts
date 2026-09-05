import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type Health = 'ON_TRACK' | 'NEEDS_SUPPORT' | 'AT_RISK';
const PALETTE = ['#7C3AED', '#22C55E', '#3B82F6', '#F59E0B', '#EC4899', '#14B8A6'];

/** Shared aggregation used by teacher, school and parent dashboards. DB-side where Prisma allows. */
@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  rangeFrom(range?: string) { const d = new Date(); d.setUTCHours(0, 0, 0, 0); if (range === 'today') return d; d.setUTCDate(d.getUTCDate() - (range === 'month' ? 29 : 6)); return d; }

  /** Per-student metrics + health label using the school's configured rules. */
  async studentHealth(studentIds: string[], schoolId: string | null) {
    if (!studentIds.length) return new Map<string, { progress: number; score: number; lastActiveAt: Date | null; health: Health }>();
    const s = schoolId ? await this.prisma.schoolSettings.findUnique({ where: { schoolId } }) : null;
    const rules = { riskC: s?.atRiskCompletionBelow ?? 40, riskS: s?.atRiskScoreBelow ?? 50, riskD: s?.atRiskInactiveDays ?? 14, supC: s?.supportCompletionBelow ?? 60, supS: s?.supportScoreBelow ?? 65, supD: s?.supportInactiveDays ?? 7 };
    const [prog, score, users] = await Promise.all([
      this.prisma.courseEnrollment.groupBy({ by: ['studentId'], where: { studentId: { in: studentIds }, status: { not: 'DROPPED' } }, _avg: { progressPercent: true } }),
      this.prisma.quizAttempt.groupBy({ by: ['studentId'], where: { studentId: { in: studentIds }, status: { in: ['SUBMITTED', 'GRADED'] } }, _avg: { percent: true } }),
      this.prisma.user.findMany({ where: { id: { in: studentIds } }, select: { id: true, lastActiveAt: true } }),
    ]);
    const now = Date.now();
    const out = new Map<string, { progress: number; score: number; lastActiveAt: Date | null; health: Health }>();
    for (const u of users) {
      const p = Math.round(prog.find((x) => x.studentId === u.id)?._avg.progressPercent ?? 0);
      const sc = Math.round(score.find((x) => x.studentId === u.id)?._avg.percent ?? 0);
      const idle = u.lastActiveAt ? (now - u.lastActiveAt.getTime()) / 86400000 : 999;
      const hasScore = score.some((x) => x.studentId === u.id);
      const health: Health = p < rules.riskC || (hasScore && sc < rules.riskS) || idle > rules.riskD ? 'AT_RISK' : p < rules.supC || (hasScore && sc < rules.supS) || idle > rules.supD ? 'NEEDS_SUPPORT' : 'ON_TRACK';
      out.set(u.id, { progress: p, score: sc, lastActiveAt: u.lastActiveAt, health });
    }
    return out;
  }

  /** Cumulative course-completion % per class, one point per day. */
  async classProgressSeries(classIds: string[], from: Date) {
    const days: string[] = []; for (let d = new Date(from); d <= new Date(); d.setUTCDate(d.getUTCDate() + 1)) days.push(d.toISOString().slice(0, 10));
    const classes = await this.prisma.schoolClass.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true, enrollments: { where: { status: 'ACTIVE' }, select: { studentId: true } }, courses: { select: { course: { select: { _count: { select: { lessons: { where: { status: 'PUBLISHED' } } } } } } } } } });
    const series = await Promise.all(classes.map(async (c, i) => {
      const students = c.enrollments.map((e) => e.studentId);
      const denom = students.length * c.courses.reduce((a, cc) => a + cc.course._count.lessons, 0);
      if (!denom) return { key: c.id, label: c.name, color: PALETTE[i % PALETTE.length], values: days.map(() => 0) };
      const [before, within] = await Promise.all([
        this.prisma.progress.count({ where: { userId: { in: students }, completed: true, completedAt: { lt: from } } }),
        this.prisma.progress.findMany({ where: { userId: { in: students }, completed: true, completedAt: { gte: from } }, select: { completedAt: true } }),
      ]);
      const perDay = new Map<string, number>(); within.forEach((p) => { const k = p.completedAt!.toISOString().slice(0, 10); perDay.set(k, (perDay.get(k) ?? 0) + 1); });
      let cum = before; return { key: c.id, label: c.name, color: PALETTE[i % PALETTE.length], values: days.map((d) => { cum += perDay.get(d) ?? 0; return Math.min(100, Math.round((cum / denom) * 100)); }) };
    }));
    const labels = days.map((d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' }));
    const first = series.map((s) => s.values[0]).reduce((a, b) => a + b, 0) / Math.max(1, series.length);
    const last = series.map((s) => s.values[s.values.length - 1]).reduce((a, b) => a + b, 0) / Math.max(1, series.length);
    const delta = Math.round(last - first);
    return { labels, series, summary: series.length ? `Overall class progress ${delta >= 0 ? 'improved' : 'dropped'} by ${Math.abs(delta)}% in this period.` : undefined };
  }

  /** Topic = section title. Mastery = students whose best quiz score in that section ≥ 80%. */
  async topicMastery(classIds: string[]) {
    const students = (await this.prisma.classEnrollment.findMany({ where: { classId: { in: classIds }, status: 'ACTIVE' }, select: { studentId: true } })).map((e) => e.studentId);
    if (!students.length) return [];
    const attempts = await this.prisma.quizAttempt.findMany({ where: { studentId: { in: students }, status: { in: ['SUBMITTED', 'GRADED'] }, quiz: { lesson: { sectionId: { not: null } } } }, select: { studentId: true, percent: true, quiz: { select: { lesson: { select: { section: { select: { id: true, title: true } } } } } } } });
    const byTopic = new Map<string, { title: string; best: Map<string, number> }>();
    for (const a of attempts) { const s = a.quiz.lesson!.section!; const t = byTopic.get(s.id) ?? { title: s.title, best: new Map() }; t.best.set(a.studentId, Math.max(t.best.get(a.studentId) ?? 0, a.percent)); byTopic.set(s.id, t); }
    return [...byTopic.values()].map((t) => { const vals = [...t.best.values()]; const mastered = vals.filter((v) => v >= 80).length; return { topic: t.title, mastered, total: students.length, averageScore: Math.round(vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length)), masteryPercent: Math.round((mastered / students.length) * 100) }; }).sort((a, b) => a.masteryPercent - b.masteryPercent);
  }

  /** Subject-level performance for a set of students. */
  async subjectPerformance(studentIds: string[]) {
    if (!studentIds.length) return [];
    const [enr, att] = await Promise.all([
      this.prisma.courseEnrollment.findMany({ where: { studentId: { in: studentIds } }, select: { progressPercent: true, course: { select: { subject: { select: { id: true, name: true, accent: true } } } } } }),
      this.prisma.quizAttempt.findMany({ where: { studentId: { in: studentIds }, status: { in: ['SUBMITTED', 'GRADED'] } }, select: { percent: true, quiz: { select: { course: { select: { subjectId: true } }, lesson: { select: { course: { select: { subjectId: true } } } } } } } }),
    ]);
    const m = new Map<string, { subject: string; accent: string; prog: number[]; scores: number[] }>();
    for (const e of enr) { const s = e.course.subject; if (!s) continue; const r = m.get(s.id) ?? { subject: s.name, accent: s.accent, prog: [], scores: [] }; r.prog.push(e.progressPercent); m.set(s.id, r); }
    for (const a of att) { const id = a.quiz.course?.subjectId ?? a.quiz.lesson?.course.subjectId; if (!id || !m.has(id)) continue; m.get(id)!.scores.push(a.percent); }
    const avg = (x: number[]) => Math.round(x.reduce((a, b) => a + b, 0) / Math.max(1, x.length));
    return [...m.values()].map((r) => ({ subject: r.subject, accent: r.accent, averageScore: avg(r.scores), completion: avg(r.prog), mastery: Math.round((r.scores.filter((s) => s >= 80).length / Math.max(1, r.scores.length)) * 100) })).sort((a, b) => b.averageScore - a.averageScore);
  }

  async assessmentSummary(studentIds: string[], from?: Date) {
    if (!studentIds.length) return { assignmentCompletion: 0, quizAverage: 0, examAverage: 0, examPassRate: 0 };
    const [assigned, submitted, quiz, exam] = await Promise.all([
      this.prisma.assignment.count({ where: { status: 'PUBLISHED', OR: [{ class: { enrollments: { some: { studentId: { in: studentIds } } } } }, { course: { enrollments: { some: { studentId: { in: studentIds } } } } }], ...(from ? { createdAt: { gte: from } } : {}) } }),
      this.prisma.assignmentSubmission.count({ where: { studentId: { in: studentIds }, ...(from ? { submittedAt: { gte: from } } : {}) } }),
      this.prisma.quizAttempt.aggregate({ where: { studentId: { in: studentIds }, examId: null, status: { in: ['SUBMITTED', 'GRADED'] }, ...(from ? { submittedAt: { gte: from } } : {}) }, _avg: { percent: true } }),
      this.prisma.quizAttempt.groupBy({ by: ['passed'], where: { studentId: { in: studentIds }, examId: { not: null }, status: { in: ['SUBMITTED', 'GRADED'] }, ...(from ? { submittedAt: { gte: from } } : {}) }, _count: true, _avg: { percent: true } }),
    ]);
    const examN = exam.reduce((a, g) => a + g._count, 0); const passed = exam.find((g) => g.passed)?._count ?? 0;
    const examAvg = examN ? Math.round(exam.reduce((a, g) => a + (g._avg.percent ?? 0) * g._count, 0) / examN) : 0;
    return { assignmentCompletion: assigned ? Math.min(100, Math.round((submitted / (assigned * studentIds.length)) * 100)) : 0, quizAverage: Math.round(quiz._avg.percent ?? 0), examAverage: examAvg, examPassRate: examN ? Math.round((passed / examN) * 100) : 0 };
  }
}
