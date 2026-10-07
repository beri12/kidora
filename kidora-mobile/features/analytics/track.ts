import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { logger } from '@/lib/logger';
import { networkState } from '@/lib/network-state';
import { analyticsService } from '@/services/analytics.service';
import type { AnalyticsEvent, AnalyticsEventName, AnalyticsProps } from '@/types';

/**
 * Product analytics with privacy by construction:
 *  - an allow-list of property names; anything else is dropped
 *  - values must be primitives; strings are truncated
 *  - no names, emails, free text, answers or AI messages — ever
 * Events are buffered, persisted, and flushed in batches to save data.
 */
const ALLOWED_PROPS = new Set([
  'lessonId',
  'courseId',
  'quizId',
  'examId',
  'activityId',
  'islandKey',
  'achievementId',
  'rewardId',
  'kind',
  'percent',
  'passed',
  'xp',
  'level',
  'streak',
  'durationSec',
  'role',
  'source',
  'queued',
  'platform',
]);

const MAX_BUFFER = 200;
const FLUSH_AT = 20;

let buffer: AnalyticsEvent[] = [];
let loaded = false;
let flushing = false;
let enabled = true;

export function sanitizeProps(props: Record<string, unknown> = {}): AnalyticsProps {
  const out: AnalyticsProps = {};
  for (const [k, v] of Object.entries(props)) {
    if (!ALLOWED_PROPS.has(k)) continue;
    if (typeof v === 'string') out[k] = v.slice(0, 64);
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean' || v === null) out[k] = v;
  }
  return out;
}

async function load(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.analyticsBuffer);
    if (raw) buffer = [...(JSON.parse(raw) as AnalyticsEvent[]), ...buffer].slice(-MAX_BUFFER);
  } catch {
    buffer = [];
  }
}

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.analyticsBuffer, JSON.stringify(buffer));
  } catch {
    // best effort
  }
}

export async function flushAnalytics(): Promise<void> {
  await load();
  if (flushing || !buffer.length || !networkState.isOnline()) return;
  flushing = true;
  const batch = buffer.slice(0, 50);
  try {
    await analyticsService.sendBatch(batch);
    buffer = buffer.slice(batch.length);
  } catch (e) {
    // Endpoint missing (API GAP #5) or offline: keep the bounded buffer.
    logger.debug('analytics flush deferred', { reason: (e as Error).message });
  } finally {
    flushing = false;
    await persist();
  }
}

export const analytics = {
  track(name: AnalyticsEventName, props?: Record<string, unknown>): void {
    if (!enabled) return;
    buffer.push({ name, props: sanitizeProps(props), at: new Date().toISOString() });
    if (buffer.length > MAX_BUFFER) buffer = buffer.slice(-MAX_BUFFER);
    void persist();
    if (buffer.length >= FLUSH_AT) void flushAnalytics();
  },
  setEnabled(next: boolean): void {
    enabled = next;
  },
  /** test hook */
  _peek(): AnalyticsEvent[] {
    return buffer;
  },
  _reset(): void {
    buffer = [];
    loaded = true;
  },
};
