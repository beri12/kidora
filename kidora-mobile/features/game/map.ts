import type { MapNode, WorldNode } from '@/types';

/**
 * Flatten an island's course → section → lesson tree into the ordered path
 * the 2D map draws. Pure function: the same data could drive a future 3D
 * renderer (see features/game/engine.ts).
 */
export function flattenIslandNodes(nodes: WorldNode[], xpPerLesson = 20): MapNode[] {
  const out: MapNode[] = [];
  nodes.forEach((course, levelIndex) => {
    const walk = (n: WorldNode): void => {
      if (n.type === 'LESSON' || n.type === 'CHALLENGE' || n.type === 'BOSS') {
        out.push({
          id: n.id,
          title: n.title,
          type: n.type,
          status: n.status,
          courseId: course.id,
          levelIndex,
          isCurrent: false,
          xpReward: n.type === 'BOSS' ? xpPerLesson * 5 : n.type === 'CHALLENGE' ? xpPerLesson * 2 : xpPerLesson,
        });
      }
      n.children?.forEach(walk);
    };
    course.children?.forEach(walk);
  });
  const current = out.find((n) => n.status === 'AVAILABLE' || n.status === 'IN_PROGRESS');
  if (current) current.isCurrent = true;
  return out;
}

/**
 * Winding path position for node `index`: x oscillates across the width,
 * y steps down. Returns fractions of the map width / absolute y in dp.
 */
export function nodePosition(index: number, width: number, step = 110): { x: number; y: number } {
  const amplitude = width * 0.28;
  const x = width / 2 + Math.sin(index * 0.9) * amplitude;
  return { x, y: 80 + index * step };
}

export function islandSummary(nodes: MapNode[]): { completed: number; total: number; ratio: number } {
  const total = nodes.length;
  const completed = nodes.filter((n) => n.status === 'COMPLETED').length;
  return { completed, total, ratio: total ? completed / total : 0 };
}

/** Find which course a lesson belongs to from the cached world (deep links carry only the lesson id). */
export function findCourseForLesson(nodes: WorldNode[], lessonId: string, courseId?: string): string | undefined {
  for (const n of nodes) {
    const nextCourse = n.type === 'COURSE' ? n.id : courseId;
    if (n.id === lessonId && n.type !== 'COURSE') return nextCourse;
    if (n.children) {
      const found = findCourseForLesson(n.children, lessonId, nextCourse);
      if (found) return found;
    }
  }
  return undefined;
}
