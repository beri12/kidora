import { World } from '@prisma/client';

/**
 * The student-facing game map. Each world is a themed wrapper around a real
 * subject, so the game layer always resolves back to curriculum rather than
 * standing on its own.
 */
export interface WorldDef {
  key: World;
  slug: string;
  name: string;
  /** Subject slugs (Subject.slug) whose courses live in this world. */
  subjects: string[];
  emoji: string;
  gradient: string;
  accent: string;
  npc: { name: string; emoji: string; greeting: string };
  zones: { slug: string; name: string; emoji: string }[];
}

export const WORLDS: WorldDef[] = [
  {
    key: World.MATH_ISLAND,
    slug: 'math-kingdom',
    name: 'Math Kingdom',
    subjects: ['math', 'mathematics'],
    emoji: '🏰',
    gradient: 'from-sky-400 to-sky-700',
    accent: '#0284C7',
    npc: { name: 'Professor Number', emoji: '🧙', greeting: 'The village needs your counting skills!' },
    zones: [
      { slug: 'counting-cove', name: 'Counting Cove', emoji: '🔢' },
      { slug: 'fraction-forest', name: 'Fraction Forest', emoji: '🍕' },
      { slug: 'geometry-gate', name: 'Geometry Gate', emoji: '📐' },
    ],
  },
  {
    key: World.SCIENCE_PLANET,
    slug: 'science-forest',
    name: 'Science Forest',
    subjects: ['science'],
    emoji: '🌳',
    gradient: 'from-grass-400 to-grass-700',
    accent: '#16A34A',
    npc: { name: 'Ranger Iris', emoji: '🦉', greeting: 'Something strange is growing in the glade…' },
    zones: [
      { slug: 'living-things', name: 'Living Things', emoji: '🐝' },
      { slug: 'weather-ridge', name: 'Weather Ridge', emoji: '🌦️' },
      { slug: 'space-clearing', name: 'Space Clearing', emoji: '🪐' },
    ],
  },
  {
    key: World.READING_FOREST,
    slug: 'language-city',
    name: 'Language City',
    subjects: ['english', 'reading', 'language'],
    emoji: '🏙️',
    gradient: 'from-amber-400 to-amber-700',
    accent: '#B45309',
    npc: { name: 'Mayor Quill', emoji: '🦜', greeting: 'The city library lost its words. Help us find them!' },
    zones: [
      { slug: 'alphabet-avenue', name: 'Alphabet Avenue', emoji: '🔤' },
      { slug: 'story-square', name: 'Story Square', emoji: '📖' },
      { slug: 'poet-park', name: 'Poet Park', emoji: '🪶' },
    ],
  },
  {
    key: World.CODING_CITY,
    slug: 'future-lab',
    name: 'Future Lab',
    subjects: ['coding', 'ict', 'technology', 'programming'],
    emoji: '🧪',
    gradient: 'from-brand-500 to-brand-800',
    accent: '#7C3AED',
    npc: { name: 'Bit the Robot', emoji: '🤖', greeting: 'My circuits are scrambled. Sequence them for me!' },
    zones: [
      { slug: 'logic-lab', name: 'Logic Lab', emoji: '🧩' },
      { slug: 'loop-lane', name: 'Loop Lane', emoji: '🔁' },
      { slug: 'builder-bay', name: 'Builder Bay', emoji: '🛠️' },
    ],
  },
  {
    key: World.ART_VALLEY,
    slug: 'art-valley',
    name: 'Art Valley',
    subjects: ['art', 'music', 'creative'],
    emoji: '🎨',
    gradient: 'from-coral-400 to-coral-600',
    accent: '#E11D48',
    npc: { name: 'Painter Pip', emoji: '🐿️', greeting: 'The valley lost its colours. Bring them back!' },
    zones: [
      { slug: 'colour-canyon', name: 'Colour Canyon', emoji: '🖌️' },
      { slug: 'rhythm-ridge', name: 'Rhythm Ridge', emoji: '🥁' },
      { slug: 'maker-meadow', name: 'Maker Meadow', emoji: '✂️' },
    ],
  },
];

export const WORLD_BY_SLUG = new Map(WORLDS.map((w) => [w.slug, w]));

/** Which world a subject slug belongs to. Unmapped subjects land in Math Kingdom. */
export function worldForSubject(subjectSlug?: string | null): WorldDef {
  if (subjectSlug) {
    const found = WORLDS.find((w) => w.subjects.includes(subjectSlug.toLowerCase()));
    if (found) return found;
  }
  return WORLDS[0];
}
