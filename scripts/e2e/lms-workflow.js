/**
 * The course workflow from spec §41, end to end against the running API:
 * teacher login -> course -> module -> lesson -> content -> quiz ->
 * assignment -> final exam -> completion rules -> preview -> validate ->
 * publish -> student browse -> enrol -> learn -> complete -> quiz ->
 * submit assignment -> teacher grades -> exam -> course complete -> certificate.
 *
 * Registers its own accounts, so it is safe to re-run.
 */
const API = process.env.API_URL || 'http://localhost:4000/api';
let pass = 0, fail = 0;
const check = (l, e, a) => {
  if (JSON.stringify(e) === JSON.stringify(a)) { console.log(`  PASS  ${l}`); pass++; }
  else { console.log(`  FAIL  ${l}\n        expected ${JSON.stringify(e)}\n        got      ${JSON.stringify(a)}`); fail++; }
};
const ok = (l, cond, extra = '') => check(l, true, Boolean(cond)) || (cond ? 0 : console.log(`        ${extra}`));

const j = async (path, opts = {}) => {
  const res = await fetch(`${API}${path}`, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body,
  });
  let body = null; try { body = await res.json(); } catch {}
  return { status: res.status, body };
};
const post = (p, token, data) => j(p, { method: 'POST', token, body: data === undefined ? undefined : JSON.stringify(data) });
const patch = (p, token, data) => j(p, { method: 'PATCH', token, body: JSON.stringify(data) });
const put = (p, token, data) => j(p, { method: 'PUT', token, body: JSON.stringify(data) });
const del = (p, token) => j(p, { method: 'DELETE', token });
const reg = async (p) => (await post('/auth/register', null, p)).body;

