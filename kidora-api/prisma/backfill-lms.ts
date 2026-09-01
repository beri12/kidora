/**
 * Idempotent backfill for the school LMS migration.
 *
 * Run once after `prisma migrate deploy`. It only ever *adds* rows or fills
 * NULL columns — it never deletes, and re-running it is a no-op.
 *
 *   npx ts-node prisma/backfill-lms.ts
 *
 * What it does:
 *  1. Gives every School a slug and a join code.
 *  2. Copies each Section's Lectures into Lessons (Course -> Section -> Lesson),
 *     so curriculum authored in the old 3-step wizard becomes visible to the
 *     student/progress/certificate side, which only ever read Lessons.
 *     Lectures are left in place.
 *  3. Attaches orphan lessons (sectionId NULL) to the course's first section.
 *  4. Backfills Course.schoolId from the owning teacher.
 *  5. Builds CourseProgress rows from the existing Progress rows.
 *  6. Gives every existing Certificate a serial.
 */
import { PrismaClient, LessonType } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || 'school';

const lessonTypeForLecture = (l: { videoUrl: string | null; quiz: unknown }) =>
  l.videoUrl ? LessonType.VIDEO : l.quiz ? LessonType.QUIZ : LessonType.ARTICLE;

async function backfillSchools() {
  const schools = await prisma.school.findMany({ where: { OR: [{ slug: null }, { code: null }] } });
  for (const s of schools) {
    let slug = s.slug ?? slugify(s.name);
    // slug is unique; disambiguate on collision.
    while (await prisma.school.findFirst({ where: { slug, id: { not: s.id } } })) {
      slug = `${slugify(s.name)}-${randomBytes(2).toString('hex')}`;
    }
    let code = s.code ?? randomBytes(3).toString('hex').toUpperCase();
    while (await prisma.school.findFirst({ where: { code, id: { not: s.id } } })) {
      code = randomBytes(3).toString('hex').toUpperCase();
    }
    await prisma.school.update({ where: { id: s.id }, data: { slug, code } });
  }
  console.log(`schools: ${schools.length} slug/code filled`);
}

async function backfillLecturesToLessons() {
  const sections = await prisma.section.findMany({
    include: { lectures: { orderBy: { order: 'asc' } }, lessons: { select: { title: true } } },
  });

  let created = 0;
  for (const section of sections) {
    const existing = new Set(section.lessons.map((l) => l.title));
    for (const lecture of section.lectures) {
      // Title match keeps the copy idempotent without adding a legacy id column.
      if (existing.has(lecture.title)) continue;
      await prisma.lesson.create({
        data: {
          courseId: section.courseId,
          sectionId: section.id,
          title: lecture.title,
          content: lecture.content ?? null,
          videoUrl: lecture.videoUrl ?? null,
          order: lecture.order,
          type: lessonTypeForLecture(lecture),
        },
      });
      created++;
    }
  }
  console.log(`lessons: ${created} created from lectures`);
}

async function attachOrphanLessons() {
  const orphans = await prisma.lesson.findMany({
    where: { sectionId: null },
    select: { id: true, courseId: true },
  });
  let attached = 0;
  const firstSection = new Map<string, string | null>();

  for (const lesson of orphans) {
    if (!firstSection.has(lesson.courseId)) {
      const s = await prisma.section.findFirst({
        where: { courseId: lesson.courseId },
        orderBy: { order: 'asc' },
        select: { id: true },
      });
      firstSection.set(lesson.courseId, s?.id ?? null);
    }
    const sectionId = firstSection.get(lesson.courseId);
    if (!sectionId) continue; // course has no sections; the lesson stays top-level
    await prisma.lesson.update({ where: { id: lesson.id }, data: { sectionId } });
    attached++;
  }
  console.log(`lessons: ${attached} attached to a section`);
}

async function backfillCourseSchools() {
  const courses = await prisma.course.findMany({
    where: { schoolId: null, teacherId: { not: null } },
    select: { id: true, teacherId: true },
  });
  let filled = 0;
  for (const c of courses) {
    const teacher = await prisma.user.findUnique({
      where: { id: c.teacherId! },
      select: { schoolId: true },
    });
    if (!teacher?.schoolId) continue;
    await prisma.course.update({ where: { id: c.id }, data: { schoolId: teacher.schoolId } });
    filled++;
  }
  console.log(`courses: ${filled} attributed to their teacher's school`);
}

async function backfillCourseProgress() {
  const rows = await prisma.progress.findMany({
    select: { userId: true, completed: true, lesson: { select: { courseId: true } } },
  });

  const pairs = new Map<string, { studentId: string; courseId: string }>();
  for (const r of rows) {
    const key = `${r.userId}:${r.lesson.courseId}`;
    pairs.set(key, { studentId: r.userId, courseId: r.lesson.courseId });
  }

  let written = 0;
  for (const { studentId, courseId } of pairs.values()) {
    const lessons = await prisma.lesson.findMany({ where: { courseId }, select: { id: true } });
    const ids = lessons.map((l) => l.id);
    const done = ids.length
      ? await prisma.progress.count({
          where: { userId: studentId, completed: true, lessonId: { in: ids } },
        })
      : 0;
    const percent = ids.length ? Math.round((done / ids.length) * 100) : 0;
    const completed = ids.length > 0 && done >= ids.length;

    await prisma.courseProgress.upsert({
      where: { courseId_studentId: { courseId, studentId } },
      update: { percent, lessonsCompleted: done, lessonsTotal: ids.length, completed },
      create: {
        courseId, studentId, percent,
        lessonsCompleted: done, lessonsTotal: ids.length, completed,
        completedAt: completed ? new Date() : null,
      },
    });
    written++;
  }
  console.log(`courseProgress: ${written} rows built from existing progress`);
}

async function backfillCertificateSerials() {
  const certs = await prisma.certificate.findMany({ where: { serial: null }, select: { id: true } });
  for (const c of certs) {
    let serial = 'KID-' + randomBytes(5).toString('hex').toUpperCase();
    while (await prisma.certificate.findUnique({ where: { serial } })) {
      serial = 'KID-' + randomBytes(5).toString('hex').toUpperCase();
    }
    await prisma.certificate.update({ where: { id: c.id }, data: { serial } });
  }
  console.log(`certificates: ${certs.length} serials issued`);
}

async function main() {
  console.log('Kidora LMS backfill — additive and re-runnable.\n');
  await backfillSchools();
  await backfillLecturesToLessons();
  await attachOrphanLessons();
  await backfillCourseSchools();
  await backfillCourseProgress();
  await backfillCertificateSerials();
  console.log('\nDone. No rows were deleted.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
