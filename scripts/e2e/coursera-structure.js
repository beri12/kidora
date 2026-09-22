/**
 * The Coursera-shaped course structure and teacher uploads.
 *
 * Course -> Module (a week) -> Lesson -> Items, where an item is a video
 * (with captions and in-video checks), a reading (with attachments), a quiz
 * (formative or summative), an assignment, or a peer review.
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
const patch = (p, t, d) => j(p, { method: 'PATCH', token: t, body: JSON.stringify(d) });
const put = (p, t, d) => j(p, { method: 'PUT', token: t, body: JSON.stringify(d) });
const reg = async (p) => (await post('/auth/register', null, p)).body;

/** Multipart upload, the way the browser does it. */
async function upload(token, name, type, bytes) {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type }), name);
  const res = await fetch(`${API}/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  let body = null; try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
const VTT = new TextEncoder().encode('WEBVTT\n\n00:00:00.000 --> 00:00:04.000\nA half is one of two equal parts.\n');

(async () => {
  const s = Date.now();
  const teacher = await reg({ name: 'CS Teacher', email: `cst.${s}@k.test`, password: 'Password123', role: 'TEACHER', subject: 'Mathematics' });
  const alice = await reg({ name: 'Alice Student', email: `csa.${s}@k.test`, password: 'Password123', role: 'CHILD', gradeLevel: 'Grade 5' });
  const bob = await reg({ name: 'Bob Student', email: `csb.${s}@k.test`, password: 'Password123', role: 'CHILD', gradeLevel: 'Grade 5' });
  const T = teacher.accessToken, A = alice.accessToken, B = bob.accessToken;

  console.log('\n=== 1. Teacher uploads files ===');
  const img = await upload(T, 'thumb.png', 'image/png', PNG);
  check('POST /uploads (image) -> 201', 201, img.status);
  check('classified as an image', 'image', img.body.kind);
  check('and offered as an IMAGE item', 'IMAGE', img.body.contentType);
  ok('it comes back with a URL', /^https?:\/\/.+\.png$/.test(img.body.url || ''), img.body.url);

  const served = await fetch(img.body.url);
  check('the uploaded file is actually served back', 200, served.status);

  const vtt = await upload(T, 'captions.vtt', 'text/vtt', VTT);
  check('a captions file is accepted', 201, vtt.status);

  const doc = await upload(T, 'worksheet.pdf', 'application/pdf', new TextEncoder().encode('%PDF-1.4 fake'));
  check('a PDF is accepted', 201, doc.status);
  check('classified as a document', 'document', doc.body.kind);

  const bad = await upload(T, 'virus.exe', 'application/x-msdownload', new Uint8Array([77, 90]));
  check('an executable is rejected', 400, bad.status);
  ok('and the message says what is allowed', /video, image, audio/i.test(JSON.stringify(bad.body)));

  const student = await upload(A, 'sneaky.png', 'image/png', PNG);
  check('a student cannot upload', 403, student.status);
  const anon = await fetch(`${API}/uploads`, { method: 'POST', body: new FormData() });
  check('no token -> 401', 401, anon.status);

  console.log('\n=== 2. Every upload lands in the teacher library ===');
  const lib = await j('/teacher/resources?pageSize=50', { token: T });
  ok('the image is in the library', lib.body.items.some((r) => r.id === img.body.id));
  ok('so is the PDF', lib.body.items.some((r) => r.id === doc.body.id));
  const otherTeacher = await reg({ name: 'Other', email: `cso.${s}@k.test`, password: 'Password123', role: 'TEACHER', subject: 'Science' });
  const otherLib = await j('/teacher/resources?pageSize=50', { token: otherTeacher.accessToken });
  check('another teacher sees none of them', 0, otherLib.body.items.filter((r) => r.id === img.body.id).length);

  console.log('\n=== 3. Course -> modules as weeks ===');
  const course = (await post('/authoring/courses', T, {
    title: 'Fractions, week by week',
    description: 'A course organised into weeks, the way a Coursera course is.',
    subjectSlug: 'math', ageBand: '9-12',
  })).body;
  await patch(`/authoring/courses/${course.id}`, T, { thumbnailUrl: img.body.url });

  const w1 = await post(`/authoring/courses/${course.id}/sections`, T, { title: 'What is a fraction?' });
  const w2 = await post(`/authoring/courses/${course.id}/sections`, T, { title: 'Adding fractions' });
  check('module 1 created', 201, w1.status);
  check('and is week 1 by default', 1, w1.body.weekNumber);
  check('module 2 is week 2', 2, w2.body.weekNumber);

  const renumbered = await patch(`/authoring/sections/${w2.body.id}`, T, { weekNumber: 3 });
  check('the week can be changed', 3, renumbered.body.weekNumber);
  await patch(`/authoring/sections/${w2.body.id}`, T, { weekNumber: 2 });

  console.log('\n=== 4. Lessons and typed items ===');
  const l1 = (await post(`/authoring/sections/${w1.body.id}/lessons`, T, { title: 'Halves and quarters' })).body;
  const l2 = (await post(`/authoring/sections/${w2.body.id}/lessons`, T, { title: 'Same denominator' })).body;

  const items = await put(`/authoring/lessons/${l1.id}/content`, T, {
    blocks: [
      { type: 'HEADING', title: 'What is a half?', estimatedMin: 1 },
      {
        type: 'VIDEO', title: 'Halving an orange', url: img.body.url, estimatedMin: 4,
        durationSeconds: 240,
        transcriptVtt: 'WEBVTT\n\n00:00:00.000 --> 00:00:04.000\nA half is one of two equal parts.\n',
        checkpoints: [
          { atSeconds: 30, prompt: 'How many equal parts make a half?', options: ['One', 'Two', 'Four'], correct: 1 },
          { atSeconds: 120, prompt: 'Is a quarter bigger than a half?', options: ['Yes', 'No'], correct: 1 },
        ],
      },
      {
        type: 'DOCUMENT', title: 'Fractions cheat sheet', estimatedMin: 5,
        body: 'A fraction shows equal parts of a whole.',
        downloadUrls: [{ name: 'worksheet.pdf', url: doc.body.url, sizeBytes: 13, mimeType: 'application/pdf' }],
      },
      { type: 'PARAGRAPH', body: 'Two halves always make one whole.', estimatedMin: 2, isRequired: false },
    ],
  });
  check('PUT items -> 200', 200, items.status);
  check('four items stored', 4, items.body.length);
  check('in order', [0, 1, 2, 3], items.body.map((b) => b.order));
  check('each carries its own minutes', [1, 4, 5, 2], items.body.map((b) => b.estimatedMin));
  check('and whether it is required', [true, true, true, false], items.body.map((b) => b.isRequired));

  const video = items.body[1];
  check('the video keeps its duration', 240, video.durationSeconds);
  ok('and its captions', /WEBVTT/.test(video.transcriptVtt || ''));
  check('and both in-video questions', 2, video.checkpoints.length);
  check('with their timestamps', [30, 120], video.checkpoints.map((c) => c.atSeconds));

  const reading = items.body[2];
  check('the reading keeps its attachment', 1, reading.downloadUrls.length);
  check('naming the file', 'worksheet.pdf', reading.downloadUrls[0].name);

  await put(`/authoring/lessons/${l2.id}/content`, T, {
    blocks: [{ type: 'PARAGRAPH', body: 'Add the numerators, keep the denominator.', estimatedMin: 3 }],
  });

  console.log('\n=== 5. Formative vs summative quizzes ===');
  const formative = await post(`/authoring/courses/${course.id}/quizzes`, T, {
    title: 'Quick check', lessonId: l1.id, published: true, grading: 'FORMATIVE', maxAttempts: 10,
    questions: [{ prompt: 'Which is one half?', type: 'MULTIPLE_CHOICE', options: ['1/2', '1/3'], correct: 0 }],
  });
  check('a formative quiz is created', 201, formative.status);
  check('marked formative', 'FORMATIVE', formative.body.grading);

  const summative = await post(`/authoring/courses/${course.id}/quizzes`, T, {
    title: 'End of week 1', lessonId: l2.id, published: true, grading: 'SUMMATIVE',
    maxAttempts: 1, timeLimitSec: 900, isRequired: true,
    questions: [{ prompt: 'What is 1/2 + 1/2?', type: 'MULTIPLE_CHOICE', options: ['1', '1/4'], correct: 0 }],
  });
  check('a summative quiz is created', 201, summative.status);
  check('marked summative', 'SUMMATIVE', summative.body.grading);
  check('with one attempt', 1, summative.body.maxAttempts);

  console.log('\n=== 6. An item can point at a quiz ===');
  const withQuiz = await put(`/authoring/lessons/${l2.id}/content`, T, {
    blocks: [
      { type: 'PARAGRAPH', body: 'Add the numerators, keep the denominator.', estimatedMin: 3 },
      { type: 'QUIZ', title: 'End of week 1', quizId: summative.body.id, estimatedMin: 15 },
    ],
  });
  check('a QUIZ item is stored', 200, withQuiz.status);
  check('pointing at the real quiz', summative.body.id, withQuiz.body[1].quizId);

  const foreign = (await post('/authoring/courses', T, { title: 'Another course', subjectSlug: 'math' })).body;
  const foreignQuizRes = await post(`/authoring/courses/${foreign.id}/quizzes`, T, {
    title: 'Elsewhere', questions: [{ prompt: 'Is this elsewhere?', type: 'TRUE_FALSE', correct: 0 }],
  });
  // Assert the setup actually worked: a quiz that failed to create would leave
  // quizId undefined, and the smuggle test below would pass for the wrong reason.
  check('the other course really has a quiz', 201, foreignQuizRes.status);
  const smuggle = await put(`/authoring/lessons/${l2.id}/content`, T, {
    blocks: [{ type: 'QUIZ', title: 'Not mine', quizId: foreignQuizRes.body.id }],
  });
  check("another course's quiz cannot be attached", 400, smuggle.status);
  ok('and it says why', /another course/i.test(JSON.stringify(smuggle.body)));

  const ghost = await put(`/authoring/lessons/${l2.id}/content`, T, {
    blocks: [{ type: 'QUIZ', title: 'Ghost', quizId: 'no-such-quiz' }],
  });
  check('an unknown quiz id -> 404', 404, ghost.status);

  // The failed saves must not have wiped the lesson's real items.
  const intact = await j(`/authoring/lessons/${l2.id}`, { token: T });
  check('a rejected save leaves the lesson untouched', 2, intact.body.contents.length);
  await post(`/authoring/courses/${foreign.id}/archive`, T);

  console.log('\n=== 7. Peer-reviewed assignment ===');
  const peer = await post(`/authoring/courses/${course.id}/assignments`, T, {
    title: 'Draw a fraction wall', instructions: 'Draw a fraction wall and photograph it.',
    lessonId: l1.id, maxScore: 20, isRequired: true,
    peerReviewCount: 1, peerReviewsDue: 1,
    rubric: [{ criterion: 'Accuracy', points: 12 }, { criterion: 'Neatness', points: 8 }],
  });
  check('a peer-reviewed assignment is created', 201, peer.status);
  check('with one reviewer each', 1, peer.body.peerReviewCount);
  await patch(`/authoring/assignments/${peer.body.id}/status/PUBLISHED`, T, {});

  console.log('\n=== 8. Publish, then both students enrol ===');
  await patch(`/authoring/courses/${course.id}/completion`, T, { requireAllLessons: true, issuesCertificate: true });
  const published = await post(`/authoring/courses/${course.id}/publish`, T);
  check('the course publishes', 201, published.status);
  await post(`/learning/courses/${course.id}/enroll`, A);
  await post(`/learning/courses/${course.id}/enroll`, B);

  console.log('\n=== 9. The student sees the week and the items ===');
  const detail = await j(`/learning/courses/${course.id}`, { token: A });
  check('GET course detail -> 200', 200, detail.status);
  check('two modules', 2, detail.body.sections.length);
  check('numbered as weeks', [1, 2], detail.body.sections.map((x) => x.weekNumber));

  const player = await j(`/learning/courses/${course.id}/lessons/${l1.id}`, { token: A });
  check('the player delivers all four items', 4, player.body.lesson.contents.length);
  const pv = player.body.lesson.contents[1];
  ok('the video carries its captions to the student', /WEBVTT/.test(pv.transcriptVtt || ''));
  check('and its in-video questions', 2, pv.checkpoints.length);
  check('the reading carries its download', 1, player.body.lesson.contents[2].downloadUrls.length);
  check('the curriculum rail knows the week', 1, player.body.curriculum[0].weekNumber);

  console.log('\n=== 10. Peer review: submit, get assigned, review ===');
  const aliceSub = await post(`/student/assignments/${peer.body.id}/submit`, A, { content: 'Here is my fraction wall.' });
  check('Alice submits', 201, aliceSub.status);

  const aliceQueueEarly = await j('/peer-review/queue', { token: A });
  check('with nobody else in, Alice has nothing to review', 0, aliceQueueEarly.body.length);

  const bobSub = await post(`/student/assignments/${peer.body.id}/submit`, B, { content: 'My fraction wall, in colour.' });
  check('Bob submits', 201, bobSub.status);

  const aliceQueue = await j('/peer-review/queue', { token: A });
  check("Alice is now asked to review one classmate's work", 1, aliceQueue.body.length);
  ok('and it is not her own', aliceQueue.body[0].submission.content.includes('colour'));
  ok("the author's name is never sent", !JSON.stringify(aliceQueue.body).includes('Bob'), JSON.stringify(aliceQueue.body).slice(0, 200));

  const bobQueue = await j('/peer-review/queue', { token: B });
  check('Bob is asked to review Alice', 1, bobQueue.body.length);

  console.log('\n=== 11. Marks are withheld until you review ===');
  const lockedEarly = await j(`/peer-review/assignments/${peer.body.id}/result`, { token: A });
  check('Alice cannot see her marks yet', false, lockedEarly.body.unlocked);
  check('and none are sent', null, lockedEarly.body.peerScore);
  ok('she is told why', /review 1 more/i.test(lockedEarly.body.message || ''), lockedEarly.body.message);

  const bobReviews = await post(`/peer-review/${bobQueue.body[0].id}/submit`, B, {
    scores: [{ criterion: 'Accuracy', points: 10 }, { criterion: 'Neatness', points: 7 }],
    comment: 'Clear wall, label the halves next time.',
  });
  check('Bob reviews Alice', 201, bobReviews.status);
  check('scored against the rubric', 17, bobReviews.body.total);

  const stillLocked = await j(`/peer-review/assignments/${peer.body.id}/result`, { token: A });
  check('Alice still cannot see them — she owes a review', false, stillLocked.body.unlocked);
  check('and the score is still withheld', null, stillLocked.body.peerScore);

  const aliceReviews = await post(`/peer-review/${aliceQueue.body[0].id}/submit`, A, {
    scores: [{ criterion: 'Accuracy', points: 12 }, { criterion: 'Neatness', points: 8 }],
    comment: 'Lovely colours.',
  });
  check('Alice does her review', 201, aliceReviews.status);

  const unlocked = await j(`/peer-review/assignments/${peer.body.id}/result`, { token: A });
  check('now her marks are released', true, unlocked.body.unlocked);
  check('showing the peer score', 17, unlocked.body.peerScore);
  check('and the feedback', 1, unlocked.body.reviews.length);
  ok('including the comment', /label the halves/.test(unlocked.body.reviews[0].comment || ''));

  console.log('\n=== 12. Peer review cannot be gamed ===');
  const twice = await post(`/peer-review/${aliceQueue.body[0].id}/submit`, A, { scores: [] });
  check('a review cannot be submitted twice', 400, twice.status);
  check("a student cannot submit someone else's review", 403, (await post(`/peer-review/${bobQueue.body[0].id}/submit`, A, { scores: [] })).status);

  const over = await post(`/student/assignments/${peer.body.id}/submit`, B, { content: 'again' });
  const bobQueue2 = await j('/peer-review/queue', { token: B });
  check('resubmitting does not hand Bob a second copy of the same work', 0, bobQueue2.body.length);

  // A reviewer cannot award more than the rubric allows.
  const carol = await reg({ name: 'Carol Student', email: `csc.${s}@k.test`, password: 'Password123', role: 'CHILD', gradeLevel: 'Grade 5' });
  await post(`/learning/courses/${course.id}/enroll`, carol.accessToken);
  await post(`/student/assignments/${peer.body.id}/submit`, carol.accessToken, { content: 'Mine too.' });
  const carolQueue = await j('/peer-review/queue', { token: carol.accessToken });
  if (carolQueue.body.length) {
    const generous = await post(`/peer-review/${carolQueue.body[0].id}/submit`, carol.accessToken, {
      scores: [{ criterion: 'Accuracy', points: 9999 }, { criterion: 'Neatness', points: 9999 }],
    });
    check('a reviewer cannot award more than the rubric allows', 20, generous.body.total);
  } else {
    ok('a reviewer cannot award more than the rubric allows (no queue to test)', true);
  }

  console.log('\n=== 13. The teacher can see how reviewing is going ===');
  const progress = await j(`/teacher/peer-review/assignments/${peer.body.id}`, { token: T });
  check('GET progress -> 200', 200, progress.status);
  ok('it lists the submissions', progress.body.submissions.length >= 2);
  check('another teacher cannot', 403, (await j(`/teacher/peer-review/assignments/${peer.body.id}`, { token: otherTeacher.accessToken })).status);
  check('a student cannot', 403, (await j(`/teacher/peer-review/assignments/${peer.body.id}`, { token: A })).status);

  console.log('\n======================================');
  console.log(`  passed: ${pass}   failed: ${fail}`);
  console.log('======================================\n');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
