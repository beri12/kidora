import { api } from "./client";

export type WorldKey = "MATH_ISLAND" | "READING_FOREST" | "SCIENCE_PLANET" | "CODING_CITY" | "HISTORY_WORLD" | "ART_VALLEY";
export type ChallengeKind = "MULTIPLE_CHOICE" | "CODE_PATH" | "PHYSICS_LAUNCH";
export type Dir = "N" | "E" | "S" | "W";
export type Block = "F" | "L" | "R";

export interface GameCard {
  slug: string; name: string; tagline: string; world: WorldKey; subject: string;
  minGrade: number; maxGrade: number; levels: number; completedLevels: number; progress: number; xpAvailable: number;
}

export interface LevelCard {
  order: number; name: string; intro: string; learningObjective: string; difficulty: number;
  challenges: number; xp: number; completed: boolean; stars: number; unlocked: boolean;
}

export interface GameDetail extends Omit<GameCard, "levels" | "completedLevels" | "progress" | "xpAvailable"> {
  description: string;
  levels: LevelCard[];
}

export interface GridSetup { size: number; start: [number, number]; dir: Dir; goal: [number, number]; walls: [number, number][]; items: [number, number][]; maxBlocks: number }
export interface LaunchSetup { gravity: number; target: [number, number]; power: [number, number]; angle: [number, number] }
export interface ChoiceSetup { options: string[]; scene?: "cell" | "savanna" }

export interface Challenge {
  id: string; order: number; kind: ChallengeKind; skill: string; prompt: string; speaker: string | null;
  setup: ChoiceSetup | GridSetup | LaunchSetup; hintCount: number;
}

export interface SessionStart {
  sessionId: string;
  game: { slug: string; name: string; world: WorldKey; subject: string };
  level: { order: number; name: string; intro: string; learningObjective: string; xpPerCorrect: number; xpReward: number; isLast: boolean };
  challenges: Challenge[];
}

export interface AttemptResult {
  correct: boolean;
  result: { path?: { x: number; y: number; dir: Dir }[]; collected?: number; distance?: number; reason?: string };
  streak: number;
  explanation?: string;
  revealed: boolean;
  solved: number;
  total: number;
  mastery?: { skill: string; value: number };
}

export interface Hint { step: number; of: number; text: string; workedExample: boolean }

export interface LevelSummary {
  completed: boolean; accuracy: number; stars: 1 | 2 | 3; xpEarned: number; bestStreak: number;
  bonus: { index: number; label: string } | null; bonusWheel: string[];
  badge: { name: string; glyph: string } | null; nextLevel: number | null;
}

export interface GameProgress {
  games: GameCard[]; levelsCompleted: number; xpFromGames: number;
  skills: { subject: string; skill: string; mastery: number; attempts: number }[];
  subjects: { subject: string; mastery: number }[];
}

export interface Recommendation { game: string; gameName: string; level: number; levelName: string; skill?: string; mastery?: number; reason: string; minutes: number }

export interface StudentGameProgress {
  student: { name: string; streak: number };
  subjects: { subject: string; mastery: number }[];
  skills: { subject: string; skill: string; mastery: number; attempts: number }[];
  levelsCompleted: number;
  recent: { game: string; level: string; accuracy: number; xp: number; at: string }[];
  recommendation: Recommendation | null;
}

export const gamesApi = {
  list: () => api.get<GameCard[]>("/games"),
  detail: (slug: string) => api.get<GameDetail>(`/games/${slug}`),
  progress: () => api.get<GameProgress>("/games/progress"),
  recommendations: () => api.get<Recommendation[]>("/games/recommendations"),
  studentProgress: (studentId: string) => api.get<StudentGameProgress>(`/games/students/${studentId}/progress`),
  start: (slug: string, level: number) => api.post<SessionStart>(`/games/${slug}/sessions`, { level }),
  attempt: (sessionId: string, challengeId: string, answer: unknown) =>
    api.post<AttemptResult>(`/games/sessions/${sessionId}/attempt`, { challengeId, answer }),
  hint: (sessionId: string, challengeId: string) => api.post<Hint>(`/games/sessions/${sessionId}/hint`, { challengeId }),
  complete: (sessionId: string) => api.post<LevelSummary>(`/games/sessions/${sessionId}/complete`, {}),
};
