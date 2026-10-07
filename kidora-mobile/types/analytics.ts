export type AnalyticsEventName =
  | 'app_opened'
  | 'lesson_started'
  | 'lesson_completed'
  | 'quiz_started'
  | 'quiz_completed'
  | 'island_opened'
  | 'activity_completed'
  | 'ai_tutor_opened'
  | 'ai_question_asked'
  | 'achievement_unlocked'
  | 'reward_claimed'
  | 'streak_started'
  | 'streak_continued';

/** Only primitive, non-identifying properties are allowed. */
export type AnalyticsProps = Record<string, string | number | boolean | null>;

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  props: AnalyticsProps;
  at: string;
}

export interface MetricPoint {
  label: string;
  value: number;
}

export interface MetricSeries {
  name: string;
  color?: string;
  points: MetricPoint[];
}
