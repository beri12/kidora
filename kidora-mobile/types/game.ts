/** Gamification + world contracts (kidora-api/src/lms/student, economy). */

export type WorldKey =
  | 'MATH_ISLAND'
  | 'READING_FOREST'
  | 'SCIENCE_PLANET'
  | 'CODING_CITY'
  | 'ART_VALLEY'
  // Islands are data-driven; unknown keys from the API must still render.
  | (string & {});

export type NodeStatus = 'COMPLETED' | 'AVAILABLE' | 'LOCKED' | 'IN_PROGRESS';
export type NodeType = 'COURSE' | 'SECTION' | 'LESSON' | 'CHALLENGE' | 'BOSS' | 'QUIZ' | 'REWARD';

/** One node of GET /student/world. `href` is the web path; mobile ignores it. */
export interface WorldNode {
  id: string;
  type: NodeType;
  title: string;
  status: NodeStatus;
  href?: string;
  children?: WorldNode[];
}

export interface World {
  key: WorldKey;
  name: string;
  accent: string;
  progress: number;
  nodes: WorldNode[];
}

export interface WorldResponse {
  worlds: World[];
}

/** Static presentation for an island (artwork, copy). API supplies progress. */
export interface IslandDefinition {
  key: WorldKey;
  nameKey: string;
  descriptionKey: string;
  emoji: string;
  accent: string;
  character: { name: string; emoji: string };
  order: number;
}

/** A presentable island = definition + live progress. */
export interface Island extends IslandDefinition {
  id: WorldKey;
  progress: number;
  unlocked: boolean;
  level: number;
  xp: number;
  nodes: WorldNode[];
}

/** Flattened node placed on the 2D island map. */
export interface MapNode {
  id: string;
  title: string;
  type: NodeType;
  status: NodeStatus;
  courseId: string;
  levelIndex: number;
  isCurrent: boolean;
  xpReward: number;
}

export interface Wallet {
  xp: number;
  coins: number;
  level: number;
}

export interface RewardOutcome {
  xp: number;
  coins: number;
  leveledUp: boolean;
  newLevel: number;
  unlockedAchievements: string[];
  completedQuests: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  unlockedAt: string | null;
  progress: number;
  requirement: number | string | null;
  badgeUrl: string | null;
}

export interface Badge {
  id: string;
  slug: string;
  name: string;
  desc: string;
  glyph: string | null;
  gradient: string | null;
  earnedAt: string | null;
}

export type QuestKind = 'DAILY' | 'WEEKLY' | 'MISSION' | 'STREAK';

export interface Quest {
  id: string;
  kind: QuestKind;
  title: string;
  description: string;
  progress: number;
  target: number;
  rewardXP: number;
  rewardCoins: number;
  completed: boolean;
  claimed: boolean;
  endsAt: string | null;
}

export interface Reward {
  id: string;
  name: string;
  description?: string;
  cost: number;
  category?: string;
  imageUrl?: string | null;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  owned?: boolean;
}

export type LeaderboardScope = 'class' | 'school' | 'global';
export type LeaderboardPeriod = 'week' | 'month';

/** Display-name only: the backend never returns full names here (privacy). */
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  xp: number;
  level?: number;
  isMe: boolean;
}

export interface StreakDay {
  day: string;
  date: string;
  done: boolean;
  isToday: boolean;
}

export type AvatarCategory = 'skin' | 'hair' | 'clothes' | 'accessories' | 'expressions';

export interface AvatarItem {
  id: string;
  category: AvatarCategory | string;
  name: string;
  imageUrl?: string | null;
  emoji?: string;
  price?: number;
  owned?: boolean;
  equipped?: boolean;
}

export type AvatarConfig = Partial<Record<AvatarCategory, string>> & { color?: string };
