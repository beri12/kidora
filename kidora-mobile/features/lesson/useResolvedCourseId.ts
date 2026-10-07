import { findCourseForLesson } from '@/features/game/map';
import { useWorld } from '@/hooks/game';

/** courseId from the route, else looked up in the cached world map. */
export function useResolvedCourseId(lessonId: string, courseIdParam?: string): { courseId?: string; resolving: boolean } {
  const world = useWorld();
  if (courseIdParam) return { courseId: courseIdParam, resolving: false };
  const courseId = world.data ? findCourseForLesson(world.data.worlds.flatMap((w) => w.nodes), lessonId) : undefined;
  return { courseId, resolving: world.isLoading };
}
