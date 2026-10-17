import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Keys defined more than once in .env. The last definition wins, so a file
 * that has a production block pasted under the local one silently runs with
 * production settings (NODE_ENV, CORS_ORIGIN, REDIS_HOST …). Names only —
 * values are never read out.
 */
export function duplicateEnvKeys(path = join(process.cwd(), '.env')): string[] {
  if (!existsSync(path)) return [];
  const counts = new Map<string, number>();
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=/.exec(line);
    if (m) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  }
  return [...counts].filter(([, n]) => n > 1).map(([k]) => k).sort();
}
