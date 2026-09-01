/**
 * Additive demo seed for the school LMS. Run after `npm run db:seed`.
 *
 *   npm run db:seed:lms
 *
 * Creates TWO schools on purpose, so tenant isolation is demonstrable by
 * logging in as each school's staff and confirming neither can see the other.
 * Everything is upserted, so re-running it is safe.
 */
import {
  ActivityType,
  LessonType,
  PrismaClient,
  QuestionType,
  Role,
  World,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function ensureUser(email: string, name: string, role: Role, schoolId: string, extra: any = {}) {
  const passwordHash = await bcrypt.hash('password123', 10);
  return prisma.user.upsert({
    where: { email },
    update: { schoolId, role, ...extra },
    create: { email, name, role, passwordHash, emailVerified: true, schoolId, ...extra },
  });
}

async function ensureSchool(name: string, slug: string, code: string, city: string) {
  const existing = await prisma.school.findFirst({ where: { slug } });
  if (existing) return prisma.school.update({ where: { id: existing.id }, data: { name, code, city } });
  return prisma.school.create({ data: { name, slug, code, city, country: 'Ethiopia', timezone: 'Africa/Addis_Ababa' } });
}

async function ensureGrade(schoolId: string, name: string, level: number) {
  const existing = await prisma.grade.findFirst({ where: { schoolId, name } });
  if (existing) return existing;
  return prisma.grade.create({ data: { schoolId, name, level } });
}

async function ensureClass(schoolId: string, gradeId: string, name: string, teacherId: string) {
  const existing = await prisma.schoolClass.findFirst({ where: { schoolId, name } });
  if (existing) return existing;
  return prisma.schoolClass.create({
    data: { schoolId, gradeId, name, homeroomTeacherId: teacherId, academicYear: '2026/27' },
  });
}

async function main() {
  console.log('Seeding school LMS demo data…\n');

  const subjects = await prisma.subject.findMany();
  const subjectId = (slug: string) => subjects.find((s) => s.slug === slug)?.id ?? null;

  // ---------------------------------------------------------------- schools
  const sunrise = await ensureSchool('Sunrise Academy', 'sunrise-academy', 'SUNRISE', 'Addis Ababa');
  const lakeside = await ensureSchool('Lakeside School', 'lakeside-school', 'LAKESIDE', 'Bahir Dar');

  // ---------------------------------------------------------------- people
  const sunriseHead = await ensureUser('head@sunrise.kidora.com', 'Selam Bekele', Role.SCHOOL_ADMIN, sunrise.id);
  const sunriseTeacher = await ensureUser('teacher@sunrise.kidora.com', 'Abel Tesfaye', Role.TEACHER, sunrise.id);
  const lakesideHead = await ensureUser('head@lakeside.kidora.com', 'Marta Girma', Role.SCHOOL_ADMIN, lakeside.id);
  const lakesideTeacher = await ensureUser('teacher@lakeside.kidora.com', 'Yonas Haile', Role.TEACHER, lakeside.id);

  const grade4 = await ensureGrade(sunrise.id, 'Grade 4', 4);
  const grade5 = await ensureGrade(sunrise.id, 'Grade 5', 5);
  const lakeGrade5 = await ensureGrade(lakeside.id, 'Grade 5', 5);

  const sunriseStudents: Awaited<ReturnType<typeof ensureUser>>[] = [];
  for (const [i, name] of ['Hanna Alemu', 'Dawit Kebede', 'Sara Mulu', 'Nathan Fikru'].entries()) {
    sunriseStudents.push(
      await ensureUser(
        `student${i + 1}@sunrise.kidora.com`,
        name,
        Role.CHILD,
        sunrise.id,
        { gradeId: grade5.id, points: 200 + i * 150, streak: i + 1 },
      ),
    );
  }
  const lakeStudent = await ensureUser('student1@lakeside.kidora.com', 'Bethel Assefa', Role.CHILD, lakeside.id, {
    gradeId: lakeGrade5.id,
  });

  const sunflower = await ensureClass(sunrise.id, grade5.id, 'Grade 5 — Sunflower', sunriseTeacher.id);
  for (const s of sunriseStudents) {
    await prisma.classEnrollment.upsert({
      where: { classId_studentId: { classId: sunflower.id, studentId: s.id } },
      update: { active: true },
      create: { classId: sunflower.id, studentId: s.id },
    });
  }
  await ensureClass(lakeside.id, lakeGrade5.id, 'Grade 5 — Blue', lakesideTeacher.id);

  // ---------------------------------------------------------------- course
  const slug = 'fractions-quest';
  let course = await prisma.course.findUnique({ where: { slug } });
  if (!course) {
    course = await prisma.course.create({
      data: {
        slug,
        title: 'Fractions Quest',
        description: 'Split, compare and add fractions with Professor Number in the Math Kingdom.',
        objectives: [
          'Recognise a fraction as equal parts of a whole',
          'Compare fractions with the same denominator',
          'Add fractions with the same denominator',
        ],
        learningPoints: ['What a fraction is', 'Comparing fractions', 'Adding fractions'],
        subjectId: subjectId('math'),
        gradeId: grade5.id,
        schoolId: sunrise.id,
        teacherId: sunriseTeacher.id,
        ageBand: '9-12',
        accent: '#0284C7',
        gradient: 'from-sky-400 to-sky-700',
        visibility: 'SCHOOL',
        accessType: 'FREE',
        published: true,
        status: 'PUBLISHED',
      },
    });
  }

  // A second course in the OTHER school, used to prove isolation.
  const lakeSlug = 'lakeside-science-lab';
  let lakeCourse = await prisma.course.findUnique({ where: { slug: lakeSlug } });
  if (!lakeCourse) {
    lakeCourse = await prisma.course.create({
      data: {
        slug: lakeSlug,
        title: 'Lakeside Science Lab',
        description: 'A Lakeside-only course. Sunrise staff must never see this.',
        subjectId: subjectId('science'),
        gradeId: lakeGrade5.id,
        schoolId: lakeside.id,
        teacherId: lakesideTeacher.id,
        visibility: 'SCHOOL',
        published: true,
        status: 'PUBLISHED',
      },
    });
  }

  // ---------------------------------------------------- sections + lessons
  let section1 = await prisma.section.findFirst({ where: { courseId: course.id, order: 0 } });
  if (!section1) {
    section1 = await prisma.section.create({
      data: {
        courseId: course.id,
        title: 'Section 1 — Meet the Fraction',
        description: 'What fractions are and how to read them.',
        objectives: ['Read a fraction', 'Name the numerator and denominator'],
        order: 0,
      },
    });
  }
  let section2 = await prisma.section.findFirst({ where: { courseId: course.id, order: 1 } });
  if (!section2) {
    section2 = await prisma.section.create({
      data: {
        courseId: course.id,
        title: 'Section 2 — Fraction Battles',
        description: 'Comparing and adding fractions.',
        order: 1,
      },
    });
  }

  const lessonSpecs = [
    {
      sectionId: section1.id, order: 0, title: 'What is a fraction?', type: LessonType.ARTICLE,
      content: 'A fraction shows equal parts of one whole. The bottom number says how many equal parts there are. The top number says how many we have.',
      objectives: ['Read a fraction out loud'],
    },
    {
      sectionId: section1.id, order: 1, title: 'Fraction hunt', type: LessonType.INTERACTIVE,
      content: 'Find the matching fraction for each picture.',
      objectives: ['Match a picture to its fraction'],
    },
    {
      sectionId: section2.id, order: 0, title: 'Comparing fractions', type: LessonType.ARTICLE,
      content: 'When the bottom numbers are the same, the fraction with the bigger top number is larger.',
      objectives: ['Compare two fractions with the same denominator'],
    },
  ];

  const lessons: Awaited<ReturnType<typeof prisma.lesson.create>>[] = [];
  for (const spec of lessonSpecs) {
    let lesson = await prisma.lesson.findFirst({ where: { courseId: course.id, title: spec.title } });
    if (!lesson) {
      lesson = await prisma.lesson.create({
        data: {
          courseId: course.id,
          sectionId: spec.sectionId,
          title: spec.title,
          content: spec.content,
          type: spec.type,
          order: spec.order,
          objectives: spec.objectives,
          estimatedMinutes: 6,
          duration: '6 min',
        },
      });
    }
    lessons.push(lesson);
  }

  // ------------------------------------------------------------ activities
  const activitySpecs = [
    {
      lessonId: lessons[1].id, title: 'Pick the right fraction', type: ActivityType.MULTIPLE_CHOICE,
      instructions: 'Three of the four pizzas are eaten. Which fraction shows that?',
      config: { choices: ['1/4', '3/4', '4/3', '2/4'] },
      solution: { correct: 1 },
    },
    {
      lessonId: lessons[1].id, title: 'Match the pictures', type: ActivityType.MATCHING,
      instructions: 'Drag each picture to its fraction.',
      config: { left: ['🍕 half eaten', '🍫 quarter left', '🥧 whole'], right: ['1/2', '1/4', '1/1'] },
      solution: { pairs: { '🍕 half eaten': '1/2', '🍫 quarter left': '1/4', '🥧 whole': '1/1' } },
    },
    {
      lessonId: lessons[2].id, title: 'Order them smallest first', type: ActivityType.ORDERING,
      instructions: 'Put the fractions in order, smallest first.',
      config: { items: ['3/8', '1/8', '5/8', '7/8'] },
      solution: { sequence: ['1/8', '3/8', '5/8', '7/8'] },
    },
    {
      lessonId: lessons[2].id, title: 'Professor Number’s challenge', type: ActivityType.BOSS_CHALLENGE,
      instructions: 'Three questions. Get them all to win the badge.',
      config: {
        steps: [
          { prompt: 'Which is bigger: 2/5 or 3/5?', choices: ['2/5', '3/5'] },
          { prompt: 'What is 1/4 + 2/4?', choices: ['3/4', '3/8', '2/8'] },
          { prompt: 'Is 4/4 a whole?', choices: ['Yes', 'No'] },
        ],
      },
      solution: { steps: [1, 0, 0] },
    },
  ];

  for (const [i, spec] of activitySpecs.entries()) {
    const existing = await prisma.activity.findFirst({ where: { lessonId: spec.lessonId, title: spec.title } });
    if (existing) continue;
    await prisma.activity.create({
      data: {
        lessonId: spec.lessonId,
        title: spec.title,
        instructions: spec.instructions,
        type: spec.type,
        order: i,
        config: spec.config as any,
        solution: spec.solution as any,
        points: spec.type === ActivityType.BOSS_CHALLENGE ? 30 : 10,
      },
    });
  }

  // ----------------------------------------------------------------- quiz
  let quiz = await prisma.quiz.findFirst({ where: { courseId: course.id, title: 'Fractions check-in' } });
  if (!quiz) {
    quiz = await prisma.quiz.create({
      data: {
        title: 'Fractions check-in',
        description: 'A short check after Section 1.',
        courseId: course.id,
        sectionId: section1.id,
        passingScore: 60,
        maxAttempts: 3,
        questions: {
          create: [
            { prompt: 'Which fraction is one half?', options: ['1/2', '1/3', '2/3', '1/4'], correct: 0, order: 0, points: 1 },
            { prompt: '3/4 is larger than 1/4.', type: QuestionType.TRUE_FALSE, options: ['True', 'False'], correct: 0, order: 1, points: 1 },
            {
              prompt: 'Put these in order, smallest first.',
              type: QuestionType.ORDERING, options: [], correct: 0, order: 2, points: 2,
              data: { items: ['2/6', '1/6', '5/6'], sequence: ['1/6', '2/6', '5/6'] },
            },
          ],
        },
      },
    });
  }

  // ----------------------------------------------------------- assignment
  const assignmentTitle = 'Draw your own fraction';
  let assignment = await prisma.assignment.findFirst({ where: { courseId: course.id, title: assignmentTitle } });
  if (!assignment) {
    assignment = await prisma.assignment.create({
      data: {
        courseId: course.id,
        sectionId: section2.id,
        teacherId: sunriseTeacher.id,
        title: assignmentTitle,
        instructions: 'Draw a picture that shows 3/5 and write one sentence explaining it.',
        points: 20,
        submissionTypes: ['TEXT', 'IMAGE'],
        published: true,
        dueAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    });
  }

  // ----------------------------------------------------------------- exam
  let exam = await prisma.exam.findFirst({ where: { courseId: course.id, title: 'Fractions final exam' } });
  if (!exam) {
    exam = await prisma.exam.create({
      data: {
        courseId: course.id,
        teacherId: sunriseTeacher.id,
        title: 'Fractions final exam',
        description: 'Everything from both sections.',
        timeLimitMin: 30,
        passingScore: 70,
        maxAttempts: 2,
        isFinal: true,
        published: true,
        questions: {
          create: [
            { prompt: 'What is 1/4 + 1/4?', options: ['1/8', '2/4', '2/8', '1/2'], correct: 1, order: 0, points: 2 },
            { prompt: 'Which is smallest?', options: ['7/8', '1/8', '3/8', '5/8'], correct: 1, order: 1, points: 2 },
            { prompt: '5/5 is one whole.', type: QuestionType.TRUE_FALSE, options: ['True', 'False'], correct: 0, order: 2, points: 1 },
            {
              prompt: 'Type the fraction for three out of four.',
              type: QuestionType.SHORT_ANSWER, options: [], correct: 0, order: 3, points: 2,
              data: { accepted: ['3/4', 'three quarters'] },
            },
          ],
        },
      },
    });
  }

  // ---------------------------------------------------------------- quests
  const questSpecs = [
    {
      slug: 'fraction-village', title: 'The Fraction Village',
      story: 'Professor Number’s village cut its bread into equal pieces, but nobody can agree on who gets what. Learn how fractions work and settle the argument!',
      npcName: 'Professor Number', npcEmoji: '🧙', world: World.MATH_ISLAND,
      zone: 'fraction-forest', order: 0, courseId: course.id, xpReward: 120, coinReward: 40, isBoss: false,
    },
    {
      slug: 'fraction-boss', title: 'Boss: The Numerator Knight',
      story: 'The Numerator Knight guards the bridge. Answer all three riddles to pass!',
      npcName: 'Numerator Knight', npcEmoji: '🛡️', world: World.MATH_ISLAND,
      zone: 'fraction-forest', order: 1, courseId: course.id, xpReward: 250, coinReward: 90, isBoss: true,
      badgeSlug: 'quiz-champ',
    },
  ];
  for (const q of questSpecs) {
    await prisma.quest.upsert({ where: { slug: q.slug }, update: {}, create: q as any });
  }

  // ---------------------------------------------- enrolments + progress
  for (const s of sunriseStudents) {
    await prisma.enrollment.upsert({
      where: { courseId_studentId: { courseId: course.id, studentId: s.id } },
      update: {},
      create: { courseId: course.id, studentId: s.id },
    });
  }
  await prisma.enrollment.upsert({
    where: { courseId_studentId: { courseId: lakeCourse.id, studentId: lakeStudent.id } },
    update: {},
    create: { courseId: lakeCourse.id, studentId: lakeStudent.id },
  });

  // Give the first student some real progress so the dashboards have data.
  await prisma.progress.upsert({
    where: { userId_lessonId: { userId: sunriseStudents[0].id, lessonId: lessons[0].id } },
    update: { completed: true, percent: 100 },
    create: { userId: sunriseStudents[0].id, lessonId: lessons[0].id, completed: true, percent: 100 },
  });
  await prisma.courseProgress.upsert({
    where: { courseId_studentId: { courseId: course.id, studentId: sunriseStudents[0].id } },
    update: { percent: 33, lessonsCompleted: 1, lessonsTotal: lessons.length },
    create: {
      courseId: course.id, studentId: sunriseStudents[0].id,
      percent: 33, lessonsCompleted: 1, lessonsTotal: lessons.length,
    },
  });

  console.log(`
Done.

  Sunrise Academy  (${sunrise.code})
    head@sunrise.kidora.com      SCHOOL_ADMIN
    teacher@sunrise.kidora.com   TEACHER
    student1..4@sunrise.kidora.com  CHILD

  Lakeside School  (${lakeside.code})
    head@lakeside.kidora.com     SCHOOL_ADMIN
    teacher@lakeside.kidora.com  TEACHER
    student1@lakeside.kidora.com CHILD

  Password for all: password123
  Neither school can see the other's students, classes or courses.
`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
