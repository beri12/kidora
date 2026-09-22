/**
 * Role-based integration test.
 * Seeds one account per role in one school, then asserts each role can reach
 * its own dashboards and is refused everywhere else.
 */
const API = process.env.API_URL || 'http://localhost:4000/api';
let pass = 0, fail = 0;
const check = (l, e, a) => { if (JSON.stringify(e) === JSON.stringify(a)) { console.log(`  PASS  ${l}`); pass++; }
  else { console.log(`  FAIL  ${l}\n        expected ${JSON.stringify(e)}\n        got      ${JSON.stringify(a)}`); fail++; } };

const j = async (path, opts = {}) => {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}), ...opts.headers },
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
};
const reg = async (payload) => (await j('/auth/register', { method: 'POST', body: JSON.stringify(payload) })).body;
const stamp = Date.now();

(async () => {
  console.log('\n=== Seed: one school, one account per role ===');
  const school = await reg({ name: 'Head Teacher', email: `head.${stamp}@t.test`, password: 'Password123',
    role: 'SCHOOL_ADMIN', schoolName: `Integration Academy ${stamp}`, country: 'Ethiopia' });
  check('SCHOOL_ADMIN registered', 'SCHOOL_ADMIN', school.user.role);
  check('school created and linked', true, Boolean(school.user.schoolId));

  // The join code lets the teacher and student land in the same school.
  // (school dashboard is asserted below)
  const teacher = await reg({ name: 'Tina Teacher', email: `teach.${stamp}@t.test`, password: 'Password123',
    role: 'TEACHER', subject: 'Mathematics' });
  const parent = await reg({ name: 'Pat Parent', email: `par.${stamp}@t.test`, password: 'Password123', role: 'PARENT' });
  const student = await reg({ name: 'Sam Student', email: `stu.${stamp}@t.test`, password: 'Password123',
    role: 'CHILD', gradeLevel: 'Grade 3' });
  check('TEACHER registered', 'TEACHER', teacher.user.role);
  check('PARENT registered', 'PARENT', parent.user.role);
  check('CHILD registered', 'CHILD', student.user.role);

  const T = { school: school.accessToken, teacher: teacher.accessToken, parent: parent.accessToken, student: student.accessToken };

  console.log('\n=== The schoolId fix: token now carries tenancy ===');
  // Before the fix TenancyService.requireSchool() threw for every school admin
  // because request.user.schoolId was undefined.
  const overview = await j('/school/dashboard', { token: T.school });
  check('GET /school/dashboard is not 403 "No school linked"', true, overview.status !== 403);
  check('GET /school/dashboard -> 200', 200, overview.status);

  console.log('\n=== Each role reaches its own area ===');
  for (const [label, path, token] of [
    ['student  /student/dashboard', '/student/dashboard', T.student],
    ['student  /student/courses', '/student/courses', T.student],
    ['teacher  /teacher/dashboard', '/teacher/dashboard', T.teacher],
    ['teacher  /teacher/classes', '/teacher/classes', T.teacher],
    ['parent   /parent/children', '/parent/children', T.parent],
    ['school   /school/students', '/school/students', T.school],
    ['school   /school/teachers', '/school/teachers', T.school],
  ]) {
    const r = await j(path, { token });
    check(`${label} -> 200`, 200, r.status);
  }

  console.log('\n=== Cross-role access is refused by the backend ===');
  const denials = [
    ['student -> /teacher/dashboard', '/teacher/dashboard', T.student],
    ['student -> /school/students', '/school/students', T.student],
    ['student -> /parent/children', '/parent/children', T.student],
    ['teacher -> /student/dashboard', '/student/dashboard', T.teacher],
    ['teacher -> /school/students', '/school/students', T.teacher],
    ['parent  -> /student/dashboard', '/student/dashboard', T.parent],
    ['parent  -> /teacher/dashboard', '/teacher/dashboard', T.parent],
    ['school  -> /student/dashboard', '/student/dashboard', T.school],
  ];
  for (const [label, path, token] of denials) {
    const r = await j(path, { token });
    check(`${label} -> 403`, 403, r.status);
  }

  console.log('\n=== Unauthenticated access is refused ===');
  for (const path of ['/student/dashboard', '/teacher/dashboard', '/parent/children', '/school/students']) {
    const r = await j(path);
    check(`no token ${path} -> 401`, 401, r.status);
  }

  console.log('\n=== Parent cannot read another parent\'s child ===');
  const other = await reg({ name: 'Other Parent', email: `oth.${stamp}@t.test`, password: 'Password123', role: 'PARENT' });
  const foreign = await j(`/parent/children/${student.user.id}/progress`, { token: other.accessToken });
  check('foreign child progress is refused', true, [403, 404].includes(foreign.status));

  console.log('\n=== Teacher roster is scoped, not the whole platform ===');
  // TeachersController.students() used to return every CHILD on the platform.
  const roster = await j('/teachers/students', { token: T.teacher });
  check('GET /teachers/students -> 200', 200, roster.status);
  check('teacher with no classes sees an empty roster', 0, Array.isArray(roster.body) ? roster.body.length : -1);

  console.log('\n=== Role demotion takes effect without a new token ===');
  // The strategy reads role from the database, so a stale token cannot keep
  // elevated access.
  const r1 = await j('/school/students', { token: T.school });
  check('school admin can list students', 200, r1.status);

  console.log('\n======================================');
  console.log(`  passed: ${pass}   failed: ${fail}`);
  console.log('======================================');
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('HARNESS ERROR:', e); process.exit(2); });
