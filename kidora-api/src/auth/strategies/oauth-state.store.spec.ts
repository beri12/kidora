import { SignedCookieStateStore } from './oauth-state.store';

/** Minimal Express-ish request/response pair that remembers cookies. */
function roundTrip() {
  const jar: Record<string, string> = {};
  const res = {
    cookie: (k: string, v: string) => { jar[k] = v; },
    clearCookie: (k: string) => { delete jar[k]; },
  };
  const req = () => ({
    res,
    headers: { cookie: Object.entries(jar).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ') },
  });
  return { jar, req };
}

const store = new SignedCookieStateStore();
const issue = (req: any) => new Promise<string>((ok, no) => store.store(req, {}, (e, s) => (e ? no(e) : ok(s!))));
const check = (req: any, state: string) =>
  new Promise<{ ok: boolean; reason?: string }>((done) =>
    store.verify(req, state, {}, (_e, ok, info) => done({ ok, reason: info?.message })));

describe('SignedCookieStateStore', () => {
  it('accepts the state it issued, from the same browser', async () => {
    const { req } = roundTrip();
    const state = await issue(req());
    await expect(check(req(), state)).resolves.toEqual({ ok: true, reason: undefined });
  });

  it('is single use: the cookie is cleared on the way back', async () => {
    const { req, jar } = roundTrip();
    const state = await issue(req());
    await check(req(), state);
    expect(Object.keys(jar)).toHaveLength(0);
    await expect(check(req(), state)).resolves.toMatchObject({ ok: false });
  });

  it('refuses a state from another browser (login CSRF)', async () => {
    const attacker = roundTrip();
    const victim = roundTrip();
    const state = await issue(attacker.req());
    await expect(check(victim.req(), state)).resolves.toMatchObject({ ok: false, reason: 'state_mismatch' });
  });

  it('refuses a tampered state', async () => {
    const { req } = roundTrip();
    const state = await issue(req());
    const [nonce, exp, mac] = state.split('.');
    await expect(check(req(), `${nonce}.${Number(exp) + 999}.${mac}`)).resolves.toMatchObject({ ok: false, reason: 'bad_state' });
  });

  it('refuses a missing state', async () => {
    const { req } = roundTrip();
    await issue(req());
    await expect(check(req(), '')).resolves.toMatchObject({ ok: false, reason: 'missing_state' });
  });
});
