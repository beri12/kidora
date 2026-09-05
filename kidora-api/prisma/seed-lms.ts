/**
 * DEMO DATA ONLY — never run against production.
 *
 * Creates:
 * - One school
 * - School settings
 * - Grade 5
 * - Mathematics subject
 * - Teacher
 * - Class 5A
 * - Course
 * - Sections
 * - Lessons
 * - Lesson content
 * - Quizzes
 * - Students
 * - Parent
 * - Class enrollments
 * - Course enrollments
 * - Parent/student relationships
 * - Assignment
 * - Final exam
 * - Missions
 * - Achievements
 *
 * Run:
 *
 * SEED_DEMO=1 npx ts-node prisma/seed-lms-demo.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

if (process.env.SEED_DEMO !== '1') {
  console.error(
    'Refusing to seed demo data. Set SEED_DEMO=1 before running this script.',
  );
  process.exit(1);
}

async function main() {
  console.log('🌱 Starting Kidora LMS demo seed...');

  /**
   * ============================================================
   * SCHOOL
   * ============================================================
   */

  const school = await prisma.school.upsert({
    where: {
      slug: 'demo-academy',
    },
    create: {
      name: 'Demo Academy',
      slug: 'demo-academy',
      studentLimit: 500,
    },
    update: {},
  });

  console.log(`✅ School: ${school.name}`);

  /**
   * ============================================================
   * SCHOOL SETTINGS
   * ============================================================
   *
   * Prisma Client uses:
   *
   * prisma.schoolSettings
   *
   * NOT:
   *
   * prisma.SchoolSettings
   */

  await prisma.schoolSettings.upsert({
    where: {
      schoolId: school.id,
    },
    create: {
      schoolId: school.id,
    },
    update: {},
  });

  console.log('✅ School settings created');

  /**
   * ============================================================
   * GRADE
   * ============================================================
   */

  const g5 = await prisma.grade.upsert({
    where: {
      schoolId_level: {
        schoolId: school.id,
        level: 5,
      },
    },
    create: {
      schoolId: school.id,
      level: 5,
      name: 'Grade 5',
    },
    update: {
      name: 'Grade 5',
    },
  });

  console.log(`✅ Grade: ${g5.name}`);

  /**
   * ============================================================
   * SUBJECT
   * ============================================================
   */

  const math = await prisma.subject.upsert({
    where: {
      slug: 'mathematics',
    },
    create: {
      slug: 'mathematics',
      name: 'Mathematics',
      accent: '#22C55E',
    },
    update: {
      name: 'Mathematics',
      accent: '#22C55E',
    },
  });

  console.log(`✅ Subject: ${math.name}`);

  /**
   * ============================================================
   * TEACHER
   * ============================================================
   */

  const teacher = await prisma.user.upsert({
    where: {
      email: 'teacher.demo@justkidora.com',
    },
    create: {
      email: 'teacher.demo@justkidora.com',
      name: 'Teacher Hana',
      role: 'TEACHER',
      schoolId: school.id,
      emailVerified: true,
    },
    update: {
      name: 'Teacher Hana',
      role: 'TEACHER',
      schoolId: school.id,
      emailVerified: true,
    },
  });

  console.log(`✅ Teacher: ${teacher.name}`);

  /**
   * ============================================================
   * CLASS
   * ============================================================
   */

  const cls = await prisma.schoolClass.upsert({
    where: {
      schoolId_gradeId_name_academicYear: {
        schoolId: school.id,
        gradeId: g5.id,
        name: '5A',
        academicYear: '2026',
      },
    },
    create: {
      schoolId: school.id,
      gradeId: g5.id,
      name: '5A',
      academicYear: '2026',

      teachers: {
        create: {
          teacherId: teacher.id,
          subjectId: math.id,
          isPrimary: true,
        },
      },
    },
    update: {},
  });

  /**
   * Ensure teacher assignment exists even when class already existed.
   */

  await prisma.classTeacher.upsert({
    where: {
      classId_teacherId_subjectId: {
        classId: cls.id,
        teacherId: teacher.id,
        subjectId: math.id,
      },
    },
    create: {
      classId: cls.id,
      teacherId: teacher.id,
      subjectId: math.id,
      isPrimary: true,
    },
    update: {
      isPrimary: true,
    },
  });

  console.log(`✅ Class: ${cls.name}`);

  /**
   * ============================================================
   * COURSE
   * ============================================================
   */

  let course = await prisma.course.findUnique({
    where: {
      slug: 'demo-fractions',
    },
    include: {
      sections: {
        orderBy: {
          order: 'asc',
        },
      },
    },
  });

  if (!course) {
    course = await prisma.course.create({
      data: {
        slug: 'demo-fractions',
        title: 'Fractions and Decimals',
        schoolId: school.id,
        gradeId: g5.id,
        subjectId: math.id,
        teacherId: teacher.id,
        status: 'PUBLISHED',
        published: true,
        world: 'MATH_ISLAND',

        sections: {
          create: [
            {
              title: 'Fractions',
              order: 1,
            },
            {
              title: 'Decimals',
              order: 2,
            },
          ],
        },
      },
      include: {
        sections: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });
  }

  console.log(`✅ Course: ${course.title}`);

  /**
   * ============================================================
   * CLASS COURSE
   * ============================================================
   */

  await prisma.classCourse.upsert({
    where: {
      classId_courseId: {
        classId: cls.id,
        courseId: course.id,
      },
    },
    create: {
      classId: cls.id,
      courseId: course.id,
    },
    update: {},
  });

  /**
   * ============================================================
   * LESSONS + CONTENT + QUIZZES
   * ============================================================
   */

  for (const [sectionIndex, section] of course.sections.entries()) {
    for (let lessonNumber = 1; lessonNumber <= 3; lessonNumber++) {
      const title = `${section.title} lesson ${lessonNumber}`;

      let lesson = await prisma.lesson.findFirst({
        where: {
          courseId: course.id,
          sectionId: section.id,
          title,
        },
      });

      if (!lesson) {
        lesson = await prisma.lesson.create({
          data: {
            courseId: course.id,
            sectionId: section.id,
            title,
            order: sectionIndex * 3 + lessonNumber,
            type: 'MIXED',

            contents: {
              create: [
                {
                  type: 'TEXT',
                  order: 1,
                  title: 'Read',
                  body: `Content for ${title}.`,
                },
              ],
            },
          },
        });
      }

      /**
       * Create quiz if it doesn't exist.
       */

      const existingQuiz = await prisma.quiz.findUnique({
        where: {
          lessonId: lesson.id,
        },
      });

      if (!existingQuiz) {
        await prisma.quiz.create({
          data: {
            title: `${title} quiz`,
            lessonId: lesson.id,
            courseId: course.id,

            questions: {
              create: [
                {
                  prompt: 'What is 1/2 + 1/4?',
                  options: ['1/6', '3/4', '2/6', '1/8'],
                  correct: 1,
                  order: 0,
                  points: 1,
                  explanation: 'Use a common denominator of 4.',
                },
                {
                  prompt: '0.5 equals 1/2',
                  type: 'TRUE_FALSE',
                  options: ['True', 'False'],
                  correct: 0,
                  order: 1,
                  points: 1,
                },
              ],
            },
          },
        });
      }

      console.log(`  ✅ Lesson: ${title}`);
    }
  }

  /**
   * ============================================================
   * PARENT
   * ============================================================
   */

  const parent = await prisma.user.upsert({
    where: {
      email: 'parent.demo@justkidora.com',
    },
    create: {
      email: 'parent.demo@justkidora.com',
      name: 'Mulugeta Desta',
      role: 'PARENT',
      emailVerified: true,
    },
    update: {
      name: 'Mulugeta Desta',
      role: 'PARENT',
      emailVerified: true,
    },
  });

  console.log(`✅ Parent: ${parent.name}`);

  /**
   * ============================================================
   * STUDENTS
   * ============================================================
   */

  const students = [
    'Selam Desta',
    'Samuel Desta',
    'Liya Mekonen',
  ];

  for (const name of students) {
    const email = `${name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '.')}@demo.justkidora.com`;

    const firstName = name.split(' ')[0];

    const student = await prisma.user.upsert({
      where: {
        email,
      },
      create: {
        email,
        name,
        displayName: firstName,
        role: 'CHILD',
        schoolId: school.id,
        gradeId: g5.id,
        emailVerified: true,

        wallet: {
          create: {},
        },
      },
      update: {
        name,
        displayName: firstName,
        role: 'CHILD',
        schoolId: school.id,
        gradeId: g5.id,
        emailVerified: true,
      },
    });

    /**
     * ========================================================
     * REWARD WALLET
     * ========================================================
     */

    await prisma.rewardWallet.upsert({
      where: {
        userId: student.id,
      },
      create: {
        userId: student.id,
        coins: 100,
        gems: 5,
        xp: 0,
        level: 1,
      },
      update: {},
    });

    /**
     * ========================================================
     * CLASS ENROLLMENT
     * ========================================================
     */

    await prisma.classEnrollment.upsert({
      where: {
        classId_studentId: {
          classId: cls.id,
          studentId: student.id,
        },
      },
      create: {
        classId: cls.id,
        studentId: student.id,
      },
      update: {},
    });

    /**
     * ========================================================
     * COURSE ENROLLMENT
     * ========================================================
     */

    await prisma.courseEnrollment.upsert({
      where: {
        courseId_studentId: {
          courseId: course.id,
          studentId: student.id,
        },
      },
      create: {
        courseId: course.id,
        studentId: student.id,
      },
      update: {},
    });

    /**
     * ========================================================
     * PARENT / STUDENT RELATIONSHIP
     * ========================================================
     */

    if (name.endsWith('Desta')) {
      await prisma.parentStudent.upsert({
        where: {
          parentId_studentId: {
            parentId: parent.id,
            studentId: student.id,
          },
        },
        create: {
          parentId: parent.id,
          studentId: student.id,
        },
        update: {},
      });
    }

    console.log(`  ✅ Student: ${student.name}`);
  }

  /**
   * ============================================================
   * ASSIGNMENT
   * ============================================================
   */

  const existingAssignment = await prisma.assignment.findFirst({
    where: {
      title: 'Math Worksheet: Fractions',
      courseId: course.id,
      classId: cls.id,
    },
  });

  if (!existingAssignment) {
    await prisma.assignment.create({
      data: {
        title: 'Math Worksheet: Fractions',
        schoolId: school.id,
        courseId: course.id,
        classId: cls.id,
        teacherId: teacher.id,
        status: 'PUBLISHED',
        dueAt: new Date(Date.now() + 2 * 86400000),
      },
    });
  }

  console.log('✅ Assignment created');

  /**
   * ============================================================
   * FINAL EXAM QUIZ
   * ============================================================
   */

  let examQuiz = await prisma.quiz.findFirst({
    where: {
      title: 'Final: Fractions and Decimals',
      courseId: course.id,
    },
  });

  if (!examQuiz) {
    examQuiz = await prisma.quiz.create({
      data: {
        title: 'Final: Fractions and Decimals',
        kind: 'FINAL_EXAM',
        courseId: course.id,
        maxAttempts: 1,

        questions: {
          create: [
            {
              prompt: 'Convert 3/4 to a decimal',
              options: ['0.25', '0.5', '0.75', '1.25'],
              correct: 2,
              order: 0,
              points: 1,
            },
          ],
        },
      },
    });
  }

  console.log('✅ Final exam quiz created');

  /**
   * ============================================================
   * EXAM
   * ============================================================
   */

  const existingExam = await prisma.exam.findUnique({
    where: {
      quizId: examQuiz.id,
    },
  });

  if (!existingExam) {
    await prisma.exam.create({
      data: {
        title: 'Fractions Final Exam',
        schoolId: school.id,
        courseId: course.id,
        classId: cls.id,
        quizId: examQuiz.id,
        teacherId: teacher.id,
        status: 'SCHEDULED',
        scheduledAt: new Date(Date.now() + 7 * 86400000),
        durationMin: 30,
      },
    });
  }

  console.log('✅ Final exam created');

  /**
   * ============================================================
   * MISSIONS
   * ============================================================
   *
   * Mission.periodKey is stored on StudentMission.
   *
   * DAILY:
   *   2026-09-03
   *
   * WEEKLY:
   *   2026-W36
   *
   * ONE-OFF:
   *   ""
   */

  const quests = [
    {
      title: 'Complete 3 lessons',
      kind: 'DAILY',
      metric: 'LESSONS_COMPLETED',
      target: 3,
      rewardCoins: 50,
      rewardXP: 30,
    },
    {
      title: 'Complete a quiz',
      kind: 'DAILY',
      metric: 'QUIZZES_COMPLETED',
      target: 1,
      rewardCoins: 20,
      rewardXP: 20,
    },
    {
      title: 'Score above 80% five times',
      kind: 'WEEKLY',
      metric: 'QUIZ_SCORE_ABOVE',
      target: 5,
      rewardCoins: 100,
      rewardXP: 100,
    },
    {
      title: 'Study for 20 minutes',
      kind: 'DAILY',
      metric: 'MINUTES_STUDIED',
      target: 20,
      rewardCoins: 25,
      rewardXP: 25,
    },
    {
      title: '7-day streak',
      kind: 'STREAK',
      metric: 'STREAK_DAYS',
      target: 7,
      rewardCoins: 200,
      rewardXP: 200,
    },
  ] as const;

  for (const quest of quests) {
    const existingMission = await prisma.mission.findFirst({
      where: {
        title: quest.title,
      },
    });

    if (!existingMission) {
      await prisma.mission.create({
        data: {
          title: quest.title,
          kind: quest.kind,
          metric: quest.metric,
          target: quest.target,
          rewardCoins: quest.rewardCoins,
          rewardXP: quest.rewardXP,
          description: quest.title,
        },
      });
    }
  }

  console.log(`✅ ${quests.length} missions ready`);

  /**
   * ============================================================
   * ACHIEVEMENTS
   * ============================================================
   */

  const achievements = [
    {
      title: 'Lesson Explorer',
      description: 'Complete 10 lessons',
      metric: 'LESSONS_COMPLETED',
      requirement: 10,
      xpReward: 150,
    },
    {
      title: 'Quiz Master',
      description: 'Score 90%+ in 5 quizzes',
      metric: 'QUIZ_SCORE_ABOVE',
      requirement: 5,
      xpReward: 100,
    },
    {
      title: 'Streak Hero',
      description: 'Maintain a 7 day streak',
      metric: 'STREAK_DAYS',
      requirement: 7,
      xpReward: 200,
    },
  ] as const;

  for (const achievement of achievements) {
    const existingAchievement = await prisma.achievement.findFirst({
      where: {
        title: achievement.title,
      },
    });

    if (!existingAchievement) {
      await prisma.achievement.create({
        data: {
          title: achievement.title,
          description: achievement.description,
          metric: achievement.metric,
          requirement: achievement.requirement,
          xpReward: achievement.xpReward,
        },
      });
    }
  }

  console.log(`✅ ${achievements.length} achievements ready`);

  /**
   * ============================================================
   * SUMMARY
   * ============================================================
   */

  console.log('');
  console.log('==============================================');
  console.log('🎉 KIDORA DEMO DATA READY');
  console.log('==============================================');
  console.log(`🏫 School:     ${school.name}`);
  console.log(`📚 Grade:      ${g5.name}`);
  console.log(`📐 Subject:    ${math.name}`);
  console.log(`👩‍🏫 Teacher:    ${teacher.email}`);
  console.log(`👨‍👩‍👧 Parent:     ${parent.email}`);
  console.log(`👧 Students:   ${students.length}`);
  console.log(`📖 Course:     ${course.title}`);
  console.log(`🏫 Class:      ${cls.name}`);
  console.log('📝 Assignment: Math Worksheet: Fractions');
  console.log('🧪 Exam:       Fractions Final Exam');
  console.log(`🎯 Missions:   ${quests.length}`);
  console.log(`🏆 Achievements: ${achievements.length}`);
  console.log('==============================================');
  console.log('');
  console.log(
    '⚠️ Logins are created without passwords. Use your existing invite/reset flow.',
  );
}

main()
  .catch((error) => {
    console.error('❌ Demo seed failed:');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });