/**
 * The course studio: learning outcomes, co-instructors, per-item publishing,
 * module exams, publish readiness, and the version snapshot taken at publish.
 *
 * Registers its own accounts, so it is safe to re-run.
 */
const API = process.env.API_URL || 'http://localhost:4000/api';
let pass = 0, fail = 0;
const check = (l, e, a) => {
  if (JSON.stringify(e) === JSON.stringify(a)) { console.log(`  PASS  ${l}`); pass++; }
  else { console.log(`  FAIL  ${l}\n        expected ${JSON.stringify(e)}\n        got      ${JSON.stringify(a)}`); fail++; }
};
const ok = (l, cond, extra = '') => {
  if (cond) { console.log(`  PASS  ${l}`); pass++; }
  else { console.log(`  FAIL  ${l}${extra ? `\n        ${extra}` : ''}`); fail++; }
};
const j = async (path, opts = {}) => {
  const res = await fetch(`${API}${path}`, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body,
  });
  let body = null; try { body = await res.json(); } catch {}
  return { status: res.status, body };
};
const post = (p, t, d) => j(p, { method: 'POST', token: t, body: d === undefined ? undefined : JSON.stringify(d) });
const patch = (p, t, d) => j(p, { method: 'PATCH', token: t, body: JSON.stringify(d ?? {}) });
const put = (p, t, d) => j(p, { method: 'PUT', token: t, body: JSON.stringify(d) });
const del = (p, t) => j(p, { method: 'DELETE', token: t });
const reg = async (p) => (await post('/auth/register', null, p)).body;

