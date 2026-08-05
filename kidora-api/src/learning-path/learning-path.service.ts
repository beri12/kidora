import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { World } from '@prisma/client';

const WORLDS: World[] = ['READING_FOREST', 'MATH_ISLAND', 'SCIENCE_PLANET', 'CODING_CITY', 'ART_VALLEY'];

@Injectable()
export class LearningPathService {
  constructor(private prisma: PrismaService) {}

  // Returns every world with the student's progress (0 if not started).
  async forStudent(studentId: string) {
    const rows = await this.prisma.learningPath.findMany({ where: { studentId } });
    const map = new Map(rows.map((r) => [r.world, r.progress]));
    return WORLDS.map((world, i) => ({
      world,
      progress: map.get(world) ?? 0,
      locked: i > 0 && (map.get(WORLDS[i - 1]) ?? 0) < 100 && !map.has(world),
    }));
  }

  setProgress(studentId: string, world: World, progress: number) {
    return this.prisma.learningPath.upsert({
      where: { studentId_world: { studentId, world } },
      update: { progress },
      create: { studentId, world, progress },
    });
  }
}
