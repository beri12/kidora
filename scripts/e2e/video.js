/**
 * Videos end to end, over the real API: presign, upload the bytes, complete,
 * processing, several videos in one lesson, reordering, deletion, ownership,
 * then the student side — streaming, progress, resume and completion.
 */
const API = process.env.API_URL || 'http://localhost:4000/api';
let pass = 0, fail = 0;
const check = (label, cond, extra = '') => {
  if (cond) { console.log(`  PASS  ${label}`); pass++; }
  else { console.log(`  FAIL  ${label}${extra ? `\n        ${extra}` : ''}`); fail++; }
};

const j = async (path, opts = {}) => {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...opts.headers,
    },
  });
  let body = null;
  try { body = await res.json(); } catch { /* empty body */ }
  return { status: res.status, body };
};
const reg = async (p) => (await j('/auth/register', { method: 'POST', body: JSON.stringify(p) })).body;
const msg = (r) => {
  const m = r.body?.error?.message ?? r.body?.message;
  return Array.isArray(m) ? m[0] : m ?? '';
};

/** Bytes that stand in for a video. Nothing server-side parses the container. */
const fakeVideo = (mb = 1) => Buffer.alloc(Math.round(mb * 1024 * 100), 7);

async function putBytes(ticket, buf, token) {
  const res = await fetch(ticket.uploadUrl, {
    method: 'PUT',
    headers: { ...ticket.headers, ...(ticket.direct ? {} : { Authorization: `Bearer ${token}` }) },
    body: buf,
  });
  let body = null;
  try { body = await res.json(); } catch { /* storage returns no body */ }
  return { status: res.status, body };
}

const stamp = Date.now();

