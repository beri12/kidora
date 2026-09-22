const API = process.env.API_URL || 'http://localhost:4000/api';
let pass = 0, fail = 0;
const check = (l, e, a) => { if (JSON.stringify(e) === JSON.stringify(a)) { console.log(`  PASS  ${l}`); pass++; }
  else { console.log(`  FAIL  ${l}\n        expected ${JSON.stringify(e)}\n        got      ${JSON.stringify(a)}`); fail++; } };
const j = async (path, opts = {}) => {
  const res = await fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json',
    ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) } });
  let body = null; try { body = await res.json(); } catch {}
  return { status: res.status, body };
};

(async () => {
  const s = Date.now();
  const me = (await j('/auth/register', { method: 'POST', body: JSON.stringify({
    name: 'Settings User', email: `set.${s}@k.test`, password: 'Password123', role: 'CHILD', gradeLevel: 'Grade 4' }) })).body;
  const T = me.accessToken;

  console.log('\n=== GET /users/me ===');
  const prof = await j('/users/me', { token: T });
  check('-> 200', 200, prof.status);
  check('returns the caller', `set.${s}@k.test`, prof.body.email);
  check('ships default settings', 'en', prof.body.settings.language);
  check('defaults include notification prefs', true, prof.body.settings.notifications.assignments);
  check('no passwordHash leaked', undefined, prof.body.passwordHash);

  console.log('\n=== PATCH /users/me (self-editable fields only) ===');
  const upd = await j('/users/me', { method: 'PATCH', token: T, body: JSON.stringify({ displayName: 'Sammy' }) });
  check('-> 200', 200, upd.status);
  check('displayName saved', 'Sammy', upd.body.displayName);

  // Privilege escalation must be impossible through the profile endpoint.
  const esc = await j('/users/me', { method: 'PATCH', token: T, body: JSON.stringify({ role: 'ADMIN', schoolId: 'x', points: 99999 }) });
  check('escalation attempt is not an error (fields stripped)', 200, esc.status);
  check('role unchanged', 'CHILD', esc.body.role);
  check('points unchanged', 0, esc.body.points);
  check('schoolId unchanged', null, esc.body.schoolId);

  console.log('\n=== settings persist and merge ===');
  const s1 = await j('/users/me/settings', { method: 'PATCH', token: T, body: JSON.stringify({ language: 'fr' }) });
  check('language saved', 'fr', s1.body.language);
  check('other keys survive a partial save', 'system', s1.body.appearance);
  const s2 = await j('/users/me/settings', { method: 'PATCH', token: T, body: JSON.stringify({ notifications: { email: true } }) });
  check('nested partial merges', true, s2.body.notifications.email);
  check('sibling notification keys survive', true, s2.body.notifications.assignments);
  check('language still set after second save', 'fr', s2.body.language);
  const s3 = await j('/users/me/settings', { token: T });
  check('re-read returns what was stored', 'fr', s3.body.language);

  console.log('\n=== validation and auth ===');
  const bad = await j('/users/me/settings', { method: 'PATCH', token: T, body: JSON.stringify({ language: 'klingon' }) });
  check('invalid language -> 400', 400, bad.status);
  const badColor = await j('/users/me', { method: 'PATCH', token: T, body: JSON.stringify({ avatarColor: 'not-a-color' }) });
  check('invalid colour -> 400', 400, badColor.status);
  check('no token -> 401', 401, (await j('/users/me')).status);
  check('no token on settings -> 401', 401, (await j('/users/me/settings')).status);

  console.log(`\n======================================`);
  console.log(`  passed: ${pass}   failed: ${fail}`);
  console.log('======================================');
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('HARNESS ERROR:', e); process.exit(2); });