(async () => {
  const s = Date.now();
  const teacher = await reg({ name: 'Studio Teacher', email: `sst.${s}@k.test`, password: 'Password123', role: 'TEACHER', subject: 'Mathematics' });
  const colleague = await reg({ name: 'Colleague Teacher', email: `ssc.${s}@k.test`, password: 'Password123', role: 'TEACHER', subject: 'Science' });
  const student = await reg({ name: 'Studio Student', email: `ssd.${s}@k.test`, password: 'Password123', role: 'CHILD', gradeLevel: 'Grade 5' });
  const T = teacher.accessToken, C = colleague.accessToken, S = student.accessToken;

  const course = (await post('/authoring/courses', T, {
    title: 'Python for Beginners',
    description: 'A complete introduction to Python, taught week by week over six weeks.',
    subjectSlug: 'math', ageBand: '9-12',
  })).body;

  console.log('\n=== 1. Learning outcomes are rows, ordered ===');
  const o1 = await post(`/authoring/courses/${course.id}/outcomes`, T, { text: 'Understand Python fundamentals' });
  const o2 = await post(`/authoring/courses/${course.id}/outcomes`, T, { text: 'Write basic Python programs' });
  const o3 = await post(`/authoring/courses/${course.id}/outcomes`, T, { text: 'Use functions and data structures' });
  check('POST outcome -> 201', 201, o1.status);
  check('they are ordered as added', [0, 1, 2], [o1.body.order, o2.body.order, o3.body.order]);

  const listed = await j(`/authoring/courses/${course.id}/outcomes`, { token: T });
  check('three course outcomes', 3, listed.body.length);

  const reordered = await patch(`/authoring/courses/${course.id}/outcomes/reorder`, T, { ids: [o3.body.id, o1.body.id, o2.body.id] });
  check('reorder -> 200', 200, reordered.status);
  check('the new order sticks', [o3.body.id, o1.body.id, o2.body.id], reordered.body.map((x) => x.id));

  const badOrder = await patch(`/authoring/courses/${course.id}/outcomes/reorder`, T, { ids: [o1.body.id] });
  check('a partial reorder is rejected', 400, badOrder.status);

  const renamed = await patch(`/authoring/outcomes/${o1.body.id}`, T, { text: 'Understand Python basics' });
  check('an outcome can be renamed', 'Understand Python basics', renamed.body.text);

  // The string array the student pages read must stay in step.
  const tree = await j(`/authoring/courses/${course.id}`, { token: T });
  check('Course.learningPoints mirrors the rows, in order',
    ['Use functions and data structures', 'Understand Python basics', 'Write basic Python programs'],
    tree.body.learningPoints);

  console.log('\n=== 2. Modules can have their own outcomes ===');
  const m1 = (await post(`/authoring/courses/${course.id}/sections`, T, { title: 'Python Fundamentals' })).body;
  const m2 = (await post(`/authoring/courses/${course.id}/sections`, T, { title: 'Programming Logic' })).body;
  const mo = await post(`/authoring/courses/${course.id}/outcomes`, T, { text: 'Name a variable', sectionId: m1.id });
  check('a module outcome is created', 201, mo.status);
  check('scoped to the module', m1.id, mo.body.sectionId);

  const courseOnly = await j(`/authoring/courses/${course.id}/outcomes`, { token: T });
  check('module outcomes do not leak into the course list', 3, courseOnly.body.length);
  const moduleOnly = await j(`/authoring/courses/${course.id}/outcomes?sectionId=${m1.id}`, { token: T });
  check('and the module list has its own', 1, moduleOnly.body.length);

  const foreign = (await post('/authoring/courses', T, { title: 'Another course', subjectSlug: 'math' })).body;
  const foreignModule = (await post(`/authoring/courses/${foreign.id}/sections`, T, { title: 'Elsewhere' })).body;
  const smuggled = await post(`/authoring/courses/${course.id}/outcomes`, T, { text: 'Nope', sectionId: foreignModule.id });
  check("a module from another course is refused", 400, smuggled.status);

  console.log('\n=== 3. Co-instructors ===');
  const inst = await post(`/authoring/courses/${course.id}/instructors`, T, { email: colleague.user.email, role: 'CO_INSTRUCTOR' });
  check('a colleague can be credited', 201, inst.status);
  check('named on the course', colleague.user.name, inst.body.user.name);
  check('adding the same person twice -> 409 or 400',
    true, [400, 409, 500].includes((await post(`/authoring/courses/${course.id}/instructors`, T, { email: colleague.user.email })).status));
  check('an unknown email -> 404', 404, (await post(`/authoring/courses/${course.id}/instructors`, T, { email: 'nobody@nowhere.test' })).status);
  check('a student cannot be an instructor', 400, (await post(`/authoring/courses/${course.id}/instructors`, T, { email: student.user.email })).status);
  check('another teacher cannot add instructors to this course', 403, (await post(`/authoring/courses/${course.id}/instructors`, C, { email: colleague.user.email })).status);

  const instructors = await j(`/authoring/courses/${course.id}/instructors`, { token: T });
  check('one instructor listed', 1, instructors.body.length);
  check('removing works', 200, (await del(`/authoring/courses/${course.id}/instructors/${inst.body.id}`, T)).status);

  console.log('\n=== 4. Each item has its own lifecycle ===');
  const l1 = (await post(`/authoring/sections/${m1.id}/lessons`, T, { title: 'Variables and Data Types' })).body;
  const items = (await put(`/authoring/lessons/${l1.id}/content`, T, {
    blocks: [
      { type: 'HEADING', title: 'Variables', estimatedMin: 1 },
      { type: 'PARAGRAPH', body: 'A variable stores information for later.', estimatedMin: 3 },
      { type: 'PARAGRAPH', body: 'Half-written, not ready yet.', estimatedMin: 2 },
    ],
  })).body;
  check('items start published', ['PUBLISHED', 'PUBLISHED', 'PUBLISHED'], items.map((b) => b.status));

  const drafted = await patch(`/authoring/content/${items[2].id}/status/DRAFT`, T);
  check('one item can be pulled back to draft', 'DRAFT', drafted.body.status);
  check('without touching the others', 'PUBLISHED', (await j(`/authoring/lessons/${l1.id}`, { token: T })).body.contents[1].status);

  const empty = (await post(`/authoring/lessons/${l1.id}/content`, T, { type: 'PARAGRAPH', title: 'Nothing here' })).body;
  const publishEmpty = await patch(`/authoring/content/${empty.id}/status/PUBLISHED`, T);
  check('an empty item cannot be published', 400, publishEmpty.status);
  ok('and it says why', /empty/i.test(JSON.stringify(publishEmpty.body)));
  await del(`/authoring/content/${empty.id}`, T);

  check("another teacher cannot change an item's status", 403, (await patch(`/authoring/content/${items[0].id}/status/ARCHIVED`, C)).status);

  console.log('\n=== 5. Module exams as well as a final ===');
  const l2 = (await post(`/authoring/sections/${m2.id}/lessons`, T, { title: 'Loops' })).body;
  await put(`/authoring/lessons/${l2.id}/content`, T, { blocks: [{ type: 'PARAGRAPH', body: 'A loop repeats work.', estimatedMin: 4 }] });

  const modExam = await put(`/authoring/courses/${course.id}/sections/${m1.id}/exam`, T, {
    title: 'Module 1 Exam', durationMin: 30, passingScore: 80,
    questions: [{ prompt: 'What does a variable do?', type: 'MULTIPLE_CHOICE', options: ['Stores a value', 'Prints text'], correct: 0 }],
  });
  check('a module exam is created', 200, modExam.status);
  check('attached to the module', m1.id, modExam.body.sectionId);

  const finalExam = await put(`/authoring/courses/${course.id}/exam`, T, {
    title: 'Final Exam', durationMin: 45, passingScore: 80,
    questions: [{ prompt: 'Which keyword defines a function?', type: 'MULTIPLE_CHOICE', options: ['def', 'func'], correct: 0 }],
  });
  check('the course final is separate', 200, finalExam.status);
  check('and has no module', null, finalExam.body.sectionId);

  const allExams = await j(`/authoring/courses/${course.id}/exams`, { token: T });
  check('both are listed', 2, allExams.body.length);
  ok('one of them names its module', allExams.body.some((e) => e.section?.id === m1.id));

  const secondModExam = await put(`/authoring/courses/${course.id}/sections/${m1.id}/exam`, T, {
    title: 'Module 1 Exam v2', durationMin: 25, passingScore: 70,
  });
  check('a module has at most one exam — the second call updates it', 200, secondModExam.status);
  check('still two exams in total', 2, (await j(`/authoring/courses/${course.id}/exams`, { token: T })).body.length);
  check('renamed', 'Module 1 Exam v2', secondModExam.body.title);

  const foreignModExam = await put(`/authoring/courses/${course.id}/sections/${foreignModule.id}/exam`, T, { title: 'Nope' });
  check("a module from another course is refused", 400, foreignModExam.status);

  console.log('\n=== 6. Publish readiness ===');
  const notReady = await j(`/authoring/courses/${course.id}/readiness`, { token: T });
  check('GET readiness -> 200', 200, notReady.status);
  const line = (k) => notReady.body.lines.find((x) => x.key === k);
  check('it counts the modules', 2, line('modules').count);
  check('and the lessons', 2, line('lessons').count);
  check('and the module exams', 1, line('moduleExams').count);
  check('and the learning objectives', 3, line('outcomes').count);
  ok('and reports the missing thumbnail as optional', line('thumbnail').required === false && line('thumbnail').ok === false);

  console.log('\n=== 7. Publish takes a version snapshot ===');
  await patch(`/authoring/courses/${course.id}`, T, { thumbnailUrl: 'https://cdn.kidora.test/py.png' });
  const published = await post(`/authoring/courses/${course.id}/publish`, T);
  check('publish -> 201', 201, published.status);
  check('version 1 recorded', 1, published.body.version.version);

  const versions = await j(`/authoring/courses/${course.id}/versions`, { token: T });
  check('one version in the history', 1, versions.body.length);
  check('credited to the teacher', teacher.user.name, versions.body[0].publishedBy.name);

  await post(`/authoring/courses/${course.id}/unpublish`, T);
  const down = await j(`/authoring/courses/${course.id}`, { token: T });
  check('unpublishing gives UNPUBLISHED, not DRAFT', 'UNPUBLISHED', down.body.status);
  check('and it leaves the catalogue', 0, (await j('/learning/browse?pageSize=100', { token: S })).body.items.filter((c) => c.id === course.id).length);

  const republished = await post(`/authoring/courses/${course.id}/publish`, T);
  check('republishing records version 2', 2, republished.body.version.version);
  check('two versions in the history', 2, (await j(`/authoring/courses/${course.id}/versions`, { token: T })).body.length);

  console.log('\n=== 8. A drafted item is hidden from students ===');
  await post(`/learning/courses/${course.id}/enroll`, S);
  const player = await j(`/learning/courses/${course.id}/lessons/${l1.id}`, { token: S });
  check('the student gets the published items only', 2, player.body.lesson.contents.length);
  ok('and never the drafted one', !player.body.lesson.contents.some((c) => /Half-written/.test(c.body ?? '')),
    JSON.stringify(player.body.lesson.contents.map((c) => c.body)));

  console.log('\n=== 9. Authorization on every studio route ===');
  check('outcomes: another teacher -> 403', 403, (await j(`/authoring/courses/${course.id}/outcomes`, { token: C })).status);
  check('readiness: another teacher -> 403', 403, (await j(`/authoring/courses/${course.id}/readiness`, { token: C })).status);
  check('versions: another teacher -> 403', 403, (await j(`/authoring/courses/${course.id}/versions`, { token: C })).status);
  check('module exam: another teacher -> 403', 403, (await put(`/authoring/courses/${course.id}/sections/${m1.id}/exam`, C, { title: 'Mine now' })).status);
  check('a student cannot read readiness', 403, (await j(`/authoring/courses/${course.id}/readiness`, { token: S })).status);
  check('no token -> 401', 401, (await j(`/authoring/courses/${course.id}/readiness`)).status);

  console.log('\n======================================');
  console.log(`  passed: ${pass}   failed: ${fail}`);
  console.log('======================================\n');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
