import { PrismaClient, Role, LessonType, PlanKey, Rarity, World } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding...');
  const subjects = [
    { slug: 'math', name: 'Mathematics', accent: '#7C3AED' },
    { slug: 'english', name: 'Reading & English', accent: '#16A34A' },
    { slug: 'science', name: 'Science', accent: '#0284C7' },
    { slug: 'coding', name: 'Programming', accent: '#E11D48' },
  ];
  const subjectMap: Record<string, string> = {};
  for (const s of subjects) {
    const row = await prisma.subject.upsert({ where: { slug: s.slug }, update: {}, create: s });
    subjectMap[s.slug] = row.id;
  }

  const password = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.upsert({ where: { email: 'admin@kidora.com' }, update: {}, create: { email: 'admin@kidora.com', name: 'Admin', role: Role.ADMIN, passwordHash: password, emailVerified: true } });
  const teacher = await prisma.user.upsert({ where: { email: 'teacher@kidora.com' }, update: {}, create: { email: 'teacher@kidora.com', name: 'Ms. Okafor', role: Role.TEACHER, passwordHash: password, emailVerified: true } });
  const parent = await prisma.user.upsert({ where: { email: 'parent@kidora.com' }, update: {}, create: { email: 'parent@kidora.com', name: 'Priya Sharma', role: Role.PARENT, passwordHash: password, points: 1240, streak: 5, emailVerified: true } });
  await prisma.subscription.upsert({ where: { userId: parent.id }, update: {}, create: { userId: parent.id, plan: PlanKey.family, status: 'active' } });

  const course = await prisma.course.upsert({
    where: { slug: 'addition-adventures' }, update: {},
    create: {
      slug: 'addition-adventures', title: 'Addition Adventures', ageBand: '6-8',
      description: 'Learn addition through animation, games and a boss quiz.',
      subjectId: subjectMap['math'], teacherId: teacher.id, isPremium: false,
      lessons: { create: [
        { title: 'What is Addition?', duration: '4 min', type: LessonType.VIDEO, order: 1 },
        { title: 'Number Line Jumps', duration: '6 min', type: LessonType.INTERACTIVE, order: 2 },
        { title: 'Sums to 10', duration: 'Quiz', type: LessonType.QUIZ, order: 3 },
      ] },
    },
    include: { lessons: true },
  });
  const quizLesson = course.lessons.find((l) => l.type === LessonType.QUIZ);
  if (quizLesson) {
    await prisma.quiz.upsert({ where: { lessonId: quizLesson.id }, update: {}, create: {
      title: 'Sums to 10', lessonId: quizLesson.id,
      questions: { create: [
        { prompt: 'What is 7 + 5?', options: ['10', '12', '13', '11'], correct: 1 },
        { prompt: 'What is 3 + 4?', options: ['6', '7', '8', '9'], correct: 1 },
      ] },
    } });
  }

  for (const b of [
    { slug: 'first-steps', name: 'First Steps', desc: 'Finished your first lesson', glyph: '★', gradient: 'from-grass-400 to-grass-600' },
    { slug: 'quiz-champ', name: 'Quiz Champ', desc: 'Perfect quiz score', glyph: '?', gradient: 'from-teal-400 to-teal-700' },
  ]) await prisma.badge.upsert({ where: { slug: b.slug }, update: {}, create: b });

  // ---- Kidora: child account + avatar + wallet ----
  const child = await prisma.user.upsert({ where: { email: 'child@kidora.com' }, update: {}, create: { email: 'child@kidora.com', name: 'Leo', role: Role.CHILD, passwordHash: password, points: 1250, streak: 7, emailVerified: true } });
  await prisma.avatar.upsert({ where: { userId: child.id }, update: {}, create: { userId: child.id, hair: 'curly', clothes: 'explorer', pet: 'dragon' } });
  await prisma.rewardWallet.upsert({ where: { userId: child.id }, update: {}, create: { userId: child.id, coins: 1250, gems: 12, xp: 3600, level: 8 } });

  // ---- Avatar shop items ----
  const items = [
    { name: 'Wizard Hat', category: 'accessories', rarity: Rarity.rare, price: 300 },
    { name: 'Golden Crown', category: 'accessories', rarity: Rarity.legendary, price: 1000 },
    { name: 'Cool Glasses', category: 'accessories', rarity: Rarity.common, price: 120 },
    { name: 'Space Suit', category: 'clothing', rarity: Rarity.epic, price: 650 },
    { name: 'Magic Costume', category: 'clothing', rarity: Rarity.rare, price: 400 },
    { name: 'Magic Shoes', category: 'shoes', rarity: Rarity.epic, price: 500 },
    { name: 'Baby Dragon', category: 'pet', rarity: Rarity.legendary, price: 1500 },
    { name: 'Unicorn', category: 'pet', rarity: Rarity.legendary, price: 1800 },
    { name: 'Rainbow Trail', category: 'theme', rarity: Rarity.rare, price: 350 },
  ];
  for (const it of items) {
    const existing = await prisma.avatarItem.findFirst({ where: { name: it.name } });
    if (!existing) await prisma.avatarItem.create({ data: it });
  }

  // ---- Achievements ----
  const achievements = [
    { title: 'Reading Hero', description: 'Complete 50 books', category: 'Learning', requirement: 50 },
    { title: 'Math Master', description: 'Solve 500 problems', category: 'Learning', requirement: 500 },
    { title: 'Streak Champion', description: '30 day streak', category: 'Consistency', requirement: 30 },
    { title: 'Game Wizard', description: 'Win 20 games', category: 'Games', requirement: 20 },
    { title: 'Little Artist', description: 'Create 10 artworks', category: 'Creativity', requirement: 10 },
  ];
  for (const a of achievements) {
    const existing = await prisma.achievement.findFirst({ where: { title: a.title } });
    if (!existing) await prisma.achievement.create({ data: a });
  }

  // ---- Daily missions ----
  const missions = [
    { title: 'Read 10 pages', description: 'Read for a few minutes today', rewardXP: 30, rewardCoins: 50 },
    { title: 'Complete Math Quest', description: 'Finish one math lesson', rewardXP: 50, rewardCoins: 80 },
    { title: 'Play a Science Game', description: 'Have fun learning science', rewardXP: 40, rewardCoins: 60 },
    { title: 'Earn 100 XP', description: 'Keep learning to hit 100 XP', rewardXP: 0, rewardCoins: 100 },
  ];
  for (const m of missions) {
    const existing = await prisma.mission.findFirst({ where: { title: m.title } });
    if (!existing) await prisma.mission.create({ data: m });
  }

  // ---- Learning path progress for the child ----
  const worlds: { world: World; progress: number }[] = [
    { world: World.READING_FOREST, progress: 100 },
    { world: World.MATH_ISLAND, progress: 62 },
    { world: World.SCIENCE_PLANET, progress: 20 },
  ];
  for (const w of worlds) {
    await prisma.learningPath.upsert({ where: { studentId_world: { studentId: child.id, world: w.world } }, update: {}, create: { studentId: child.id, ...w } });
  }

  await prisma.notification.create({ data: { userId: parent.id, title: 'Welcome to Kidora! 🎉', body: 'Your account is ready — start learning today.' } }).catch(() => {});

  // ---- Demo chat conversations (parent ↔ teacher DM + classroom group) ----
  const existingDm = await prisma.conversation.findFirst({ where: { type: 'dm', members: { some: { userId: parent.id } }, AND: { members: { some: { userId: teacher.id } } } } });
  if (!existingDm) {
    const dm = await prisma.conversation.create({ data: { type: 'dm', members: { create: [{ userId: parent.id }, { userId: teacher.id }] } } });
    await prisma.message.createMany({ data: [
      { conversationId: dm.id, senderId: teacher.id, body: 'Hi Priya! Leo did wonderfully in today\\', readBy: [teacher.id] },
      { conversationId: dm.id, senderId: parent.id, body: 'That\\', readBy: [parent.id] },

    ] });
  }
  const existingClass = await prisma.conversation.findFirst({ where: { type: 'classroom', title: 'Grade 3 · Sunshine Class' } });
  if (!existingClass) {
    const room = await prisma.conversation.create({ data: { type: 'classroom', title: 'Grade 3 · Sunshine Class', members: { create: [{ userId: teacher.id, role: 'admin' }, { userId: parent.id }] } } });
    await prisma.message.create({ data: { conversationId: room.id, senderId: teacher.id, body: 'Reminder: reading portfolios are due Friday 📚', readBy: [teacher.id] } });
  }

  console.log('Seed done. Logins: admin@ / teacher@ / parent@ / child@kidora.com — password123');
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
