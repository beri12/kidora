import { flattenIslandNodes, findCourseForLesson, islandSummary } from '@/features/game/map';
import { resolveIslandKey } from '@/features/game/islands';
import { buildIslands } from '@/services/game.service';
import { celebrationsFor } from '@/store/gameStore';
import type { WorldResponse } from '@/types';

const world: WorldResponse = {
  worlds: [
    {
      key: 'MATH_ISLAND',
      name: 'Math Island',
      accent: '#7C3AED',
      progress: 40,
      nodes: [
        {
          id: 'c1',
          type: 'COURSE',
          title: 'Fractions',
          status: 'AVAILABLE',
          children: [
            { id: 's1', type: 'SECTION', title: 'Halves', status: 'COMPLETED', children: [{ id: 'l1', type: 'LESSON', title: 'One', status: 'COMPLETED' }] },
            { id: 's2', type: 'SECTION', title: 'Quarters', status: 'AVAILABLE', children: [{ id: 'l2', type: 'LESSON', title: 'Two', status: 'AVAILABLE' }, { id: 'l3', type: 'CHALLENGE', title: 'Three', status: 'LOCKED' }] },
            { id: 'x1', type: 'BOSS', title: 'Exam', status: 'LOCKED' },
          ],
        },
      ],
    },
    { key: 'SPACE_STATION', name: 'Space Station', accent: '#000000', progress: 0, nodes: [] },
  ],
};

describe('island map', () => {
  it('flattens course → section → lesson in order and marks the current node', () => {
    const nodes = flattenIslandNodes(world.worlds[0]!.nodes);
    expect(nodes.map((n) => n.id)).toEqual(['l1', 'l2', 'l3', 'x1']);
    expect(nodes.find((n) => n.isCurrent)?.id).toBe('l2');
    expect(nodes.find((n) => n.id === 'x1')?.xpReward).toBe(100);
    expect(islandSummary(nodes)).toEqual({ completed: 1, total: 4, ratio: 0.25 });
  });

  it('finds the course of a deep-linked lesson', () => {
    expect(findCourseForLesson(world.worlds[0]!.nodes, 'l3')).toBe('c1');
    expect(findCourseForLesson(world.worlds[0]!.nodes, 'nope')).toBeUndefined();
  });

  it('shows every catalogue island and accepts new server-defined islands', () => {
    const islands = buildIslands(world, 4280);
    const keys = islands.map((i) => i.key);
    expect(keys).toEqual(expect.arrayContaining(['MATH_ISLAND', 'READING_FOREST', 'SCIENCE_PLANET', 'CODING_CITY', 'ART_VALLEY', 'SPACE_STATION']));
    expect(islands.find((i) => i.key === 'MATH_ISLAND')?.unlocked).toBe(true);
    expect(islands.find((i) => i.key === 'ART_VALLEY')?.unlocked).toBe(false);
    expect(islands.find((i) => i.key === 'SPACE_STATION')?.nameKey).toBe('islands.generic.name');
    expect(islands[0]?.level).toBe(7);
  });

  it('resolves deep-link island slugs', () => {
    expect(resolveIslandKey('math')).toBe('MATH_ISLAND');
    expect(resolveIslandKey('READING_FOREST')).toBe('READING_FOREST');
  });
});

describe('celebrations', () => {
  it('queues XP, level up and achievements from a reward outcome', () => {
    const c = celebrationsFor({ xp: 50, coins: 10, leveledUp: true, newLevel: 8, unlockedAchievements: ['Streak Starter'], completedQuests: [] });
    expect(c.map((x) => x.kind)).toEqual(['xp', 'level_up', 'achievement']);
  });

  it('plays nothing for an empty (already rewarded) outcome', () => {
    expect(celebrationsFor({ xp: 0, coins: 0, leveledUp: false, newLevel: 3, unlockedAchievements: [], completedQuests: [] })).toEqual([]);
  });
});
