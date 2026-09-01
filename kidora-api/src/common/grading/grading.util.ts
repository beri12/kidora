/**
 * Pure, server-only grading helpers.
 *
 * Everything here takes the answer key and the learner's response and returns a
 * boolean. Nothing in this file trusts a client-supplied score — a client only
 * ever sends a *response*, and the score is computed from it here.
 */

export type AnswerKey = Record<string, unknown> | null | undefined;
export type Response = Record<string, unknown> | null | undefined;

const norm = (v: unknown): string =>
  String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** Exact index match — multiple choice, true/false, image select. */
export function gradeChoice(correctIndex: number, response: unknown): boolean {
  if (response === null || response === undefined) return false;
  const picked = typeof response === 'number' ? response : Number((response as any)?.choice ?? NaN);
  return Number.isFinite(picked) && picked === correctIndex;
}

/** Every pair must be matched, and matched the same way. */
export function gradeMatching(key: unknown, response: unknown): boolean {
  const expected = asRecord(key);
  const got = asRecord(response);
  const keys = Object.keys(expected);
  if (keys.length === 0) return false;
  if (Object.keys(got).length !== keys.length) return false;
  return keys.every((k) => norm(got[k]) === norm(expected[k]));
}

/** The full sequence must be in the expected order. */
export function gradeOrdering(key: unknown, response: unknown): boolean {
  const expected = asArray(key).map(norm);
  const got = asArray(response).map(norm);
  if (expected.length === 0 || expected.length !== got.length) return false;
  return expected.every((v, i) => v === got[i]);
}

/** Every drop target must hold the item it accepts. */
export function gradeDragDrop(key: unknown, response: unknown): boolean {
  return gradeMatching(key, response);
}

/**
 * Free text against a list of accepted answers. Case, surrounding whitespace and
 * repeated spaces are ignored so a correct answer is not marked wrong on spacing.
 */
export function gradeText(accepted: unknown, response: unknown): boolean {
  const list = asArray(accepted).map(norm).filter(Boolean);
  if (list.length === 0) return false;
  const got = norm(typeof response === 'string' ? response : (response as any)?.text);
  return !!got && list.includes(got);
}

/** Memory / puzzle style: the learner reports the pairs or pieces they solved. */
export function gradeCompletionCount(key: unknown, response: unknown): boolean {
  const required = Number(asRecord(key).required ?? 0);
  const solved = Number(asRecord(response).solved ?? 0);
  return required > 0 && Number.isFinite(solved) && solved >= required;
}

/** Dialogue / simulation: the learner's chosen path must include every required step. */
export function gradePath(key: unknown, response: unknown): boolean {
  const required = asArray(asRecord(key).required).map(norm);
  if (required.length === 0) return false;
  const taken = new Set(asArray(asRecord(response).path).map(norm));
  return required.every((step) => taken.has(step));
}

/**
 * Deterministic shuffle driven by a seed, so a resumed attempt sees the same
 * question order it started with rather than a fresh random one.
 */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return Math.abs(h) / 2147483647;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1)) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