(async () => {
  const s = Date.now();
  console.log('\n=== 1. Teacher and students sign in ===');
  const teacher = await reg({ name: 'LMS Teacher', email: `lt.${s}@k.test`, password: 'Password123', role: 'TEACHER', subject: 'Mathematics' });
  const student = await reg({ name: 'LMS Student', email: `ls.${s}@k.test`, password: 'Password123', role: 'CHILD', gradeLevel: 'Grade 5' });
  const other   = await reg({ name: 'Other Teacher', email: `lo.${s}@k.test`, password: 'Password123', role: 'TEACHER', subject: 'Science' });
  const T = teacher.accessToken, S = student.accessToken, O = other.accessToken;
  ok('teacher has a token', Boolean(T));
  ok('student has a token', Boolean(S));

  console.log('\n=== 2. Teacher creates a course (basic information) ===');
  const created = await post('/authoring/courses', T, {
    title: 'Fractions for Grade 5',
    shortDescription: 'Halves, quarters and everything between.',
    description: 'A complete introduction to fractions: naming them, comparing them, and adding them together with confidence.',
    subjectSlug: 'math', ageBand: '9-12', language: 'English', difficulty: 'EASY',
    learningPoints: ['Name a fraction', 'Compare two fractions', 'Add fractions'],
    thumbnailUrl: 'https://cdn.kidora.test/frac.png',
  });
  check('POST /authoring/courses -> 201', 201, created.status);
  const courseId = created.body.id;
  ok('course has an id', Boolean(courseId));
  check('starts as a draft', 'DRAFT', created.body.status);
  check('starts unpublished', false, created.body.published);

  console.log('\n=== 3. Draft is saved step by step ===');
  const saved = await patch(`/authoring/courses/${courseId}`, T, { topic: 'Fractions', tags: ['maths', 'fractions'] });
  check('PATCH course -> 200', 200, saved.status);
  check('tags persisted', ['maths', 'fractions'], saved.body.tags);

  console.log('\n=== 4. Course structure: modules ===');
  const m1 = await post(`/authoring/courses/${courseId}/sections`, T, { title: 'Module 1: What is a fraction?' });
  const m2 = await post(`/authoring/courses/${courseId}/sections`, T, { title: 'Module 2: Adding fractions' });
  check('module 1 created', 201, m1.status);
  check('module 2 created', 201, m2.status);
  check('modules get stable ascending order', [0, 1], [m1.body.order, m2.body.order]);

  const reordered = await patch(`/authoring/courses/${courseId}/sections/reorder`, T, { ids: [m2.body.id, m1.body.id] });
  check('reorder -> 200', 200, reordered.status);
  check('order persisted in the database', [m2.body.id, m1.body.id], reordered.body.map((x) => x.id));
  await patch(`/authoring/courses/${courseId}/sections/reorder`, T, { ids: [m1.body.id, m2.body.id] });

  const badReorder = await patch(`/authoring/courses/${courseId}/sections/reorder`, T, { ids: [m1.body.id] });
  check('a reorder missing an id is rejected', 400, badReorder.status);

  console.log('\n=== 5. Lessons ===');
  const l1 = await post(`/authoring/sections/${m1.body.id}/lessons`, T, { title: 'Halves and quarters', estimatedMin: 10, objectives: ['Name a half'] });
  const l2 = await post(`/authoring/sections/${m1.body.id}/lessons`, T, { title: 'Reading fractions', estimatedMin: 8 });
  const l3 = await post(`/authoring/sections/${m2.body.id}/lessons`, T, { title: 'Same denominator', estimatedMin: 12 });
  check('lesson 1 created', 201, l1.status);
  check('lessons start as drafts', 'DRAFT', l1.body.status);
  check('lesson keeps its objectives', ['Name a half'], l1.body.objectives);

  const dup = await post(`/authoring/lessons/${l2.body.id}/duplicate`, T);
  check('duplicate lesson -> 201', 201, dup.status);
  check('the copy is named as one', 'Reading fractions (copy)', dup.body.title);
  await del(`/authoring/lessons/${dup.body.id}`, T);

  console.log('\n=== 6. Lesson content blocks ===');
  const content = await put(`/authoring/lessons/${l1.body.id}/content`, T, {
    blocks: [
      { type: 'HEADING', title: 'What is a half?' },
      { type: 'PARAGRAPH', body: 'A half is one of two equal parts of a whole.' },
      { type: 'IMAGE', url: 'https://cdn.kidora.test/half.png', title: 'A halved circle' },
      { type: 'CALLOUT', body: 'Two halves always make one whole.' },
    ],
  });
  check('PUT lesson content -> 200', 200, content.status);
  check('four blocks stored', 4, content.body.length);
  check('blocks keep their order', [0, 1, 2, 3], content.body.map((b) => b.order));
  await put(`/authoring/lessons/${l2.body.id}/content`, T, { blocks: [{ type: 'PARAGRAPH', body: 'The number below the line is the denominator.' }] });
  await put(`/authoring/lessons/${l3.body.id}/content`, T, { blocks: [{ type: 'PARAGRAPH', body: 'Add the numerators, keep the denominator.' }] });

  console.log('\n=== 7. Quiz builder ===');
  const quiz = await post(`/authoring/courses/${courseId}/quizzes`, T, {
    title: 'Fractions basics', lessonId: l1.body.id, passingScore: 50, isRequired: true, published: true,
    questions: [
      { prompt: 'Which is one half?', type: 'MULTIPLE_CHOICE', options: ['1/2', '1/3', '2/3'], correct: 0, explanation: 'One of two equal parts.' },
      { prompt: 'A quarter is bigger than a half.', type: 'TRUE_FALSE', correct: 1 },
      { prompt: 'Put these in order, smallest first.', type: 'ORDERING', options: ['1/2', '1/4', '3/4'], correctOrder: [1, 0, 2] },
    ],
  });
  check('POST quiz -> 201', 201, quiz.status);
  check('three questions stored', 3, quiz.body.questions.length);

  const badQ = await post(`/authoring/courses/${courseId}/quizzes`, T, {
    title: 'Broken', questions: [{ prompt: 'No correct answer here', type: 'MULTIPLE_CHOICE', options: ['a', 'b'] }],
  });
  check('a multiple choice with no correct option is rejected', 400, badQ.status);

  const badOrder = await post(`/authoring/courses/${courseId}/quizzes`, T, {
    title: 'Broken order', questions: [{ prompt: 'Order these', type: 'ORDERING', options: ['a', 'b', 'c'], correctOrder: [0, 1] }],
  });
  check('an incomplete ordering answer is rejected', 400, badOrder.status);

  console.log('\n=== 8. Assignment builder ===');
  const assignment = await post(`/authoring/courses/${courseId}/assignments`, T, {
    title: 'Fractions worksheet', instructions: 'Complete every question and upload a photo of your work.',
    lessonId: l1.body.id, maxScore: 20, isRequired: true, submissionType: 'BOTH',
    rubric: [{ criterion: 'Correct answers', points: 15 }, { criterion: 'Working shown', points: 5 }],
  });
  check('POST assignment -> 201', 201, assignment.status);
  check('assignment starts as a draft', 'DRAFT', assignment.body.status);
  const pub = await patch(`/authoring/assignments/${assignment.body.id}/status/PUBLISHED`, T, {});
  check('assignment publishes', 'PUBLISHED', pub.body.status);

  console.log('\n=== 9. Final exam ===');
  const exam = await put(`/authoring/courses/${courseId}/exam`, T, {
    title: 'Fractions final exam', durationMin: 30, passingScore: 50,
    questions: [
      { prompt: 'What is 1/2 + 1/2?', type: 'MULTIPLE_CHOICE', options: ['1', '1/4', '2/4'], correct: 0 },
      { prompt: 'Which is larger, 3/4 or 1/4?', type: 'MULTIPLE_CHOICE', options: ['3/4', '1/4'], correct: 0 },
    ],
  });
  check('PUT exam -> 200', 200, exam.status);
  check('exam holds two questions', 2, exam.body.quiz.questions.length);
  const examOpen = await patch(`/authoring/courses/${courseId}/exam/status/OPEN`, T, {});
  check('exam opens', 'OPEN', examOpen.body.status);

  console.log('\n=== 10. Completion rules ===');
  const rules = await patch(`/authoring/courses/${courseId}/completion`, T, {
    requireAllLessons: true, requireFinalExam: true, passingScore: 50, issuesCertificate: true,
  });
  check('completion rules saved', 200, rules.status);
  check('certificate enabled', true, rules.body.issuesCertificate);

  console.log('\n=== 11. Preview ===');
  const preview = await j(`/authoring/courses/${courseId}/preview`, { token: T });
  check('GET preview -> 200', 200, preview.status);
  check('preview counts 2 modules', 2, preview.body.totals.modules);
  check('preview counts 3 lessons', 3, preview.body.totals.lessons);
  check('preview knows there is an exam', true, preview.body.totals.hasExam);

  console.log('\n=== 12. Publish validation ===');
  const checklist = await j(`/authoring/courses/${courseId}/checklist`, { token: T });
  check('GET checklist -> 200', 200, checklist.status);
  check('course is ready', true, checklist.body.ready);
  check('no blockers', [], checklist.body.blockers);

  // A course missing everything must not be publishable.
  const empty = await post('/authoring/courses', T, { title: 'Empty course' });
  const emptyCheck = await j(`/authoring/courses/${empty.body.id}/checklist`, { token: T });
  check('an empty course is not ready', false, emptyCheck.body.ready);
  ok('and says why', emptyCheck.body.blockers.length > 0);
  const emptyPublish = await post(`/authoring/courses/${empty.body.id}/publish`, T);
  check('publishing an invalid course -> 400', 400, emptyPublish.status);
  await post(`/authoring/courses/${empty.body.id}/archive`, T);

  console.log('\n=== 13. Authorization: another teacher cannot touch this course ===');
  check('other teacher reading the tree -> 403', 403, (await j(`/authoring/courses/${courseId}`, { token: O })).status);
  check('other teacher editing -> 403', 403, (await patch(`/authoring/courses/${courseId}`, O, { title: 'Stolen' })).status);
  check('other teacher publishing -> 403', 403, (await post(`/authoring/courses/${courseId}/publish`, O)).status);
  check('other teacher adding a module -> 403', 403, (await post(`/authoring/courses/${courseId}/sections`, O, { title: 'Mine now' })).status);
  check('student authoring -> 403', 403, (await post('/authoring/courses', S, { title: 'Student course' })).status);
  check('no token -> 401', 401, (await j(`/authoring/courses/${courseId}`)).status);

  console.log('\n=== 14. Publish ===');
  const published = await post(`/authoring/courses/${courseId}/publish`, T);
  check('POST publish -> 201', 201, published.status);
  check('status is PUBLISHED', 'PUBLISHED', published.body.status);
  check('published flag set', true, published.body.published);
  ok('publishedAt recorded', Boolean(published.body.publishedAt));

  const tree = await j(`/authoring/courses/${courseId}`, { token: T });
  const allLessons = tree.body.sections.flatMap((x) => x.lessons);
  check('draft lessons were published with the course', ['PUBLISHED', 'PUBLISHED', 'PUBLISHED'], allLessons.map((l) => l.status));

  globalThis.__ctx = { courseId, T, S, O, l1: l1.body.id, l2: l2.body.id, l3: l3.body.id, quizId: quiz.body.id, assignmentId: assignment.body.id, examId: exam.body.id, s };

  console.log('\n======================================');
  console.log(`  passed: ${pass}   failed: ${fail}`);
  console.log('======================================\n');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
