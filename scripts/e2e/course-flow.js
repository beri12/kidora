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
  const teacher = await reg({ name: 'Flow Teacher', email: `ft.${s}@k.test`, password: 'Password123', role: 'TEACHER', subject: 'Mathematics' });
  const student = await reg({ name: 'Flow Student', email: `fs.${s}@k.test`, password: 'Password123', role: 'CHILD', gradeLevel: 'Grade 5' });
  const T = teacher.accessToken, S = student.accessToken;

  console.log('\n=== 1. Teacher creates a draft (wizard step 1) ===');
  const draft = await j('/courses/draft', { method: 'POST', token: T, body: JSON.stringify({
    title: 'Fractions Made Easy', description: 'Learn fractions step by step.', subjectSlug: 'math', ageBand: '9-12' }) });
  check('POST /courses/draft -> 201', 201, draft.status);
  const id = draft.body.id;
  check('returns a course id', true, Boolean(id));
  check('starts unpublished', false, draft.body.published);

  console.log('\n=== 2. Teacher saves the curriculum (wizard step 2) ===');
  const curriculum = { sections: [
    { id: 's1', title: 'What is a fraction?', order: 1, lectures: [
      { id: 'l1', title: 'Halves and quarters', order: 1 },
      { id: 'l2', title: 'Reading fractions', order: 2 },
    ]},
    { id: 's2', title: 'Adding fractions', order: 2, lectures: [
      { id: 'l3', title: 'Same denominator', order: 1 },
    ]},
  ]};
  const cur = await j(`/courses/${id}/curriculum`, { method: 'PATCH', token: T, body: JSON.stringify(curriculum) });
  check('PATCH curriculum -> 200', 200, cur.status);
  check('sections saved', 2, cur.body.sections?.length);
  // The gap this fixes: lessons, not just legacy lectures.
  const lessonCount = (cur.body.sections ?? []).reduce((n, sec) => n + (sec.lessons?.length ?? 0), 0);
  check('lessons created for the LMS student side', 3, lessonCount);

  console.log('\n=== 3. Teacher publishes (wizard step 3) ===');
  const pub = await j(`/courses/${id}/publish`, { method: 'POST', token: T, body: JSON.stringify({
    basicInfo: { title: 'Fractions Made Easy', description: 'Learn fractions step by step.' },
    advanceInfo: { description: 'Learn fractions step by step.', learningPoints: ['Read fractions'], requirements: [], tags: ['math'] },
    ...curriculum }) });
  check('POST publish -> 200', 200, pub.status);
  check('course is published', true, pub.body.published);

  console.log('\n=== 4. The course is now in the public catalogue ===');
  const cat = await j('/courses');
  check('GET /courses includes it', true, cat.body.some((c) => c.id === id));
  const detail = await j(`/courses/${id}`);
  check('GET /courses/:id -> 200', 200, detail.status);
  check('detail carries the sections', 2, detail.body.sections?.length);

  console.log('\n=== 5. Before enrolling, the student dashboard is empty ===');
  const before = await j('/student/courses', { token: S });
  check('student has no courses yet', 0, before.body.length);
  const enr0 = await j(`/courses/${id}/enrollment`, { token: S });
  check('not enrolled', false, enr0.body.enrolled);

  console.log('\n=== 6. Student enrolls ===');
  const enroll = await j(`/courses/${id}/enroll`, { method: 'POST', token: S });
  check('POST enroll -> 201', 201, enroll.status);
  check('enrollment is ACTIVE', 'ACTIVE', enroll.body.status);
  check('starts on the first lesson', true, Boolean(enroll.body.lastLessonId));
  // Idempotent, so a double click cannot create two enrollments.
  const again = await j(`/courses/${id}/enroll`, { method: 'POST', token: S });
  check('enrolling twice is idempotent', enroll.body.id, again.body.id);

  console.log('\n=== 7. The course now appears on the student dashboard ===');
  const after = await j('/student/courses', { token: S });
  check('student sees exactly one course', 1, after.body.length);
  check('it is the right course id', id, after.body[0]?.id);
  check('with the right title', 'Fractions Made Easy', after.body[0]?.title);
  check('lesson count is visible', 3, after.body[0]?.totalLessons);
  const dash = await j('/student/dashboard', { token: S });
  check('dashboard courses include it', true, dash.body.courses.some((c) => c.id === id));
  check('dashboard KPI counts the enrollment', 1, dash.body.stats.coursesEnrolled);

  console.log('\n=== 8. Authorization ===');
  check('enrolling without a token -> 401', 401, (await j(`/courses/${id}/enroll`, { method: 'POST' })).status);
  const draft2 = await j('/courses/draft', { method: 'POST', token: T, body: JSON.stringify({
    title: 'Unpublished Course', description: 'Still a draft.' }) });
  check('cannot enrol in an unpublished course -> 403', 403, (await j(`/courses/${draft2.body.id}/enroll`, { method: 'POST', token: S })).status);
  check('unknown course -> 404', 404, (await j('/courses/no-such-id/enroll', { method: 'POST', token: S })).status);
  check('a student cannot create a course -> 403', 403, (await j('/courses/draft', { method: 'POST', token: S,
    body: JSON.stringify({ title: 'Sneaky', description: 'Not allowed at all.' }) })).status);

  console.log('\n=== 9. Unenrol removes it again ===');
  check('DELETE enroll -> 200', 200, (await j(`/courses/${id}/enroll`, { method: 'DELETE', token: S })).status);
  check('student dashboard is empty again', 0, (await j('/student/courses', { token: S })).body.length);

  console.log('\n=== 10. Re-saving the curriculum does not duplicate lessons ===');
  await j(`/courses/${id}/curriculum`, { method: 'PATCH', token: T, body: JSON.stringify(curriculum) });
  const resaved = await j(`/courses/${id}`, {});
  const total = (resaved.body.sections ?? []).reduce((n, sec) => n + (sec.lessons?.length ?? 0), 0);
  check('still 3 lessons, not 6', 3, total);

  console.log(`\n======================================`);
  console.log(`  passed: ${pass}   failed: ${fail}`);
  console.log('======================================');
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('HARNESS ERROR:', e); process.exit(2); });
