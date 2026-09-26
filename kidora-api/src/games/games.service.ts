import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../infrastructure/cache/cache.service';
import { RewardsService as LmsRewards } from '../lms/gamification/rewards.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { GridSetup, LaunchSetup, runChoice, runGrid, runLaunch } from './engine/checkers';
import { nextMastery, starsFor } from './engine/mastery';

/** Wrong tries on one challenge before Kai shows the worked example. */
const REVEAL_AFTER = 3;
/** Hard cap on tries per challenge per session (stops brute-forcing options). */
const MAX_TRIES = 8;
/** Answers faster than this are recorded but earn nothing — no human reads that fast. */
const MIN_HUMAN_MS = 350;
/** A level finished faster than this per challenge earns no XP. */
const MIN_MS_PER_CHALLENGE = 1500;

/**
 * The bonus challenge wheel. It is a free reward that has to be earned by
 * learning (a 5-answer streak or 80 % first-try accuracy). It can never be
 * bought, has no cost, and only pays out small amounts of XP or coins.
 */
export const BONUS_WHEEL = [
  { label: '+10 XP', xp: 10, coins: 0 },
  { label: '+20 XP', xp: 20, coins: 0 },
  { label: 'Treasure: +10 coins', xp: 0, coins: 10 },
  { label: '+30 XP', xp: 30, coins: 0 },
  { label: '+15 XP', xp: 15, coins: 0 },
  { label: 'Treasure: +25 coins', xp: 0, coins: 25 },
] as const;

type Challenge = Prisma.GameChallengeGetPayload<object>;

/** What the client may see of a challenge: never the solution or explanation. */
function publicChallenge(c: Challenge) {
  return {
    id: c.id,
    order: c.order,
    kind: c.kind,
    skill: c.skill,
    prompt: c.prompt,
    speaker: c.speaker,
    setup: c.setup,
    hintCount: c.hints.length,
  };
}

interface ChallengeState { tries: number; solved: boolean; firstTry: boolean; revealed: boolean }

