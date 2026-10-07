import { worldAccents } from '@/theme/colors';
import type { IslandDefinition, WorldKey } from '@/types';

/**
 * Island catalogue. Adding an island = one entry here (art + copy) — or none
 * at all: unknown world keys from the API fall back to a generic island.
 */
export const ISLANDS: readonly IslandDefinition[] = [
  {
    key: 'MATH_ISLAND',
    nameKey: 'islands.MATH_ISLAND.name',
    descriptionKey: 'islands.MATH_ISLAND.description',
    emoji: '🏝️',
    accent: worldAccents.MATH_ISLAND ?? '#7C3AED',
    character: { name: 'Zuri', emoji: '🦒' },
    order: 1,
  },
  {
    key: 'READING_FOREST',
    nameKey: 'islands.READING_FOREST.name',
    descriptionKey: 'islands.READING_FOREST.description',
    emoji: '🌳',
    accent: worldAccents.READING_FOREST ?? '#16A34A',
    character: { name: 'Baraka', emoji: '🦉' },
    order: 2,
  },
  {
    key: 'SCIENCE_PLANET',
    nameKey: 'islands.SCIENCE_PLANET.name',
    descriptionKey: 'islands.SCIENCE_PLANET.description',
    emoji: '🪐',
    accent: worldAccents.SCIENCE_PLANET ?? '#9A6F00',
    character: { name: 'Nia', emoji: '🐢' },
    order: 3,
  },
  {
    key: 'CODING_CITY',
    nameKey: 'islands.CODING_CITY.name',
    descriptionKey: 'islands.CODING_CITY.description',
    emoji: '🏙️',
    accent: worldAccents.CODING_CITY ?? '#1D4ED8',
    character: { name: 'Jabari', emoji: '🤖' },
    order: 4,
  },
  {
    key: 'ART_VALLEY',
    nameKey: 'islands.ART_VALLEY.name',
    descriptionKey: 'islands.ART_VALLEY.description',
    emoji: '🎨',
    accent: worldAccents.ART_VALLEY ?? '#BE123C',
    character: { name: 'Amara', emoji: '🦜' },
    order: 5,
  },
];

/** Slug used in deep links: kidora://island/math → MATH_ISLAND. */
const SLUGS: Record<string, WorldKey> = {
  math: 'MATH_ISLAND',
  reading: 'READING_FOREST',
  science: 'SCIENCE_PLANET',
  coding: 'CODING_CITY',
  art: 'ART_VALLEY',
};

export function resolveIslandKey(idOrSlug: string): WorldKey {
  return SLUGS[idOrSlug.toLowerCase()] ?? idOrSlug.toUpperCase();
}

export function islandDefinition(key: WorldKey): IslandDefinition {
  const found = ISLANDS.find((i) => i.key === key);
  if (found) return found;
  return {
    key,
    nameKey: 'islands.generic.name',
    descriptionKey: 'islands.generic.description',
    emoji: '🗺️',
    accent: '#7C3AED',
    character: { name: 'Kai', emoji: '🦊' },
    order: 100,
  };
}
