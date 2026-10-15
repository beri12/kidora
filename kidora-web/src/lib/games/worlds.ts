import type { WorldKey } from "@/lib/api/games";

/**
 * How each Kidora world looks. Presentation only: games, levels and content
 * come from the API. Colours are hex so both Tailwind-free 3D materials and
 * CSS can use them.
 */
export interface WorldTheme {
  key: WorldKey;
  name: string;
  emoji: string;
  blurb: string;
  sky: [string, string];
  ground: string;
  path: string;
  accent: string;
  /** What the low-poly scenery is made of. */
  scenery: "palms" | "trees" | "crystals" | "towers" | "obelisks";
  props: string[];
}

export const WORLDS: Record<WorldKey, WorldTheme> = {
  MATH_ISLAND: {
    key: "MATH_ISLAND", name: "Math Island", emoji: "🏝️", blurb: "Treasure, bridges and number puzzles.",
    sky: ["#7DD3FC", "#E0F2FE"], ground: "#FCD34D", path: "#F59E0B", accent: "#2563EB", scenery: "palms", props: ["⭐", "🧮", "💎"],
  },
  READING_FOREST: {
    key: "READING_FOREST", name: "Reading Forest", emoji: "🌳", blurb: "Talking animals and word hunts.",
    sky: ["#86EFAC", "#F0FDF4"], ground: "#4ADE80", path: "#A16207", accent: "#16A34A", scenery: "trees", props: ["🐘", "🦒", "🐒"],
  },
  SCIENCE_PLANET: {
    key: "SCIENCE_PLANET", name: "Science Planet", emoji: "🔬", blurb: "Cells, savannas and launch labs.",
    sky: ["#C4B5FD", "#F5F3FF"], ground: "#A78BFA", path: "#7C3AED", accent: "#7C3AED", scenery: "crystals", props: ["🧬", "🪐", "⚡"],
  },
  CODING_CITY: {
    key: "CODING_CITY", name: "Coding City", emoji: "💻", blurb: "Robots, traffic lights and smart farms.",
    sky: ["#A5B4FC", "#EEF2FF"], ground: "#94A3B8", path: "#334155", accent: "#4F46E5", scenery: "towers", props: ["🤖", "🔋", "🚦"],
  },
  HISTORY_WORLD: {
    key: "HISTORY_WORLD", name: "History World", emoji: "🏛️", blurb: "Time-travel to Aksum, the Nile and beyond.",
    sky: ["#FDBA74", "#FFF7ED"], ground: "#D6A76C", path: "#92400E", accent: "#EA580C", scenery: "obelisks", props: ["🏺", "🗿", "📜"],
  },
  ART_VALLEY: {
    key: "ART_VALLEY", name: "Art Valley", emoji: "🎨", blurb: "Coming soon.",
    sky: ["#F9A8D4", "#FDF2F8"], ground: "#F472B6", path: "#BE185D", accent: "#DB2777", scenery: "trees", props: ["🎨"],
  },
};

/** The five worlds on the map, in journey order. */
export const MAP_ORDER: WorldKey[] = ["MATH_ISLAND", "READING_FOREST", "SCIENCE_PLANET", "CODING_CITY", "HISTORY_WORLD"];

export const SUBJECT_LABEL: Record<string, string> = {
  math: "Mathematics", english: "English", science: "Biology & Physics", coding: "Coding", history: "History",
};
