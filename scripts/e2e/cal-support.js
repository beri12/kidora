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
const reg = async (p) => (await j('/auth/register', { method: 'POST', body: JSON.stringify(p) })).body;

(async () => {
  const s = Date.now();
  const school = await reg({ name: 'Cal School', email: `cs.${s}@k.test`, password: 'Password123', role: 'SCHOOL_ADMIN', schoolName: `Cal Academy ${s}`, country: 'Ethiopia' });
  const teacher = await reg({ name: 'Cal Teacher', email: `ct.${s}@k.test`, password: 'Password123', role: 'TEACHER', subject: 'Mathematics' });
  const parent = await reg({ name: 'Cal Parent', email: `cp.${s}@k.test`, password: 'Password123', role: 'PARENT' });
  const parent2 = await reg({ name: 'Other Parent', email: `co.${s}@k.test`, password: 'Password123', role: 'PARENT' });
  const student = await reg({ name: 'Cal Student', email: `cd.${s}@k.test`, password: 'Password123', role: 'CHILD', gradeLevel: 'Grade 3' });
  const T = { school: school.accessToken, teacher: teacher.accessToken, parent: parent.accessToken, parent2: parent2.accessToken, student: student.accessToken };

  const from = new Date(Date.now() - 86400000).toISOString();
  const to = new Date(Date.now() + 30 * 86400000).toISOString();

  console.log('\n=== CALENDAR: read ===');
  for (const [role, tok] of Object.entries(T)) {
    const r = await j(`/calendar?from=${from}&to=${to}`, { token: tok });
    check(`${role} can read the calendar -> 200`, 200, r.status);
    if (role === 'school') check('returns an array', true, Array.isArray(r.body));
  }
  check('no token -> 401', 401, (await j(`/calendar?from=${from}&to=${to}`)).status);
  check('missing range -> 400', 400, (await j('/calendar', { token: T.parent })).status);

  console.log('\n=== CALENDAR: create a personal event ===');
  const ev = await j('/calendar', { method: 'POST', token: T.parent, body: JSON.stringify({
    title: 'Reading time', startsAt: new Date(Date.now() + 86400000).toISOString(), type: 'REMINDER' }) });
  check('parent creates a personal event -> 201', 201, ev.status);
  check('stored as personal (no school audience)', null, ev.body.schoolId);

  const mine = await j(`/calendar?from=${from}&to=${to}`, { token: T.parent });
  check('author sees their own event', true, mine.body.some((i) => i.id === ev.body.id));
  check('own event is editable', true, mine.body.find((i) => i.id === ev.body.id)?.editable);

  const others = await j(`/calendar?from=${from}&to=${to}`, { token: T.parent2 });
  check('another parent cannot see it', false, others.body.some((i) => i.id === ev.body.id));

  console.log('\n=== CALENDAR: edit and delete are author-only ===');
  check('non-author edit -> 403', 403, (await j(`/calendar/${ev.body.id}`, { method: 'PATCH', token: T.parent2,
    body: JSON.stringify({ title: 'Hijacked' }) })).status);
  check('non-author delete -> 403', 403, (await j(`/calendar/${ev.body.id}`, { method: 'DELETE', token: T.parent2 })).status);
  check('author edit -> 200', 200, (await j(`/calendar/${ev.body.id}`, { method: 'PATCH', token: T.parent,
    body: JSON.stringify({ title: 'Reading time (updated)' }) })).status);

  console.log('\n=== CALENDAR: audience is authorised ===');
  check('targeting an unknown class -> 404', 404, (await j('/calendar', { method: 'POST', token: T.teacher,
    body: JSON.stringify({ title: 'Valid title', startsAt: new Date().toISOString(), classId: 'no-such-class' }) })).status);
  check('parent cannot target a student they do not have', 403, (await j('/calendar', { method: 'POST', token: T.parent2,
    body: JSON.stringify({ title: 'Valid title', startsAt: new Date().toISOString(), studentId: student.user.id }) })).status);
  check('a child cannot publish school-wide', 403, (await j('/calendar', { method: 'POST', token: T.student,
    body: JSON.stringify({ title: 'Valid title', startsAt: new Date().toISOString(), schoolWide: true }) })).status);

  console.log('\n=== CALENDAR: upcoming ===');
  const up = await j('/calendar/upcoming?days=30', { token: T.parent });
  check('upcoming -> 200', 200, up.status);
  check('includes the created event', true, up.body.some((i) => i.title.startsWith('Reading time')));

  console.log('\n=== SUPPORT: create and read ===');
  const t1 = await j('/support/tickets', { method: 'POST', token: T.parent, body: JSON.stringify({
    subject: 'Cannot see progress', message: 'The progress page has been empty since Monday.', category: 'TECHNICAL' }) });
  check('create ticket -> 201', 201, t1.status);
  check('gets a quotable reference', true, /^KID-[0-9A-F]{6}$/.test(t1.body.reference));
  check('opens in OPEN', 'OPEN', t1.body.status);
  check('first message stored', 1, t1.body.messages.length);

  const list = await j('/support/tickets', { token: T.parent });
  check('requester lists their ticket', true, list.body.some((t) => t.id === t1.body.id));
  const otherList = await j('/support/tickets', { token: T.parent2 });
  check('another user does not see it', false, otherList.body.some((t) => t.id === t1.body.id));
  check('another user cannot open it -> 403', 403, (await j(`/support/tickets/${t1.body.id}`, { token: T.parent2 })).status);

  console.log('\n=== SUPPORT: replies and status ===');
  const rep = await j(`/support/tickets/${t1.body.id}/reply`, { method: 'POST', token: T.parent,
    body: JSON.stringify({ body: 'Still not working today.' }) });
  check('requester can reply -> 201', 201, rep.status);
  const full = await j(`/support/tickets/${t1.body.id}`, { token: T.parent });
  check('thread has both messages', 2, full.body.messages.length);
  check('non-staff cannot change status -> 403', 403, (await j(`/support/tickets/${t1.body.id}`, { method: 'PATCH',
    token: T.parent, body: JSON.stringify({ status: 'RESOLVED' }) })).status);
  check('requester can close their own', 200, (await j(`/support/tickets/${t1.body.id}/close`, { method: 'PATCH', token: T.parent })).status);
  check('closed ticket rejects new replies', 403, (await j(`/support/tickets/${t1.body.id}/reply`, { method: 'POST',
    token: T.parent, body: JSON.stringify({ body: 'more' }) })).status);

  console.log('\n=== SUPPORT: validation and auth ===');
  check('short message -> 400', 400, (await j('/support/tickets', { method: 'POST', token: T.parent,
    body: JSON.stringify({ subject: 'Hi', message: 'short' }) })).status);
  check('no token -> 401', 401, (await j('/support/tickets')).status);

  console.log(`\n======================================`);
  console.log(`  passed: ${pass}   failed: ${fail}`);
  console.log('======================================');
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('HARNESS ERROR:', e); process.exit(2); });
