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

  // A cleared picker posts "", which is a valid string but not a valid id.
  const blanked = await patch(`/authoring/courses/${courseId}`, T, { gradeId: '', language: '', thumbnailUrl: '' });
  check('clearing a grade picker does not blow up on the foreign key', 200, blanked.status);
  check('the grade is cleared, not set to an empty id', null, blanked.body.gradeId);
  check('and a cleared URL becomes null', null, blanked.body.thumbnailUrl);
  await patch(`/authoring/courses/${courseId}`, T, { thumbnailUrl: 'https://cdn.kidora.test/frac.png' });

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

  const matchQuiz = await post(`/authoring/courses/${courseId}/quizzes`, T, {
    title: 'Match the fraction', lessonId: l2.body.id, published: true, passingScore: 50,
    questions: [{
      prompt: 'Match each fraction to its picture.', type: 'MATCHING',
      pairs: [{ left: '1/2', right: 'Half a circle' }, { left: '1/4', right: 'A quarter circle' }, { left: '3/4', right: 'Three quarter circles' }],
    }],
  });
  check('a matching question is accepted', 201, matchQuiz.status);
  const badMatch = await post(`/authoring/courses/${courseId}/quizzes`, T, {
    title: 'Broken match', questions: [{ prompt: 'Match', type: 'MATCHING', pairs: [{ left: 'a', right: '' }, { left: 'b', right: 'c' }] }],
  });
  check('a pair with an empty side is rejected', 400, badMatch.status);

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

  console.log('\n=== 15. Student browses the catalogue ===');
  const browse = await j('/learning/browse?pageSize=50', { token: S });
  check('GET /learning/browse -> 200', 200, browse.status);
  const found = browse.body.items.find((c) => c.id === courseId);
  ok('the published course is listed', Boolean(found), 'course missing from browse');
  check('it carries the course id', courseId, found?.id);
  check('not enrolled yet', false, found?.enrolled);
  check('lesson count is real', 3, found?.totalLessons);
  ok('teacher is named', Boolean(found?.teacher?.name));

  const search = await j(`/learning/browse?search=Fractions&pageSize=50`, { token: S });
  ok('search finds it', search.body.items.some((c) => c.id === courseId));
  const wrongSubject = await j('/learning/browse?search=zzzznothing', { token: S });
  check('a search with no matches returns an empty page', 0, wrongSubject.body.items.length);

  const filters = await j('/learning/browse/filters', { token: S });
  check('GET filters -> 200', 200, filters.status);
  ok('filters offer subjects', filters.body.subjects.length > 0);

  console.log('\n=== 16. Course detail before enrolling ===');
  const detailBefore = await j(`/learning/courses/${courseId}`, { token: S });
  check('GET course detail -> 200', 200, detailBefore.status);
  check('not enrolled', false, detailBefore.body.enrolled);
  check('curriculum is visible to help them decide', 2, detailBefore.body.sections.length);
  check('but every lesson is locked', [true, true, true], detailBefore.body.sections.flatMap((x) => x.lessons).map((l) => l.locked));
  check('the player refuses before enrolment', 403, (await j(`/learning/courses/${courseId}/lessons/${l1.body.id}`, { token: S })).status);

  check('the course access rule is still readable alongside the decision', 'FREE', detailBefore.body.access);
  check('and the access decision is its own field', true, detailBefore.body.accessDecision.allowed);

  console.log('\n=== 17. Enrol ===');
  const enrolled = await post(`/learning/courses/${courseId}/enroll`, S);
  check('POST enroll -> 201', 201, enrolled.status);
  check('enrollment is ACTIVE', 'ACTIVE', enrolled.body.status);
  ok('starts on the first lesson', Boolean(enrolled.body.lastLessonId));
  const again = await post(`/learning/courses/${courseId}/enroll`, S);
  check('enrolling twice is idempotent', enrolled.body.id, again.body.id);

  const mine = await j('/learning/my-courses', { token: S });
  check('the course is now in My Courses', true, mine.body.some((c) => c.id === courseId));
  check('with the right lesson total', 3, mine.body.find((c) => c.id === courseId).totalLessons);

  console.log('\n=== 18. The learning player ===');
  const player = await j(`/learning/courses/${courseId}/lessons/${l1.body.id}`, { token: S });
  check('GET player -> 200', 200, player.status);
  check('lesson content is delivered', 4, player.body.lesson.contents.length);
  check('curriculum rail lists every lesson', 3, player.body.curriculum.length);
  check('no previous lesson on the first', null, player.body.nav.previous);
  check('next points at lesson 2', l2.body.id, player.body.nav.next?.id);
  ok('the lesson quiz is attached', Boolean(player.body.lesson.quiz));

  const foreignLesson = await j(`/learning/courses/${courseId}/lessons/${empty.body.id}`, { token: S });
  check('a lesson id from another course -> 404', 404, foreignLesson.status);

  console.log('\n=== 19. Progress autosave ===');
  await post(`/learning/lessons/${l1.body.id}/progress`, S, { percent: 40, timeSpentSec: 30 });
  const back = await post(`/learning/lessons/${l1.body.id}/progress`, S, { percent: 10, timeSpentSec: 5 });
  check('percent never moves backwards', 40, back.body.percent);
  check('time spent accumulates', 35, back.body.timeSpentSec);

  console.log('\n=== 20. Completing lessons ===');
  const done1 = await post(`/learning/lessons/${l1.body.id}/complete`, S);
  check('POST complete -> 201', 201, done1.status);
  check('1 of 3 lessons done', 1, done1.body.completion.lessonsCompleted);
  check('progress is 33%', 33, done1.body.completion.percent);
  check('course is not complete yet', false, done1.body.completion.complete);
  ok('and it says what is left', done1.body.completion.unmet.length > 0);

  const twice = await post(`/learning/lessons/${l1.body.id}/complete`, S);
  check('completing twice does not double-count', 1, twice.body.completion.lessonsCompleted);

  await post(`/learning/lessons/${l2.body.id}/complete`, S);
  const done3 = await post(`/learning/lessons/${l3.body.id}/complete`, S);
  check('all 3 lessons done', 3, done3.body.completion.lessonsCompleted);
  check('lesson progress is 100%', 100, done3.body.completion.percent);
  check('but the course requires the exam, so it is NOT complete', false, done3.body.completion.complete);
  check('and the exam is named as the blocker', ['Pass the final exam.'], done3.body.completion.unmet);
  check('no certificate yet', null, done3.body.certificate);

  console.log('\n=== 21. Student takes the lesson quiz ===');
  const quizView = await j(`/lms/quizzes/${quiz.body.id}`, { token: S });
  check('GET quiz -> 200', 200, quizView.status);
  ok('the correct answers are not sent to the student',
    !JSON.stringify(quizView.body).includes('"correct"'),
    'quiz payload leaked the answer key');

  const attempt = await post(`/lms/quizzes/${quiz.body.id}/attempts`, S);
  check('start attempt -> 201', 201, attempt.status);
  const qs = quizView.body.questions;
  const submitted = await post(`/lms/attempts/${attempt.body.id}/submit`, S, {
    answers: [
      { questionId: qs[0].id, selected: [0] },
      { questionId: qs[1].id, selected: [1] },
      { questionId: qs[2].id, selected: [1, 0, 2] },
    ],
  });
  check('submit -> 201', 201, submitted.status);
  check('scored 100%', 100, submitted.body.percent);
  check('passed', true, submitted.body.passed);

  console.log('\n=== 21b. Matching question ===');
  const matchView = await j(`/lms/quizzes/${matchQuiz.body.id}`, { token: S });
  check('GET matching quiz -> 200', 200, matchView.status);
  const mq = matchView.body.questions[0];
  check('the student gets the left column', ['1/2', '1/4', '3/4'], mq.matchLefts);
  check('and all three right options', 3, mq.matchRights.length);
  ok('the stored pairing is not sent', mq.pairs === undefined, 'matching payload leaked the pairs');

  const matchAttempt = await post(`/lms/quizzes/${matchQuiz.body.id}/attempts`, S);
  const matchResult = await post(`/lms/attempts/${matchAttempt.body.id}/submit`, S, {
    answers: [{ questionId: mq.id, answerText: JSON.stringify(['Half a circle', 'A quarter circle', 'Three quarter circles']) }],
  });
  check('a correct matching answer scores 100%', 100, matchResult.body.percent);

  const matchAttempt2 = await post(`/lms/quizzes/${matchQuiz.body.id}/attempts`, S);
  const matchWrong = await post(`/lms/attempts/${matchAttempt2.body.id}/submit`, S, {
    answers: [{ questionId: mq.id, answerText: JSON.stringify(['A quarter circle', 'Half a circle', 'Three quarter circles']) }],
  });
  check('a wrong pairing scores 0%', 0, matchWrong.body.percent);

  console.log('\n=== 22. Student submits the assignment ===');
  const submission = await post(`/student/assignments/${assignment.body.id}/submit`, S, {
    content: 'I finished every question. My working is in the photo.',
  });
  check('POST submit -> 201', 201, submission.status);

  const studentAssignments = await j('/student/assignments', { token: S });
  const mineA = studentAssignments.body.find((a) => a.id === assignment.body.id);
  check('the student sees it as submitted', 'SUBMITTED', mineA?.status);

  console.log('\n=== 23. Teacher grades the assignment ===');
  const subs = await j(`/teacher/assignments/${assignment.body.id}/submissions`, { token: T });
  check('teacher sees the submission', 200, subs.status);
  const subId = (subs.body.items ?? subs.body)[0]?.id;
  ok('submission id found', Boolean(subId));
  const graded = await patch(`/teacher/submissions/${subId}/grade`, T, { score: 18, feedback: 'Neat working — well done.' });
  check('grade -> 200', 200, graded.status);

  const afterGrade = await j('/student/assignments', { token: S });
  const gradedA = afterGrade.body.find((a) => a.id === assignment.body.id);
  check('the student sees the grade', 18, gradedA?.score);
  check('and the feedback', 'Neat working — well done.', gradedA?.feedback);

  console.log('\n=== 24. Final exam completes the course ===');
  const examQuiz = await j(`/lms/quizzes/${exam.body.quizId}`, { token: S });
  check('GET exam quiz -> 200', 200, examQuiz.status);
  const examAttempt = await post(`/lms/exams/${exam.body.id}/attempts`, S);
  check('start exam -> 201', 201, examAttempt.status);
  const eqs = examQuiz.body.questions;
  const examResult = await post(`/lms/attempts/${examAttempt.body.id}/submit`, S, {
    answers: [{ questionId: eqs[0].id, selected: [0] }, { questionId: eqs[1].id, selected: [0] }],
  });
  check('exam submitted', 201, examResult.status);
  check('scored 100%', 100, examResult.body.percent);
  check('passed', true, examResult.body.passed);

  console.log('\n=== 25. Course completion and certificate ===');
  const finalProgress = await j(`/learning/courses/${courseId}/progress`, { token: S });
  check('GET progress -> 200', 200, finalProgress.status);
  check('the course is now complete', true, finalProgress.body.complete);
  check('nothing outstanding', [], finalProgress.body.unmet);
  check('enrollment is COMPLETED', 'COMPLETED', finalProgress.body.enrollment.status);
  ok('completedAt recorded', Boolean(finalProgress.body.enrollment.completedAt));

  const finalDetail = await j(`/learning/courses/${courseId}`, { token: S });
  ok('a certificate was issued', Boolean(finalDetail.body.certificate), 'no certificate on the course detail');
  const certCode = finalDetail.body.certificate?.code;
  ok('it has a verification code', Boolean(certCode));

  const verified = await j(`/lms/certificates/verify/${certCode}`);
  check('the certificate verifies publicly', 200, verified.status);
  check('and is valid', true, verified.body.valid);
  check('naming the student', 'LMS Student', verified.body.studentName);
  check('and the course', 'Fractions for Grade 5', verified.body.courseName);

  const certs = await j('/student/certificates', { token: S });
  ok('it appears in the student certificate list', certs.body.some((c) => c.code === certCode));

  console.log('\n=== 26. Student cannot reach what is not theirs ===');
  const other2 = await reg({ name: 'Nosy Kid', email: `nk.${s}@k.test`, password: 'Password123', role: 'CHILD', gradeLevel: 'Grade 5' });
  check('a non-enrolled student cannot open the player', 403, (await j(`/learning/courses/${courseId}/lessons/${l1.body.id}`, { token: other2.accessToken })).status);
  check('nor read course progress', 403, (await j(`/learning/courses/${courseId}/progress`, { token: other2.accessToken })).status);
  check('a teacher cannot use the student learning API', 403, (await j('/learning/browse', { token: T })).status);
  check('no token -> 401', 401, (await j('/learning/browse')).status);

  console.log('\n=== 27. The teacher sidebar pages that had no backend ===');
  const tLessons = await j('/teacher/lessons', { token: T });
  check('GET /teacher/lessons -> 200', 200, tLessons.status);
  check('lists the 3 lessons', 3, tLessons.body.items.length);
  ok('each says whether it has content', tLessons.body.items.every((l) => l.hasContent === true));
  ok('and which course it belongs to', tLessons.body.items.every((l) => l.course?.id === courseId));

  const tQuizzes = await j('/teacher/quizzes', { token: T });
  check('GET /teacher/quizzes -> 200', 200, tQuizzes.status);
  ok('the lesson quiz is listed', tQuizzes.body.items.some((z) => z.id === quiz.body.id));
  const listedQuiz = tQuizzes.body.items.find((z) => z.id === quiz.body.id);
  check('with its real attempt count', 1, listedQuiz.attemptCount);
  check('and the real average', 100, listedQuiz.averagePercent);
  ok('the final exam is excluded from the quiz list', !tQuizzes.body.items.some((z) => z.id === exam.body.quizId));

  const tExams = await j('/teacher/exams', { token: T });
  check('GET /teacher/exams -> 200', 200, tExams.status);
  const listedExam = tExams.body.items.find((x) => x.id === exam.body.id);
  ok('the exam is listed', Boolean(listedExam));
  check('with its question count', 2, listedExam.questionCount);
  check('and how many sat it', 1, listedExam.sat);
  check('and the pass rate', 100, listedExam.passRate);

  console.log('\n=== 28. Resource library ===');
  const res = await post('/teacher/resources', T, {
    name: 'Fractions worksheet.pdf', url: 'https://cdn.kidora.test/frac.pdf',
    description: 'Printable practice sheet.', mimeType: 'application/pdf', sizeBytes: 24000,
  });
  check('POST resource -> 201', 201, res.status);
  check('the kind is worked out from the file', 'document', res.body.kind);
  check('it starts unattached', null, res.body.lessonId);

  const attached = await patch(`/teacher/resources/${res.body.id}/attach`, T, { lessonId: l1.body.id });
  check('attach to a lesson -> 200', 200, attached.status);
  check('now attached', l1.body.id, attached.body.lessonId);
  check('and it picked up the course', courseId, attached.body.courseId);

  const playerWithRes = await j(`/learning/courses/${courseId}/lessons/${l1.body.id}`, { token: S });
  check('the student sees the resource on the lesson', 1, playerWithRes.body.lesson.resources.length);

  const resList = await j('/teacher/resources', { token: T });
  ok('it is in the library list', resList.body.items.some((r) => r.id === res.body.id));

  check('another teacher cannot attach it', 403, (await patch(`/teacher/resources/${res.body.id}/attach`, O, { lessonId: null })).status);
  check('nor delete it', 403, (await del(`/teacher/resources/${res.body.id}`, O)).status);
  check('a student cannot list teacher resources', 403, (await j('/teacher/resources', { token: S })).status);

  console.log('\n=== 29. Cross-teacher isolation on the library views ===');
  const otherLessons = await j('/teacher/lessons', { token: O });
  check('another teacher sees none of these lessons', 0, otherLessons.body.items.filter((l) => l.course?.id === courseId).length);
  const otherQuizzes = await j('/teacher/quizzes', { token: O });
  check('nor any of these quizzes', 0, otherQuizzes.body.items.filter((z) => z.id === quiz.body.id).length);

  console.log('\n=== 30. AI teaching assistant ===');
  const plan = await post('/ai/teaching/lesson-plan', T, { subject: 'Mathematics', grade: 'Grade 5', topic: 'Adding fractions' });
  check('POST lesson-plan -> 201', 201, plan.status);
  check('it is a lesson plan', 'lesson_plan', plan.body.type);
  ok('with no model configured it says so rather than inventing one',
    plan.body.degraded === true && plan.body.sections.length === 0,
    `degraded=${plan.body.degraded} sections=${plan.body.sections?.length}`);

  const qd = await post('/ai/teaching/quiz', T, { subject: 'Mathematics', grade: 'Grade 5', topic: 'Fractions', questionCount: 3 });
  check('POST quiz draft -> 201', 201, qd.status);
  check('no fabricated questions when degraded', [], qd.body.questions);

  const analysis = await post('/ai/teaching/analyse-class', T, { courseId });
  check('POST analyse-class -> 201', 201, analysis.status);
  check('it is a class analysis', 'class_analysis', analysis.body.type);
  ok('and no invented interventions', analysis.body.interventions.length === 0);

  console.log('\n=== 31. AI teaching authorization ===');
  check('a student cannot generate a lesson plan', 403, (await post('/ai/teaching/lesson-plan', S, { subject: 'x', grade: 'y', topic: 'z' })).status);
  check('a student cannot draft quiz questions', 403, (await post('/ai/teaching/quiz', S, { subject: 'x', grade: 'y', topic: 'z' })).status);
  check('a student cannot analyse a class', 403, (await post('/ai/teaching/analyse-class', S, { courseId })).status);
  check('another teacher cannot analyse this course', 403, (await post('/ai/teaching/analyse-class', O, { courseId })).status);
  check('an unknown course -> 404', 404, (await post('/ai/teaching/analyse-class', T, { courseId: 'does-not-exist' })).status);
  check('naming neither a class nor a course -> 400', 400, (await post('/ai/teaching/analyse-class', T, {})).status);
  check('no token -> 401', 401, (await post('/ai/teaching/lesson-plan', null, { subject: 'x', grade: 'y', topic: 'z' })).status);

  console.log('\n=== 32. Generated content cannot reach a student on its own ===');
  // There is deliberately no endpoint that writes AI output into a course.
  const writeAttempts = await Promise.all([
    post('/ai/teaching/publish', T, { courseId }),
    post('/ai/teaching/quiz/save', T, { courseId }),
    post('/ai/teaching/lesson-plan/save', T, { courseId }),
    post(`/ai/teaching/apply/${courseId}`, T, {}),
  ]);
  check('no save or publish route exists on the AI surface', [404, 404, 404, 404],
    writeAttempts.map((r) => r.status));

  // And generating against a course changes nothing about it.
  const before = await j(`/authoring/courses/${courseId}`, { token: T });
  await post('/ai/teaching/lesson-plan', T, { subject: 'Mathematics', grade: 'Grade 5', topic: 'Adding fractions' });
  await post('/ai/teaching/quiz', T, { subject: 'Mathematics', grade: 'Grade 5', topic: 'Fractions', questionCount: 3 });
  const afterAi = await j(`/authoring/courses/${courseId}`, { token: T });
  check('generating leaves the lesson count untouched',
    before.body.sections.flatMap((x) => x.lessons).length,
    afterAi.body.sections.flatMap((x) => x.lessons).length);
  check('and the quiz count untouched', before.body.quizzes.length, afterAi.body.quizzes.length);
  check('the course is still the 3 lessons the teacher wrote', 3,
    afterAi.body.sections.flatMap((x) => x.lessons).length);

  console.log('\n======================================');
  console.log(`  passed: ${pass}   failed: ${fail}`);
  console.log('======================================\n');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
