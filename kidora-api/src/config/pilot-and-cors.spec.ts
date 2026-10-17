import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { pilotWindow } from './payments.config';
import { allowedOrigins, corsOriginOption } from './cors';
import { duplicateEnvKeys } from './env-file-check';
import { LearningService } from '../lms/learning/learning.service';

describe('pilotWindow (PILOT_FREE_UNTIL)', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });
  const now = new Date('2026-10-17T12:00:00Z');

  it('is off when unset or unparseable', () => {
    delete process.env.PILOT_FREE_UNTIL;
    expect(pilotWindow(now)).toEqual({ active: false, endsAt: null });
    process.env.PILOT_FREE_UNTIL = 'soon';
    expect(pilotWindow(now).active).toBe(false);
  });

  it('runs until the end of the given day (UTC), then ends by itself', () => {
    process.env.PILOT_FREE_UNTIL = '2026-12-31';
    expect(pilotWindow(now)).toEqual({ active: true, endsAt: new Date('2026-12-31T23:59:59.999Z') });
    expect(pilotWindow(new Date('2027-01-01T00:00:01Z')).active).toBe(false);
  });
});

describe('CORS', () => {
  const run = (opt: ReturnType<typeof corsOriginOption>, origin?: string) =>
    new Promise<boolean | undefined>((res) => (opt === true ? res(true) : opt(origin, (_e, allow) => res(allow))));

  it('reflects any origin when CORS_ORIGIN is unset (unchanged behaviour)', () => {
    expect(corsOriginOption({})).toBe(true);
  });

  it('always allows the WEB_URL frontend — the cause of "No connection" on the pricing page', async () => {
    const env = { CORS_ORIGIN: 'https://justkidora.com', WEB_URL: 'http://localhost:3000' };
    expect(allowedOrigins(env)).toEqual(['https://justkidora.com', 'http://localhost:3000']);
    const opt = corsOriginOption(env);
    expect(await run(opt, 'http://localhost:3000')).toBe(true);
    expect(await run(opt, 'https://justkidora.com')).toBe(true);
    expect(await run(opt, 'https://evil.example')).toBe(false);
    expect(await run(opt, undefined)).toBe(true); // curl / server-to-server
  });

  it('trims spaces, quotes and trailing slashes', () => {
    expect(allowedOrigins({ CORS_ORIGIN: ' "https://justkidora.com/" , https://www.justkidora.com' })).toEqual(['https://justkidora.com', 'https://www.justkidora.com']);
  });
});

describe('duplicate .env keys', () => {
  it('names keys defined twice, never their values', () => {
    const dir = mkdtempSync(join(tmpdir(), 'envcheck-'));
    const f = join(dir, '.env');
    writeFileSync(f, 'NODE_ENV=development\nCORS_ORIGIN=http://localhost:3000\n# NODE_ENV=x\nMerchant AppId = \nNODE_ENV=production\nCORS_ORIGIN=https://justkidora.com\nPORT=4000\n');
    expect(duplicateEnvKeys(f)).toEqual(['CORS_ORIGIN', 'NODE_ENV']);
    expect(duplicateEnvKeys(join(dir, 'missing'))).toEqual([]);
  });
});

describe('premium access during the pilot ("Skip for now")', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  it('opens premium content to every signed-in user while the pilot runs', async () => {
    const prisma = new Proxy({}, { get: () => { throw new Error('should not query'); } });
    const svc = Object.create(LearningService.prototype) as LearningService;
    Object.assign(svc, { prisma });
    process.env.PILOT_FREE_UNTIL = '2999-12-31';
    await expect(svc.hasPremiumAccess('anyone')).resolves.toBe(true);
  });
});
