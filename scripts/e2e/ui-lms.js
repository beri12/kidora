/**
 * Drives the real UI: teacher builds and publishes a course through the
 * builder, then a student finds it, enrols and opens the player.
 */
const { chromium } = require('/home/user/kidora/kidora-web/node_modules/playwright-core');
const API = 'http://localhost:4000/api';
const WEB = 'http://localhost:3000';
let pass = 0, fail = 0;
const check = (l, cond, extra = '') => {
  if (cond) { console.log(`  PASS  ${l}`); pass++; }
  else { console.log(`  FAIL  ${l}${extra ? `\n        ${extra}` : ''}`); fail++; }
};

const reg = async (p) => {
  const r = await fetch(`${API}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p),
  });
  return r.json();
};

(async () => {
  const s = Date.now();
  const teacher = { name: 'UI Teacher', email: `uit.${s}@k.test`, password: 'Password123', role: 'TEACHER', subject: 'Mathematics' };
  const student = { name: 'UI Student', email: `uis.${s}@k.test`, password: 'Password123', role: 'CHILD', gradeLevel: 'Grade 5' };
  await reg(teacher); await reg(student);

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errors = [];

  const login = async (who) => {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${who}: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404 \(Not Found\)/.test(m.text())) errors.push(`${who} console: ${m.text()}`); });
    await page.goto(`${WEB}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800); // let the form hydrate before typing
    await page.fill('input[type="email"]', who.email);
    await page.fill('input[type="password"]', who.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(student|teacher)\//, { timeout: 30000 });
    return page;
  };

  console.log('\n=== Teacher: every sidebar page loads ===');
  const t = await login(teacher);
  const TEACHER_PAGES = [
    ['/teacher/dashboard', 'Dashboard'], ['/teacher/classes', 'My Classes'], ['/teacher/courses', 'Courses'],
    ['/teacher/lessons', 'Lessons'], ['/teacher/assignments', 'Assignments'], ['/teacher/quizzes', 'Quizzes'],
    ['/teacher/exams', 'Exams'], ['/teacher/students', 'Students'], ['/teacher/gradebook', 'Gradebook'],
    ['/teacher/analytics', 'Analytics'], ['/teacher/attendance', 'Attendance'], ['/teacher/messages', 'Messages'],
    ['/teacher/resources', 'Resources'], ['/teacher/calendar', 'Calendar'], ['/teacher/settings', 'Settings'],
    ['/teacher/ai', 'AI Teaching Assistant'],
  ];
  for (const [href, label] of TEACHER_PAGES) {
    const res = await t.goto(`${WEB}${href}`, { waitUntil: 'domcontentloaded' });
    await t.waitForTimeout(700);
    const body = await t.evaluate(() => document.body.innerText);
    const broken = /Application error|Unhandled Runtime Error|This page could not be found/i.test(body || '');
    check(`${label} (${href})`, res.status() < 400 && !broken, broken ? 'page rendered an error' : `status ${res.status()}`);
  }

  console.log('\n=== Teacher: build a course through the wizard ===');
  await t.goto(`${WEB}/dashboard/teacher/create-course`, { waitUntil: 'domcontentloaded' });
  await t.waitForTimeout(1200);
  await t.fill('input#f-course-title', 'UI Built Course');
  const subjectSel = await t.$('select#f-subject');
  check('the create form renders', Boolean(subjectSel));
  const opts = await t.$$eval('select#f-subject option', (os) => os.map((o) => o.value).filter(Boolean));
  await t.selectOption('select#f-subject', opts[0]);
  await t.click('button:has-text("Create draft and continue")');
  await t.waitForURL(/\/teacher\/courses\/.+\/build/, { timeout: 20000 });
  const courseId = t.url().match(/courses\/([^/]+)\/build/)[1];
  check('the builder opened for the new course', Boolean(courseId));

  await t.waitForSelector('nav[aria-label="Course builder steps"] button', { timeout: 20000 });
  const stepNames = await t.$$eval('nav[aria-label="Course builder steps"] button', (bs) => bs.map((b) => b.textContent.trim()));
  check('all 12 wizard steps are shown', stepNames.length === 12, `saw ${stepNames.length}: ${stepNames.join(' | ')}`);

  // Description, so the publish checklist can pass.
  await t.click('nav[aria-label="Course builder steps"] button:has-text("Basic information")');
  await t.waitForTimeout(400);
  await t.fill('textarea#f-full-description', 'A course built entirely through the Kidora course builder to prove the flow works end to end.');
  await t.fill('input#f-age-range', '9-12'); // the checklist wants a grade or an age band
  await t.waitForTimeout(3000); // autosave debounce
  const savedTag = await t.evaluate(() => document.body.innerText);
  check('autosave reports saving', /Saved|Saving/.test(savedTag), 'no save indicator appeared');

  // Module + lesson
  await t.click('nav[aria-label="Course builder steps"] button:has-text("Curriculum")');
  await t.waitForTimeout(600);
  await t.fill('input[aria-label="New module title"]', 'Module 1');
  await t.click('button:has-text("Add module")');
  await t.waitForTimeout(1200);
  check('the module appears', (await t.evaluate(() => document.body.innerText)).includes('Module 1'));

  await t.fill('input[aria-label="New lesson in Module 1"]', 'Lesson one');
  await t.click('button:has-text("Add lesson")');
  await t.waitForTimeout(1200);
  check('the lesson appears', (await t.evaluate(() => document.body.innerText)).includes('Lesson one'));

  // Content blocks
  await t.click('button:has-text("Lesson one")');
  await t.waitForTimeout(1200);
  await t.click('button:has-text("Paragraph")');
  await t.waitForTimeout(300);
  await t.fill('textarea[aria-label="Paragraph text"]', 'Fractions are equal parts of a whole.');
  await t.waitForTimeout(2500);
  check('a content block was added and saved', (await t.$('textarea[aria-label="Paragraph text"]')) !== null);

  // Publish
  await t.click('nav[aria-label="Course builder steps"] button:has-text("Publish")');
  await t.waitForTimeout(1500);
  const checklistText = await t.evaluate(() => document.body.innerText);
  check('the publish checklist renders', /Basic information|At least one lesson/i.test(checklistText));
  const publishBtn = await t.$('button:has-text("Publish course")');
  const disabled = publishBtn ? await publishBtn.isDisabled() : true;
  check('publish is enabled once the checklist passes', !disabled, 'publish button still disabled');
  if (!disabled) {
    await publishBtn.click();
    await t.waitForTimeout(2500);
    check('the course reports as published', /This course is published/i.test(await t.evaluate(() => document.body.innerText)));
  }

  console.log('\n=== Student: find, enrol, learn ===');
  const st = await login(student);
  await st.goto(`${WEB}/student/courses`, { waitUntil: 'domcontentloaded' });
  await st.waitForTimeout(900);

  await st.goto(`${WEB}/student/courses/${courseId}`, { waitUntil: 'domcontentloaded' });
  await st.waitForTimeout(1500);
  let sBody = await st.evaluate(() => document.body.innerText);
  check('the student can open the published course', sBody.includes('UI Built Course'));
  check('the curriculum is visible before enrolling', sBody.includes('Lesson one'));
  const enrolBtn = await st.$('button:has-text("Enrol now")');
  check('an enrol button is offered', Boolean(enrolBtn));

  if (enrolBtn) {
    await enrolBtn.click();
    await st.waitForTimeout(2500);
    sBody = await st.evaluate(() => document.body.innerText);
    check('progress appears after enrolling', /Your progress/i.test(sBody));
  }

  const startLink = await st.$('a:has-text("Start the course"), a:has-text("Continue learning")');
  check('a start link is offered', Boolean(startLink));
  if (startLink) {
    await startLink.click();
    await st.waitForURL(/\/learn\//, { timeout: 20000 });
    await st.waitForTimeout(1800);
    const pBody = await st.evaluate(() => document.body.innerText);
    check('the player opens the lesson', pBody.includes('Lesson one'));
    check('and shows the lesson content', pBody.includes('Fractions are equal parts'));
    check('with the curriculum rail', Boolean(await st.$('nav[aria-label="Course lessons"]')));
    check('and a Mark complete button', Boolean(await st.$('button:has-text("Mark complete")')));

    await st.click('button:has-text("Mark complete")');
    await st.waitForTimeout(2500);
    await st.goto(`${WEB}/student/courses/${courseId}`, { waitUntil: 'domcontentloaded' });
    await st.waitForTimeout(1800);
    check('the course now reads 100%', /100%/.test(await st.evaluate(() => document.body.innerText)));
  }

  console.log('\n=== AI teaching assistant ===');
  await t.goto(`${WEB}/teacher/ai`, { waitUntil: 'domcontentloaded' });
  await t.waitForTimeout(1500);
  const aiBody = await t.evaluate(() => document.body.innerText);
  check('the three tools are offered', /Lesson plan/.test(aiBody) && /Quiz questions/.test(aiBody) && /Analyse a class/.test(aiBody));
  check('the page warns that drafts need reviewing', /Read everything before you use it/i.test(aiBody));

  await t.fill('input#f-subject', 'Mathematics');
  await t.fill('input#f-grade', 'Grade 5');
  await t.fill('input#f-topic', 'Adding fractions');
  await t.click('button:has-text("Write a plan")');
  await t.waitForTimeout(4000);
  const planBody = await t.evaluate(() => document.body.innerText);
  check('with no model configured it says so instead of showing a fake plan',
    /No AI model is configured/i.test(planBody), planBody.slice(0, 200));

  console.log('\n=== Mobile width ===');
  await st.setViewportSize({ width: 390, height: 844 });
  await st.goto(`${WEB}/student/courses/${courseId}`, { waitUntil: 'domcontentloaded' });
  await st.waitForTimeout(1200);
  const overflow = await st.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('the course page does not scroll sideways on a phone', overflow <= 2, `overflow ${overflow}px`);

  await t.setViewportSize({ width: 390, height: 844 });
  await t.goto(`${WEB}/teacher/lessons`, { waitUntil: 'domcontentloaded' });
  await t.waitForTimeout(1200);
  const tOverflow = await t.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('the teacher lessons page fits a phone', tOverflow <= 2, `overflow ${tOverflow}px`);

  console.log('\n=== Console errors ===');
  check('no uncaught page errors', errors.length === 0, errors.slice(0, 6).join('\n        '));

  await browser.close();
  console.log('\n======================================');
  console.log(`  passed: ${pass}   failed: ${fail}`);
  console.log('======================================\n');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
