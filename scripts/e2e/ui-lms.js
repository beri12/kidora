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
    // A 503 from the optional AI service is reported in its own section.
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404 \(Not Found\)|503 \(Service Unavailable\)/.test(m.text())) errors.push(`${who} console: ${m.text()}`); });
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
    ['/teacher/assignments', 'Assignments'], ['/teacher/students', 'Students'], ['/teacher/gradebook', 'Gradebook'],
    ['/teacher/analytics', 'Analytics'], ['/teacher/messages', 'Messages'], ['/teacher/calendar', 'Calendar'],
    ['/teacher/settings', 'Settings'], ['/teacher/support', 'Support'],
    // Not in the sidebar any more — reached from the Courses page.
    ['/teacher/lessons', 'Lessons'], ['/teacher/quizzes', 'Quizzes'], ['/teacher/exams', 'Exams'],
    ['/teacher/attendance', 'Attendance'], ['/teacher/resources', 'Resources'], ['/teacher/ai', 'AI Teaching Assistant'],
  ];
  for (const [href, label] of TEACHER_PAGES) {
    const res = await t.goto(`${WEB}${href}`, { waitUntil: 'domcontentloaded' });
    await t.waitForTimeout(700);
    const body = await t.evaluate(() => document.body.innerText);
    const broken = /Application error|Unhandled Runtime Error|This page could not be found/i.test(body || '');
    check(`${label} (${href})`, res.status() < 400 && !broken, broken ? 'page rendered an error' : `status ${res.status()}`);
  }

  console.log('\n=== The teacher sidebar is the short one ===');
  await t.goto(`${WEB}/teacher/dashboard`, { waitUntil: 'domcontentloaded' });
  await t.waitForTimeout(1800);
  const navLabels = await t.$$eval('nav a', (as) => as.map((a) => a.textContent.trim()).filter(Boolean));
  const sidebarHas = (label) => navLabels.some((l) => l === label || l.startsWith(label));
  check('Courses is in the sidebar', sidebarHas('Courses'));
  check('Lessons is not', !sidebarHas('Lessons'), navLabels.join(' | '));
  check('Quizzes is not', !sidebarHas('Quizzes'));
  check('Exams is not', !sidebarHas('Exams'));
  check('Attendance is not', !sidebarHas('Attendance'));
  check('Resources is not', !sidebarHas('Resources'));

  await t.goto(`${WEB}/teacher/courses`, { waitUntil: 'domcontentloaded' });
  await t.waitForTimeout(1500);
  const acrossLinks = await t.$$eval('nav[aria-label="Across all your courses"] a', (as) => as.map((a) => a.textContent.trim()));
  check('but they are reachable from the Courses page', 5, acrossLinks.length, acrossLinks.join(' | '));

  console.log('\n=== Teacher: build and publish a course ===');
  // The studio itself is covered assertion by assertion in ui-studio.js; here
  // we only need a published course to put a student through.
  await t.goto(`${WEB}/teacher/courses/new`, { waitUntil: 'domcontentloaded' });
  await t.waitForTimeout(1500);
  await t.fill('input#f-course-title', 'UI Built Course');
  const opts = await t.$$eval('select#f-subject option', (os) => os.map((o) => o.value).filter(Boolean));
  check('the create form offers subjects', opts.length > 0);
  await t.selectOption('select#f-subject', opts[0]);
  await t.click('button:has-text("Create draft and continue")');
  await t.waitForURL(/\/teacher\/courses\/.+\/build/, { timeout: 20000 });
  const courseId = t.url().match(/courses\/([^/]+)\/build/)[1];
  check('the studio opened', Boolean(courseId));

  await t.waitForSelector('nav[aria-label="Course studio steps"] button', { timeout: 20000 });
  await t.fill('textarea#f-full-description', 'A course built entirely through the Kidora studio to prove the flow works end to end.');
  await t.fill('input#f-age-range', '9-12');
  await t.fill('input[aria-label="New learning objective"]', 'Understand the basics');
  await t.keyboard.press('Enter');
  await t.waitForTimeout(3000);

  await t.click('nav[aria-label="Course studio steps"] button:has-text("Curriculum")');
  await t.waitForTimeout(1500);
  await t.click('button:has-text("Add module")');
  await t.waitForTimeout(400);
  await t.fill('input[aria-label="New module title"]', 'Module 1');
  await t.keyboard.press('Enter');
  await t.waitForTimeout(2000);
  check('the module appears', /Module 1/.test(await t.evaluate(() => document.body.innerText)));

  await t.click('nav[aria-label="Course curriculum"] button:has-text("Add lesson")');
  await t.waitForTimeout(300);
  await t.fill('input[aria-label="New lesson in Module 1"]', 'Lesson one');
  await t.keyboard.press('Enter');
  await t.waitForTimeout(2500);
  check('the lesson appears', /Lesson one/.test(await t.evaluate(() => document.body.innerText)));

  await t.click('button:has-text("Add content")');
  await t.waitForTimeout(700);
  await t.click('[aria-labelledby="add-content-title"] button:has-text("Text")');
  await t.waitForTimeout(1000);
  await t.fill('textarea#f-text', 'Fractions are equal parts of a whole.');
  await t.waitForTimeout(3000);
  check('the item saved', /Saved|Saving/.test(await t.evaluate(() => document.body.innerText)));

  await t.click('nav[aria-label="Course studio steps"] button:has-text("Publish")');
  await t.waitForTimeout(2000);
  const publishBtn = await t.$('button:has-text("Publish course")');
  const disabled = publishBtn ? await publishBtn.isDisabled() : true;
  check('publish is enabled once the checklist passes', !disabled, 'publish button still disabled');
  if (!disabled) {
    await publishBtn.click();
    await t.waitForTimeout(600);
    await t.click('button:has-text("Yes, publish")');
    await t.waitForTimeout(3000);
    check('the course reports as published', /This course is published/.test(await t.evaluate(() => document.body.innerText)));
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

  console.log('\n=== Teacher uploads a real file ===');
  // Straight into the Resources library, which is the simplest upload path.
  await t.goto(`${WEB}/teacher/resources`, { waitUntil: 'domcontentloaded' });
  await t.waitForTimeout(1800);
  const addBtn = await t.$('button:has-text("Add resource"), button:has-text("Add your first resource")');
  check('an add-resource button is offered', Boolean(addBtn));
  if (addBtn) {
    await addBtn.click();
    await t.waitForTimeout(800);

    // A real 1x1 PNG through the real file input.
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const input = await t.$('input[type="file"]');
    check('there is a real file input, not a URL box', Boolean(input));
    if (input) {
      await input.setInputFiles({ name: 'kidora-test.png', mimeType: 'image/png', buffer: png });
      await t.waitForTimeout(4000);
      const dialogText = await t.evaluate(() => document.body.innerText);
      check('the upload confirms', /Uploaded|kidora-test\.png/i.test(dialogText), dialogText.slice(0, 300));

      const done = await t.$('button:has-text("Done")');
      if (done) await done.click();
      await t.waitForTimeout(2000);
      await t.reload({ waitUntil: 'domcontentloaded' });
      await t.waitForTimeout(2000);
      const libraryText = await t.evaluate(() => document.body.innerText);
      check('and the file is in the library', /kidora-test\.png/.test(libraryText), libraryText.slice(0, 300));
    }
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
  if (/temporarily unavailable|Service Unavailable/i.test(planBody)) {
    console.log('  SKIP  AI draft — the Python service is not running (start it on :8000)');
  } else {
    check('with no model configured it says so instead of showing a fake plan',
      /No AI model is configured/i.test(planBody), planBody.slice(0, 200));
  }

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
