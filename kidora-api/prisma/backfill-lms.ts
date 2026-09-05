/**
 * Idempotent backfill after the LMS migration (spec §68). Run once:
 *   npx ts-node prisma/backfill-lms.ts
 * Safe to run again: uses upsert / IS NULL filters, never deletes.
 */
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
const prisma = new PrismaClient();

async function main() {
  // 1. Certificate codes for legacy rows.
  const certs = await prisma.certificate.findMany({ where: { code: null }, select: { id: true } });
  for (const c of certs) await prisma.certificate.update({ where: { id: c.id }, data: { code: `KID-${new Date().getFullYear()}-${randomBytes(3).toString('hex').toUpperCase()}` } });
  console.log(`certificates coded: ${certs.length}`);

  // 2. Wallet for every user without one (xp seeded from legacy points).
  const users = await prisma.user.findMany({ where: { wallet: null }, select: { id: true, points: true, streak: true } });
  for (const u of users) await prisma.rewardWallet.create({ data: { userId: u.id, xp: u.points, longestStreak: u.streak, level: Math.max(1, Math.floor(Math.sqrt(u.points / 100)) + 1) } });
  console.log(`wallets created: ${users.length}`);

  // 3. CourseEnrollment rollups from existing Progress.
  const progress = await prisma.progress.findMany({ select: { userId: true, completed: true, lesson: { select: { courseId: true } } } });
  const totals = new Map<string, number>();
  for (const l of await prisma.lesson.groupBy({ by: ['courseId'], _count: true })) totals.set(l.courseId, l._count);
  const byPair = new Map<string, { done: number }>();
  for (const p of progress) { const k = `${p.userId}|${p.lesson.courseId}`; const v = byPair.get(k) ?? { done: 0 }; if (p.completed) v.done++; byPair.set(k, v); }
  let n = 0;
  for (const [k, v] of byPair) {
    const [studentId, courseId] = k.split('|'); const total = totals.get(courseId) ?? 0; const pct = total ? Math.round((v.done / total) * 100) : 0;
    await prisma.courseEnrollment.upsert({ where: { courseId_studentId: { courseId, studentId } }, create: { courseId, studentId, progressPercent: pct, lessonsCompleted: v.done, status: total && v.done >= total ? 'COMPLETED' : 'ACTIVE' }, update: { progressPercent: pct, lessonsCompleted: v.done } });
    n++;
  }
  console.log(`enrollments upserted: ${n}`);

  // 4. Legacy lesson quizzes: mark existing quizzes as LESSON kind (already default). Nothing to do.
}
main().finally(() => prisma.$disconnect());