(async () => {
  console.log('\n=== Teacher creates a course, a module and a lesson ===');
  const teacher = await reg({ name: 'Video Teacher', email: `vt.${stamp}@k.test`, password: 'Password123', role: 'TEACHER', subject: 'Programming' });
  const other = await reg({ name: 'Other Teacher', email: `vo.${stamp}@k.test`, password: 'Password123', role: 'TEACHER', subject: 'Programming' });
  const student = await reg({ name: 'Video Student', email: `vs.${stamp}@k.test`, password: 'Password123', role: 'CHILD' });
  const T = teacher.accessToken, O = other.accessToken, S = student.accessToken;

  const filters = await j('/learning/browse/filters', { token: T });
  const subjectSlug = filters.body?.subjects?.[0]?.slug;
  check('a subject is available to file the course under', Boolean(subjectSlug));

  const created = await j('/authoring/courses', {
    method: 'POST', token: T,
    body: JSON.stringify({ title: 'Introduction to Python', subjectSlug, shortDescription: 'Learn Python from scratch.' }),
  });
  const courseId = created.body?.id;
  check('the teacher creates a course', created.status === 201 || created.status === 200, `${created.status} ${msg(created)}`);

  const section = await j(`/authoring/courses/${courseId}/sections`, {
    method: 'POST', token: T, body: JSON.stringify({ title: 'Python Basics', weekNumber: 1 }),
  });
  const sectionId = section.body?.id;
  check('the teacher creates a module', Boolean(sectionId), `${section.status} ${msg(section)}`);

  const lesson = await j(`/authoring/sections/${sectionId}/lessons`, {
    method: 'POST', token: T, body: JSON.stringify({ title: 'Getting Started', estimatedMin: 10 }),
  });
  const lessonId = lesson.body?.id;
  check('the teacher creates a lesson', Boolean(lessonId), `${lesson.status} ${msg(lesson)}`);

  console.log('\n=== File validation, on the server ===');
  const badType = await j('/uploads/presign', {
    method: 'POST', token: T,
    body: JSON.stringify({ courseId, lessonId, fileName: 'notes.txt', fileSizeBytes: 1000, mimeType: 'text/plain' }),
  });
  check('an unsupported format is refused', badType.status === 400, `${badType.status} ${msg(badType)}`);
  check('and says which formats are allowed', /MP4, MOV, or WEBM/i.test(msg(badType)), msg(badType));

  const tooBig = await j('/uploads/presign', {
    method: 'POST', token: T,
    body: JSON.stringify({ courseId, lessonId, fileName: 'huge.mp4', fileSizeBytes: 5 * 1024 * 1024 * 1024, mimeType: 'video/mp4' }),
  });
  check('a file over the configured limit is refused', tooBig.status === 413, `${tooBig.status} ${msg(tooBig)}`);

  const empty = await j('/uploads/presign', {
    method: 'POST', token: T,
    body: JSON.stringify({ courseId, lessonId, fileName: 'empty.mp4', fileSizeBytes: 0, mimeType: 'video/mp4' }),
  });
  check('an empty file is refused', empty.status === 400, `${empty.status} ${msg(empty)}`);

  console.log('\n=== Ownership ===');
  const foreign = await j('/uploads/presign', {
    method: 'POST', token: O,
    body: JSON.stringify({ courseId, lessonId, fileName: 'sneaky.mp4', fileSizeBytes: 1024, mimeType: 'video/mp4' }),
  });
  check("another teacher cannot upload into this course", foreign.status === 403, `${foreign.status} ${msg(foreign)}`);
  check('and is told why', /permission/i.test(msg(foreign)), msg(foreign));

  const studentPresign = await j('/uploads/presign', {
    method: 'POST', token: S,
    body: JSON.stringify({ courseId, lessonId, fileName: 'sneaky.mp4', fileSizeBytes: 1024, mimeType: 'video/mp4' }),
  });
  check('a student cannot ask for an upload URL at all', studentPresign.status === 403, `${studentPresign.status}`);

  console.log('\n=== Three videos into one lesson ===');
  const names = ['01-what-is-python.mp4', '02-python-history.mp4', '03-installing-python.mp4'];
  const videos = [];
  for (const [i, fileName] of names.entries()) {
    const buf = fakeVideo(1);
    const ticket = await j('/uploads/presign', {
      method: 'POST', token: T,
      body: JSON.stringify({ courseId, lessonId, fileName, fileSizeBytes: buf.length, mimeType: 'video/mp4' }),
    });
    check(`presign ${i + 1}/3 issues an upload target`, ticket.status === 201 || ticket.status === 200, `${ticket.status} ${msg(ticket)}`);
    if (i === 0) {
      check('the ticket carries a session and a URL', Boolean(ticket.body?.sessionId && ticket.body?.uploadUrl));
      check('and the key is server-generated, not the filename', !String(ticket.body?.storageKey ?? '').includes(fileName), ticket.body?.storageKey);
    }

    const put = await putBytes(ticket.body, buf, T);
    check(`the bytes of ${i + 1}/3 reach storage`, put.status >= 200 && put.status < 300, `${put.status}`);

    const done = await j('/uploads/complete', {
      method: 'POST', token: T,
      body: JSON.stringify({ sessionId: ticket.body.sessionId, title: fileName.replace(/\.mp4$/, ''), durationSeconds: 90 + i * 30 }),
    });
    check(`completing ${i + 1}/3 creates the item and the video`, Boolean(done.body?.video?.id && done.body?.contentItem?.id), `${done.status} ${msg(done)}`);
    if (done.body?.video) videos.push({ ...done.body.video, itemId: done.body.contentItem.id });
  }
  check('all three videos exist', videos.length === 3, `got ${videos.length}`);

  console.log('\n=== Processing status ===');
  let status = null;
  for (let i = 0; i < 25; i++) {
    status = await j(`/uploads/videos/${videos[0].id}/status`, { token: T });
    if (['READY', 'FAILED'].includes(status.body?.processingStatus)) break;
    await new Promise((r) => setTimeout(r, 400));
  }
  check('processing finishes and reports READY', status.body?.processingStatus === 'READY', JSON.stringify(status.body));
  check('the duration the browser measured is kept', status.body?.durationSeconds === 90, String(status.body?.durationSeconds));
  check('a playback URL is set', Boolean(status.body?.url), String(status.body?.url));

  console.log('\n=== Duplicate prevention ===');
  const firstAgain = await j('/uploads/presign', {
    method: 'POST', token: T,
    body: JSON.stringify({ courseId, lessonId, fileName: 'dup.mp4', fileSizeBytes: 4242, mimeType: 'video/mp4' }),
  });
  const dupAgain = await j('/uploads/presign', {
    method: 'POST', token: T,
    body: JSON.stringify({ courseId, lessonId, fileName: 'dup.mp4', fileSizeBytes: 4242, mimeType: 'video/mp4' }),
  });
  check('re-picking the same file resumes the same session',
    dupAgain.body?.sessionId === firstAgain.body?.sessionId && dupAgain.body?.resumed === true,
    `${firstAgain.body?.sessionId} vs ${dupAgain.body?.sessionId}`);

  console.log('\n=== A cancelled upload can be retried ===');
  const aborted = await j(`/uploads/sessions/${firstAgain.body.sessionId}/abort`, { method: 'POST', token: T });
  check('an upload can be abandoned', aborted.status === 200 || aborted.status === 201, `${aborted.status}`);
  const retryTicket = await j('/uploads/presign', {
    method: 'POST', token: T,
    body: JSON.stringify({ courseId, lessonId, fileName: 'dup.mp4', fileSizeBytes: 4242, mimeType: 'video/mp4' }),
  });
  const retryBuf = fakeVideo(0.5);
  const retryPut = await putBytes(retryTicket.body, retryBuf, T);
  check('and retried to completion', retryPut.status >= 200 && retryPut.status < 300, `${retryPut.status}`);
  const retryDone = await j('/uploads/complete', {
    method: 'POST', token: T,
    body: JSON.stringify({ sessionId: retryTicket.body.sessionId, title: 'Retried clip', durationSeconds: 20 }),
  });
  check('the retried upload becomes an item', Boolean(retryDone.body?.video?.id), `${retryDone.status} ${msg(retryDone)}`);
  const retriedVideoId = retryDone.body?.video?.id;

  console.log('\n=== The lesson holds every video ===');
  let tree = await j(`/authoring/courses/${courseId}`, { token: T });
  const items = tree.body?.sections?.[0]?.lessons?.[0]?.contents ?? [];
  check('the lesson has four video items', items.filter((c) => c.type === 'VIDEO').length === 4, `saw ${items.length} items`);
  check('each carries its own video', items.filter((c) => c.video?.id).length === 4);

  console.log('\n=== Autosaving the lesson must not destroy the videos ===');
  // This is what the old delete-and-recreate save did: the video and every
  // student's place in it cascaded away on the teacher's next keystroke.
  const resaved = await j(`/authoring/lessons/${lessonId}/content`, {
    method: 'PUT', token: T,
    body: JSON.stringify({
      blocks: items.map((c) => ({
        id: c.id, type: c.type, title: c.title, body: c.body ?? '', url: c.url ?? '',
        estimatedMin: c.estimatedMin, isRequired: c.isRequired, status: c.status,
        durationSeconds: c.durationSeconds,
      })),
    }),
  });
  check('the save succeeds', resaved.status === 200, `${resaved.status} ${msg(resaved)}`);
  const afterSave = await j(`/uploads/videos/${videos[0].id}/status`, { token: T });
  check('the video survives the save', afterSave.status === 200 && afterSave.body?.processingStatus === 'READY', `${afterSave.status}`);
  check('and keeps its item id', afterSave.body?.contentItemId === videos[0].itemId);

  console.log('\n=== Editing a video’s metadata ===');
  const edited = await j(`/uploads/videos/${videos[0].id}`, {
    method: 'PATCH', token: T,
    body: JSON.stringify({ title: 'What is Python?', description: 'Why Python is a good first language.', allowDownload: false, isRequired: true }),
  });
  check('the teacher can edit the title and settings', edited.status === 200, `${edited.status} ${msg(edited)}`);
  const foreignEdit = await j(`/uploads/videos/${videos[0].id}`, {
    method: 'PATCH', token: O, body: JSON.stringify({ title: 'Hijacked' }),
  });
  check("another teacher cannot edit this video", foreignEdit.status === 403 || foreignEdit.status === 404, `${foreignEdit.status}`);

  console.log('\n=== Reordering the videos ===');
  const ids = items.map((c) => c.id);
  const rotated = [ids[2], ids[0], ids[1], ids[3]];
  const reorder = await j(`/authoring/lessons/${lessonId}/content/reorder`, {
    method: 'PATCH', token: T, body: JSON.stringify({ ids: rotated }),
  });
  check('the new order is accepted', reorder.status === 200, `${reorder.status} ${msg(reorder)}`);
  tree = await j(`/authoring/courses/${courseId}`, { token: T });
  const reordered = (tree.body?.sections?.[0]?.lessons?.[0]?.contents ?? []).map((c) => c.id);
  check('and persisted', JSON.stringify(reordered) === JSON.stringify(rotated), reordered.join(','));

  const foreignReorder = await j(`/authoring/lessons/${lessonId}/content/reorder`, {
    method: 'PATCH', token: O, body: JSON.stringify({ ids: rotated }),
  });
  check("another teacher cannot reorder this lesson", foreignReorder.status === 403 || foreignReorder.status === 404, `${foreignReorder.status}`);

  console.log('\n=== Deleting a video ===');
  const foreignDelete = await j(`/uploads/videos/${retriedVideoId}`, { method: 'DELETE', token: O });
  check("another teacher cannot delete this video", foreignDelete.status === 403 || foreignDelete.status === 404, `${foreignDelete.status}`);
  const deleted = await j(`/uploads/videos/${retriedVideoId}`, { method: 'DELETE', token: T });
  check('the owner can delete it', deleted.status === 200, `${deleted.status} ${msg(deleted)}`);
  const gone = await j(`/uploads/videos/${retriedVideoId}/status`, { token: T });
  check('and it is gone', gone.status === 404, `${gone.status}`);

  console.log('\n=== A draft course is invisible to students ===');
  const draftPeek = await j(`/learning/courses/${courseId}`, { token: S });
  check('a student cannot open an unpublished course', draftPeek.status === 403 || draftPeek.status === 404, `${draftPeek.status}`);

  console.log('\n=== Publishing ===');
  await j(`/authoring/courses/${courseId}`, {
    method: 'PATCH', token: T,
    body: JSON.stringify({
      description: 'A complete introduction to Python for beginners, taught week by week with videos and quizzes.',
      ageBand: '9-12', estimatedMinutes: 120,
    }),
  });
  await j(`/authoring/courses/${courseId}/outcomes`, {
    method: 'POST', token: T, body: JSON.stringify({ text: 'Write basic Python programs' }),
  });
  const published = await j(`/authoring/courses/${courseId}/publish`, { method: 'POST', token: T, body: JSON.stringify({}) });
  check('the course publishes', published.status === 200 || published.status === 201, `${published.status} ${msg(published)}`);

  console.log('\n=== The student side ===');
  const enrolled = await j(`/learning/courses/${courseId}/enroll`, { method: 'POST', token: S, body: JSON.stringify({}) });
  check('the student can enrol', enrolled.status === 200 || enrolled.status === 201, `${enrolled.status} ${msg(enrolled)}`);

  const player = await j(`/learning/courses/${courseId}/lessons/${lessonId}`, { token: S });
  check('the student can open the lesson', player.status === 200, `${player.status} ${msg(player)}`);
  const playerVideos = (player.body?.lesson?.contents ?? []).filter((c) => c.type === 'VIDEO');
  check('every video is streamable to the student', playerVideos.length === 3, `saw ${playerVideos.length}`);
  check('with a URL and a duration', playerVideos.every((v) => v.video?.url && v.video?.durationSeconds > 0));

  const first = playerVideos.find((v) => v.video.durationSeconds === 90);
  console.log('\n=== Progress, resume and completion ===');
  const part = await j(`/learning/content/${first.id}/progress`, {
    method: 'POST', token: S, body: JSON.stringify({ positionSec: 30, watchedDeltaSec: 30, durationSeconds: 90 }),
  });
  check('progress is recorded', part.status === 200 || part.status === 201, `${part.status} ${msg(part)}`);
  check('and is not complete after a third of the video', part.body?.completed === false, JSON.stringify(part.body));

  const resumeCheck = await j(`/learning/courses/${courseId}/lessons/${lessonId}`, { token: S });
  const resumeItem = (resumeCheck.body?.lesson?.contents ?? []).find((c) => c.id === first.id);
  check('the position comes back for resume', resumeItem?.progress?.[0]?.lastPositionSec === 30, JSON.stringify(resumeItem?.progress));

  const seekToEnd = await j(`/learning/content/${first.id}/progress`, {
    method: 'POST', token: S, body: JSON.stringify({ positionSec: 89, watchedDeltaSec: 0, durationSeconds: 90 }),
  });
  check('seeking to the end completes nothing', seekToEnd.body?.completed === false, JSON.stringify(seekToEnd.body));

  const inflated = await j(`/learning/content/${first.id}/progress`, {
    method: 'POST', token: S, body: JSON.stringify({ positionSec: 89, watchedDeltaSec: 100000, durationSeconds: 90 }),
  });
  check('a claim of far more watching than time has passed is clamped', inflated.body?.completed === false, JSON.stringify(inflated.body));

  // Genuine viewing, reported over several calls with real time between them.
  let done = null;
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 1100));
    done = await j(`/learning/content/${first.id}/progress`, {
      method: 'POST', token: S, body: JSON.stringify({ positionSec: 40 + i * 5, watchedDeltaSec: 6, durationSeconds: 90 }),
    });
    if (done.body?.completed) break;
  }
  check('watching enough of it completes the video', done?.body?.completed === true, JSON.stringify(done?.body));
  check('the threshold comes from configuration', typeof done?.body?.completionPercent === 'number', String(done?.body?.completionPercent));

  console.log('\n=== A reading completes by being read ===');
  const readingSave = await j(`/authoring/lessons/${lessonId}/content`, { method: 'PUT', token: T, body: JSON.stringify({ blocks: [] }) });
  check('the teacher can empty a lesson deliberately', readingSave.status === 200, `${readingSave.status}`);
  const afterEmpty = await j(`/uploads/videos/${videos[0].id}/status`, { token: T });
  check('and that does remove the videos it was told to remove', afterEmpty.status === 404, `${afterEmpty.status}`);

  console.log('\n=== Another student cannot report progress on a course they are not in ===');
  const stranger = await reg({ name: 'Stranger', email: `vx.${stamp}@k.test`, password: 'Password123', role: 'CHILD' });
  const strangerProgress = await j(`/learning/content/${first.id}/progress`, {
    method: 'POST', token: stranger.accessToken, body: JSON.stringify({ positionSec: 10, watchedDeltaSec: 10 }),
  });
  check('progress from a non-enrolled student is refused', [403, 404].includes(strangerProgress.status), `${strangerProgress.status}`);

  console.log('\n======================================');
  console.log(`  passed: ${pass}   failed: ${fail}`);
  console.log('======================================\n');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
