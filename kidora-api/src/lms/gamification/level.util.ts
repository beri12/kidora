/** Level curve: level n needs 100·n² total XP. Level 1 at 0 XP, level 2 at 100, level 3 at 400… */
export function levelFromXp(xp: number) { return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1); }
export function xpForLevel(level: number) { return 100 * (level - 1) * (level - 1); }
export function xpForNextLevel(level: number) { return 100 * level * level; }
export const periodKeyFor = (kind: 'DAILY' | 'WEEKLY' | 'MISSION' | 'STREAK', d = new Date()) => {
  if (kind === 'DAILY') return d.toISOString().slice(0, 10);
  if (kind === 'WEEKLY') { const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return `${t.getUTCFullYear()}-W${String(Math.ceil((((t.getTime() - y.getTime()) / 86400000) + 1) / 7)).padStart(2, '0')}`; }
  return '';
};
export const todayDate = () => new Date(new Date().toISOString().slice(0, 10));