@Injectable()
export class GamesService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private rewards: LmsRewards,
  ) {}

  // --- catalogue ------------------------------------------------------------

  async list(userId?: string) {
    const games = await this.prisma.game.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
      include: { levels: { orderBy: { order: 'asc' }, select: { id: true, order: true, xpReward: true, xpPerCorrect: true, _count: { select: { challenges: true } } } } },
    });
    const done = userId ? await this.completedLevels(userId) : new Map<string, number>();
    return games.map((g) => {
      const completed = g.levels.filter((l) => done.has(l.id)).length;
      return {
        slug: g.slug, name: g.name, tagline: g.tagline, world: g.world, subject: g.subject,
        minGrade: g.minGrade, maxGrade: g.maxGrade,
        levels: g.levels.length,
        completedLevels: completed,
        progress: g.levels.length ? Math.round((completed / g.levels.length) * 100) : 0,
        xpAvailable: g.levels.reduce((sum, l) => sum + l.xpReward + l.xpPerCorrect * l._count.challenges, 0),
      };
    });
  }

  async detail(slug: string, userId?: string) {
    const g = await this.prisma.game.findFirst({
      where: { slug, active: true },
      include: { levels: { orderBy: { order: 'asc' }, include: { _count: { select: { challenges: true } } } } },
    });
    if (!g) throw new NotFoundException('Game not found');
    const done = userId ? await this.completedLevels(userId) : new Map<string, number>();
    return {
      slug: g.slug, name: g.name, tagline: g.tagline, description: g.description, world: g.world, subject: g.subject,
      minGrade: g.minGrade, maxGrade: g.maxGrade,
      levels: g.levels.map((l, i) => ({
        order: l.order, name: l.name, intro: l.intro, learningObjective: l.learningObjective,
        difficulty: l.difficulty, challenges: l._count.challenges,
        xp: l.xpReward + l.xpPerCorrect * l._count.challenges,
        completed: done.has(l.id),
        stars: done.has(l.id) ? starsFor(done.get(l.id)!) : 0,
        // Level 1 is always open; each later level opens when the one before is done.
        unlocked: i === 0 || done.has(g.levels[i - 1].id),
      })),
    };
  }

  /** levelId → best accuracy, for levels this user has finished. */
  private async completedLevels(userId: string) {
    const rows = await this.prisma.gameSession.groupBy({
      by: ['levelId'], where: { userId, completed: true }, _max: { accuracy: true },
    });
    return new Map(rows.map((r) => [r.levelId, r._max.accuracy ?? 0]));
  }

  // --- play -----------------------------------------------------------------

  async start(user: AuthUser, slug: string, levelOrder: number) {
    const game = await this.prisma.game.findFirst({
      where: { slug, active: true },
      include: { levels: { orderBy: { order: 'asc' }, include: { challenges: { orderBy: { order: 'asc' } } } } },
    });
    if (!game) throw new NotFoundException('Game not found');
    const idx = game.levels.findIndex((l) => l.order === levelOrder);
    if (idx < 0) throw new NotFoundException('Level not found');
    const level = game.levels[idx];

    if (idx > 0) {
      const prev = await this.prisma.gameSession.findFirst({ where: { userId: user.id, levelId: game.levels[idx - 1].id, completed: true }, select: { id: true } });
      if (!prev) throw new ForbiddenException(`Finish "${game.levels[idx - 1].name}" first to unlock this level.`);
    }

    const session = await this.prisma.gameSession.create({ data: { userId: user.id, gameId: game.id, levelId: level.id } });
    return {
      sessionId: session.id,
      game: { slug: game.slug, name: game.name, world: game.world, subject: game.subject },
      level: { order: level.order, name: level.name, intro: level.intro, learningObjective: level.learningObjective, xpPerCorrect: level.xpPerCorrect, xpReward: level.xpReward, isLast: idx === game.levels.length - 1 },
      challenges: level.challenges.map(publicChallenge),
    };
  }

  private async ownedSession(userId: string, sessionId: string) {
    const s = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: { level: { include: { challenges: { orderBy: { order: 'asc' } } } }, game: true, attempts: { orderBy: { createdAt: 'asc' } } },
    });
    // Someone else's session reads exactly like a missing one.
    if (!s || s.userId !== userId) throw new NotFoundException('Session not found');
    return s;
  }

  private states(challenges: Challenge[], attempts: { challengeId: string; correct: boolean }[]) {
    const m = new Map<string, ChallengeState>(challenges.map((c) => [c.id, { tries: 0, solved: false, firstTry: false, revealed: false }]));
    for (const a of attempts) {
      const st = m.get(a.challengeId);
      if (!st || st.solved) continue;
      st.tries += 1;
      if (a.correct) { st.solved = true; st.firstTry = st.tries === 1; }
      else if (st.tries >= REVEAL_AFTER) st.revealed = true;
    }
    return m;
  }

  private streakOf(attempts: { correct: boolean }[]) {
    let streak = 0, best = 0;
    for (const a of attempts) { streak = a.correct ? streak + 1 : 0; best = Math.max(best, streak); }
    return { streak, best };
  }

  /** Judges one answer. The client sends what the child did; the server decides. */
  async attempt(userId: string, sessionId: string, challengeId: string, answer: unknown) {
    const s = await this.ownedSession(userId, sessionId);
    if (s.completed) throw new ConflictException('This level is already finished.');
    const challenge = s.level.challenges.find((c) => c.id === challengeId);
    if (!challenge) throw new BadRequestException('That challenge is not part of this level.');

    const before = this.states(s.level.challenges, s.attempts).get(challenge.id)!;
    if (before.solved) throw new ConflictException('Already solved — on to the next one!');
    if (before.tries >= MAX_TRIES) throw new HttpException('Let’s look at the answer together and move on.', HttpStatus.TOO_MANY_REQUESTS);

    // Measured here, not reported by the client.
    const last = s.attempts.length ? s.attempts[s.attempts.length - 1].createdAt : s.startedAt;
    const responseMs = Date.now() - last.getTime();

    let correct = false;
    let result: Record<string, unknown> = {};
    const setup = challenge.setup as Record<string, unknown>;
    if (challenge.kind === 'MULTIPLE_CHOICE') {
      correct = runChoice(challenge.solution as { index?: number }, answer);
    } else if (challenge.kind === 'CODE_PATH') {
      const run = runGrid(setup as unknown as GridSetup, answer);
      correct = run.ok;
      result = { path: run.path, collected: run.collected, reason: run.reason };
    } else if (challenge.kind === 'PHYSICS_LAUNCH') {
      const run = runLaunch(setup as unknown as LaunchSetup, answer);
      correct = run.ok;
      result = { distance: run.distance, reason: run.reason };
    }

    const hintsUsed = Number(await this.cache.get<number>(this.hintKey(sessionId, challengeId))) || 0;
    await this.prisma.gameAttempt.create({
      data: { sessionId, challengeId, correct, responseMs, hintsUsed, answer: (answer ?? null) as Prisma.InputJsonValue },
    });

    const attempts = [...s.attempts, { challengeId, correct }];
    const after = this.states(s.level.challenges, attempts).get(challenge.id)!;
    const { streak, best } = this.streakOf(attempts);

    // Mastery moves on the first try at a challenge only: retries after a hint
    // are practice, and should not inflate (or crush) the skill score.
    let mastery: number | undefined;
    if (before.tries === 0) {
      const sk = await this.prisma.studentSkill.findUnique({ where: { userId_skill: { userId, skill: challenge.skill } } });
      mastery = nextMastery(sk?.mastery ?? 0, sk?.attempts ?? 0, correct && responseMs >= MIN_HUMAN_MS);
      await this.prisma.studentSkill.upsert({
        where: { userId_skill: { userId, skill: challenge.skill } },
        create: { userId, subject: s.game.subject, skill: challenge.skill, mastery, attempts: 1, correct: correct ? 1 : 0 },
        update: { mastery, attempts: { increment: 1 }, correct: { increment: correct ? 1 : 0 } },
      });
    }

    await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: { attemptCount: { increment: 1 }, correctCount: { increment: correct ? 1 : 0 }, bestStreak: best },
    });

    const all = this.states(s.level.challenges, attempts);
    return {
      correct,
      result,
      streak,
      // The worked example comes when it is solved, or after a few honest tries.
      explanation: after.solved || after.revealed ? challenge.explanation : undefined,
      revealed: !after.solved && after.revealed,
      solved: [...all.values()].filter((x) => x.solved || x.revealed).length,
      total: s.level.challenges.length,
      mastery: mastery === undefined ? undefined : { skill: challenge.skill, value: mastery },
    };
  }

  private hintKey(sessionId: string, challengeId: string) {
    return `game:hint:${sessionId}:${challengeId}`;
  }

  /** Kai's hint ladder: hint 1 → hint 2 → worked example. Never the bare answer first. */
  async hint(userId: string, sessionId: string, challengeId: string) {
    const s = await this.ownedSession(userId, sessionId);
    const c = s.level.challenges.find((x) => x.id === challengeId);
    if (!c) throw new BadRequestException('That challenge is not part of this level.');
    const key = this.hintKey(sessionId, challengeId);
    const used = Number(await this.cache.get<number>(key)) || 0;
    await this.cache.set(key, used + 1, 6 * 3600);
    await this.prisma.gameSession.update({ where: { id: sessionId }, data: { hintsUsed: { increment: 1 } } });
    if (used < c.hints.length) return { step: used + 1, of: c.hints.length + 1, text: c.hints[used], workedExample: false };
    return { step: c.hints.length + 1, of: c.hints.length + 1, text: c.explanation, workedExample: true };
  }

  /**
   * Finishes a level. Every number here comes from attempts the server
   * judged. Idempotent: finishing twice returns the same result.
   */
  async complete(userId: string, sessionId: string) {
    const s = await this.ownedSession(userId, sessionId);
    if (s.completed) return this.summary(s.id, userId);

    const states = this.states(s.level.challenges, s.attempts);
    const open = [...states.values()].filter((x) => !x.solved && !x.revealed).length;
    if (open > 0) throw new BadRequestException(`There ${open === 1 ? 'is 1 challenge' : `are ${open} challenges`} left in this level.`);

    const total = s.level.challenges.length;
    const firstTry = [...states.values()].filter((x) => x.firstTry).length;
    const laterSolved = [...states.values()].filter((x) => x.solved && !x.firstTry).length;
    const accuracy = total ? Math.round((firstTry / total) * 100) : 0;
    const { best } = this.streakOf(s.attempts);
    const elapsed = Date.now() - s.startedAt.getTime();
    const plausible = elapsed >= total * MIN_MS_PER_CHALLENGE;

    let xp = firstTry * s.level.xpPerCorrect + Math.floor(laterSolved * s.level.xpPerCorrect / 2) + s.level.xpReward;
    let coins = Math.round(xp / 10);
    let bonus: { index: number; label: string; xp: number; coins: number } | null = null;
    if (plausible && (best >= 5 || accuracy >= 80)) {
      const index = randomInt(0, BONUS_WHEEL.length);
      bonus = { index, ...BONUS_WHEEL[index] };
      xp += bonus.xp;
      coins += bonus.coins;
    }
    if (!plausible) { xp = 0; coins = 0; }

    const { count } = await this.prisma.gameSession.updateMany({
      where: { id: sessionId, completed: false },
      data: {
        completed: true, endedAt: new Date(), accuracy, bestStreak: best,
        score: firstTry * 100 + laterSolved * 50, xpEarned: xp,
        bonus: bonus ? (bonus as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });
    if (count === 1 && xp > 0) {
      await this.rewards.onGameLevelCompleted(userId, {
        sessionId, title: `${s.game.name}: ${s.level.name}`, xp, coins,
        minutes: Math.max(1, Math.round(elapsed / 60000)), subject: s.game.subject,
      });
    }
    if (count === 1) await this.maybeAwardBadge(userId, s.gameId, s.game.badgeSlug);
    return this.summary(sessionId, userId);
  }

  private async maybeAwardBadge(userId: string, gameId: string, slug: string | null) {
    if (!slug) return;
    const levels = await this.prisma.gameLevel.findMany({ where: { gameId }, select: { id: true } });
    const done = await this.completedLevels(userId);
    if (!levels.every((l) => done.has(l.id))) return;
    const badge = await this.prisma.badge.findUnique({ where: { slug } });
    if (!badge) return;
    await this.prisma.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      create: { userId, badgeId: badge.id },
      update: {},
    });
  }

  async summary(sessionId: string, userId: string) {
    const s = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: { level: true, game: { include: { levels: { orderBy: { order: 'asc' }, select: { order: true } } } } },
    });
    if (!s || s.userId !== userId) throw new NotFoundException('Session not found');
    const badge = s.game.badgeSlug
      ? await this.prisma.userBadge.findFirst({ where: { userId, badge: { slug: s.game.badgeSlug } }, include: { badge: true } })
      : null;
    const nextOrder = s.game.levels.find((l) => l.order > s.level.order)?.order ?? null;
    return {
      completed: s.completed,
      accuracy: s.accuracy,
      stars: starsFor(s.accuracy),
      xpEarned: s.xpEarned,
      bestStreak: s.bestStreak,
      bonus: s.bonus as { index: number; label: string } | null,
      bonusWheel: BONUS_WHEEL.map((b) => b.label),
      badge: badge && badge.earnedAt >= (s.endedAt ?? new Date(0)) ? { name: badge.badge.name, glyph: badge.badge.glyph } : null,
      nextLevel: nextOrder,
    };
  }

  // --- progress, mastery, recommendations -----------------------------------

  async progress(userId: string) {
    const [games, skills, done] = await Promise.all([
      this.list(userId),
      this.prisma.studentSkill.findMany({ where: { userId }, orderBy: [{ subject: 'asc' }, { skill: 'asc' }] }),
      this.prisma.gameSession.aggregate({ where: { userId, completed: true }, _sum: { xpEarned: true }, _count: true }),
    ]);
    return {
      games,
      levelsCompleted: done._count,
      xpFromGames: done._sum.xpEarned ?? 0,
      skills: skills.map((s) => ({ subject: s.subject, skill: s.skill, mastery: s.mastery, attempts: s.attempts })),
      subjects: this.bySubject(skills),
    };
  }

  private bySubject(skills: { subject: string; mastery: number }[]) {
    const m = new Map<string, number[]>();
    for (const s of skills) m.set(s.subject, [...(m.get(s.subject) ?? []), s.mastery]);
    return [...m.entries()].map(([subject, v]) => ({ subject, mastery: Math.round(v.reduce((a, b) => a + b, 0) / v.length) }));
  }

  /**
   * "Try this 8-minute challenge": the weakest practised skill, pointing at a
   * level that practises it. Based only on learning data — never on personal
   * attributes.
   */
  async recommendations(userId: string) {
    const weak = await this.prisma.studentSkill.findMany({
      where: { userId, attempts: { gte: 2 }, mastery: { lt: 70 } },
      orderBy: { mastery: 'asc' }, take: 3,
    });
    const done = await this.completedLevels(userId);
    const out: { game: string; gameName: string; level: number; levelName: string; skill?: string; mastery?: number; reason: string; minutes: number }[] = [];
    for (const w of weak) {
      const c = await this.prisma.gameChallenge.findFirst({
        where: { skill: w.skill, level: { game: { active: true } } },
        include: { level: { include: { game: true } } },
        orderBy: { level: { order: 'asc' } },
      });
      if (c) out.push({
        game: c.level.game.slug, gameName: c.level.game.name, level: c.level.order, levelName: c.level.name,
        skill: w.skill, mastery: w.mastery, reason: `Practise ${w.skill.split('.').pop()} — you're at ${w.mastery}%.`, minutes: 8,
      });
    }
    if (out.length === 0) {
      const games = await this.prisma.game.findMany({ where: { active: true }, orderBy: { order: 'asc' }, include: { levels: { orderBy: { order: 'asc' } } } });
      for (const g of games) {
        const next = g.levels.find((l) => !done.has(l.id));
        if (next) { out.push({ game: g.slug, gameName: g.name, level: next.order, levelName: next.name, reason: 'Your next adventure is ready.', minutes: 8 }); break; }
      }
    }
    return out;
  }

  // --- parent & teacher views ----------------------------------------------

  /**
   * A learner's game progress for a parent, teacher or school leader.
   * Aggregates only — no raw attempts or response times.
   */
  async studentProgress(viewer: AuthUser, studentId: string) {
    if (!(await this.canView(viewer, studentId))) throw new NotFoundException('Student not found');
    const [p, student] = await Promise.all([
      this.progress(studentId),
      this.prisma.user.findUnique({ where: { id: studentId }, select: { name: true, displayName: true, streak: true } }),
    ]);
    const recent = await this.prisma.gameSession.findMany({
      where: { userId: studentId, completed: true }, orderBy: { endedAt: 'desc' }, take: 5,
      select: { endedAt: true, accuracy: true, xpEarned: true, level: { select: { name: true } }, game: { select: { name: true } } },
    });
    return {
      student: { name: student?.displayName ?? student?.name, streak: student?.streak ?? 0 },
      subjects: p.subjects,
      skills: p.skills,
      levelsCompleted: p.levelsCompleted,
      recent: recent.map((r) => ({ game: r.game.name, level: r.level.name, accuracy: r.accuracy, xp: r.xpEarned, at: r.endedAt })),
      recommendation: (await this.recommendations(studentId))[0] ?? null,
    };
  }

  private async canView(viewer: AuthUser, studentId: string): Promise<boolean> {
    if (viewer.id === studentId) return true;
    if (viewer.role === Role.ADMIN || viewer.role === Role.SUPER_ADMIN) return true;
    if (viewer.role === Role.PARENT) {
      const link = await this.prisma.parentStudent.findFirst({ where: { parentId: viewer.id, studentId }, select: { id: true } })
        ?? await this.prisma.childProfile.findFirst({ where: { parentId: viewer.id, studentUserId: studentId }, select: { id: true } });
      return Boolean(link);
    }
    if (viewer.role === Role.TEACHER) {
      const shared = await this.prisma.classEnrollment.findFirst({
        where: { studentId, class: { teachers: { some: { teacherId: viewer.id } } } }, select: { id: true },
      });
      return Boolean(shared);
    }
    if ((viewer.role === Role.SCHOOL_ADMIN || viewer.role === Role.SCHOOL_LEADER) && viewer.schoolId) {
      const s = await this.prisma.user.findFirst({ where: { id: studentId, schoolId: viewer.schoolId }, select: { id: true } });
      return Boolean(s);
    }
    return false;
  }

  /** Class mastery by skill, for the class's teachers and its school's leaders. */
  async classMastery(viewer: AuthUser, classId: string) {
    const cls = await this.prisma.schoolClass.findUnique({
      where: { id: classId },
      select: { name: true, schoolId: true, teachers: { select: { teacherId: true } }, enrollments: { where: { status: 'ACTIVE' }, select: { studentId: true } } },
    });
    const allowed = cls && (
      cls.teachers.some((t) => t.teacherId === viewer.id)
      || ((viewer.role === Role.SCHOOL_ADMIN || viewer.role === Role.SCHOOL_LEADER) && viewer.schoolId === cls.schoolId)
      || viewer.role === Role.ADMIN || viewer.role === Role.SUPER_ADMIN
    );
    if (!cls || !allowed) throw new NotFoundException('Class not found');

    const ids = cls.enrollments.map((e) => e.studentId);
    const rows = ids.length
      ? await this.prisma.studentSkill.groupBy({ by: ['subject', 'skill'], where: { userId: { in: ids } }, _avg: { mastery: true }, _count: { userId: true } })
      : [];
    const skills = rows
      .map((r) => ({ subject: r.subject, skill: r.skill, mastery: Math.round(r._avg.mastery ?? 0), students: r._count.userId }))
      .sort((a, b) => a.mastery - b.mastery);
    return {
      class: cls.name,
      students: ids.length,
      skills,
      needsAttention: skills.filter((s) => s.mastery < 60).slice(0, 5),
    };
  }
}
