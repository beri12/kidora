import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomInt } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { GAME_CONTENT } from './game-content';

/**
 * Copies the built-in game content into the database at startup — only the
 * rows that are missing, matched by game slug / level order / challenge order.
 * Anything already in the database (including edits made later) is left
 * alone. Set GAMES_CONTENT_SYNC=off to skip it entirely.
 */
@Injectable()
export class GamesContentService implements OnModuleInit {
  private logger = new Logger('GamesContent');

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    if (process.env.GAMES_CONTENT_SYNC === 'off') return;
    try {
      const added = await this.sync();
      if (added) this.logger.log(`Added ${added} missing game content rows.`);
    } catch (e) {
      // Never block startup on content; the games simply show what exists.
      this.logger.error(`Game content sync failed: ${(e as Error).message}`);
    }
  }

  /** Returns how many rows it created. Safe to run any number of times. */
  async sync(): Promise<number> {
    let added = 0;
    for (const g of GAME_CONTENT) {
      await this.prisma.badge.upsert({
        where: { slug: g.badge.slug },
        create: { slug: g.badge.slug, name: g.badge.name, desc: g.badge.desc, glyph: g.badge.glyph, gradient: g.badge.gradient, xpReward: 0 },
        update: {},
      });

      let game = await this.prisma.game.findUnique({ where: { slug: g.slug } });
      if (!game) {
        game = await this.prisma.game.create({
          data: {
            slug: g.slug, name: g.name, tagline: g.tagline, description: g.description, world: g.world,
            subject: g.subject, minGrade: g.minGrade, maxGrade: g.maxGrade, badgeSlug: g.badge.slug, order: g.order,
          },
        });
        added++;
      }

      for (const [li, l] of g.levels.entries()) {
        const order = li + 1;
        let level = await this.prisma.gameLevel.findUnique({ where: { gameId_order: { gameId: game.id, order } } });
        if (!level) {
          level = await this.prisma.gameLevel.create({
            data: {
              gameId: game.id, order, name: l.name, intro: l.intro, learningObjective: l.learningObjective,
              difficulty: l.difficulty, xpPerCorrect: l.xpPerCorrect ?? 10, xpReward: l.xpReward ?? 50,
            },
          });
          added++;
        }
        for (const [ci, c] of l.challenges.entries()) {
          const corder = ci + 1;
          const exists = await this.prisma.gameChallenge.findUnique({ where: { levelId_order: { levelId: level.id, order: corder } }, select: { id: true } });
          if (exists) continue;
          let setup: Record<string, unknown> = c.setup ?? {};
          let solution: Record<string, unknown> = c.solution ?? {};
          if ((c.kind ?? 'MULTIPLE_CHOICE') === 'MULTIPLE_CHOICE') {
            // The content lists the right answer first; shuffle so its position gives nothing away.
            const order = shuffle(c.options!.map((_, i) => i));
            setup = { ...setup, options: order.map((i) => c.options![i]) };
            solution = { index: order.indexOf(0) };
          }
          await this.prisma.gameChallenge.create({
            data: {
              levelId: level.id, order: corder, kind: c.kind ?? 'MULTIPLE_CHOICE', skill: c.skill, prompt: c.prompt,
              speaker: c.speaker ?? null, setup: setup as Prisma.InputJsonValue, solution: solution as Prisma.InputJsonValue,
              hints: c.hints, explanation: c.explanation,
            },
          });
          added++;
        }
      }
    }

    // A daily mission that counts game levels, alongside the lesson missions.
    const mission = await this.prisma.mission.findFirst({ where: { metric: 'GAME_LEVELS_COMPLETED', schoolId: null } });
    if (!mission) {
      await this.prisma.mission.create({
        data: { title: 'Play & learn', description: 'Finish 3 game levels today', rewardXP: 100, rewardCoins: 20, kind: 'DAILY', metric: 'GAME_LEVELS_COMPLETED', target: 3, active: true },
      });
      added++;
    }
    return added;
  }
}

function shuffle<T>(a: T[]): T[] {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
