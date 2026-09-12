/**
 * The course studio driven through the real browser: create, the seven steps,
 * the three-column curriculum builder, the add-content modal, a real upload,
 * the video editor's timestamp questions, and publish.
 */
const { chromium } = require('/home/user/kidora/kidora-web/node_modules/playwright-core');
const API = 'http://localhost:4000/api';
const WEB = 'http://localhost:3000';
let pass = 0, fail = 0;
const check = (l, cond, extra = '') => {
  if (cond) { console.log(`  PASS  ${l}`); pass++; }
  else { console.log(`  FAIL  ${l}${extra ? `\n        ${extra}` : ''}`); fail++; }
};
const reg = async (p) => (await (await fetch(`${API}/auth/register`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p),
})).json());

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

(async () => {
  const s = Date.now();
  const teacher = { name: 'Studio UI Teacher', email: `sui.${s}@k.test`, password: 'Password123', role: 'TEACHER', subject: 'Mathematics' };
  await reg(teacher);

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404 \(Not Found\)/.test(m.text())) errors.push(m.text()); });
  // A bare "400 (Bad Request)" in the console says nothing about which call
  // failed, so record the request and its body too.
  const failed = [];
  page.on('response', async (r) => {
    if (r.status() < 400 || !/\/api\//.test(r.url())) return;
    const body = await r.text().catch(() => '');
    failed.push(`${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')} :: ${body.slice(0, 300)}`);
  });

  const text = () => page.evaluate(() => document.body.innerText);

  await page.goto(`${WEB}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  await page.fill('input[type="email"]', teacher.email);
  await page.fill('input[type="password"]', teacher.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/teacher\//, { timeout: 30000 });

  console.log('\n=== Create a course ===');
  // The old URL must still land somewhere useful.
  await page.goto(`${WEB}/dashboard/teacher/create-course`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  check('the old create-course URL redirects to the new one', /\/teacher\/courses\/new/.test(page.url()), page.url());

  await page.goto(`${WEB}/teacher/courses/new`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // One set of chrome, not two: /dashboard has its own Navbar+Sidebar layout,
  // and a page there that also rendered TeacherShell stacked them. Count the
  // shells, not the links: one DashboardLayout legitimately renders the nav
  // three times (desktop aside, mobile drawer, bottom bar), so a doubled shell
  // shows up as two bottom bars / four asides, not as two links.
  const chrome = await page.evaluate(() => ({
    shells: document.querySelectorAll('nav[aria-label="Quick navigation"]').length,
    sidebars: document.querySelectorAll('nav[aria-label="Main"]').length,
    oldSidebar: document.querySelectorAll('aside a[href="/dashboard"]').length,
  }));
  check('the page draws one sidebar, not two', chrome.shells === 1 && chrome.sidebars === 2 && chrome.oldSidebar === 0,
    `${chrome.shells} bottom bars, ${chrome.sidebars} sidebar navs, ${chrome.oldSidebar} legacy links`);
  await page.fill('input#f-course-title', 'Introduction to Python');
  const subjects = await page.$$eval('select#f-subject option', (os) => os.map((o) => o.value).filter(Boolean));
  await page.selectOption('select#f-subject', subjects[0]);
  await page.click('button:has-text("Create draft and continue")');
  await page.waitForURL(/\/teacher\/courses\/.+\/build/, { timeout: 20000 });
  const courseId = page.url().match(/courses\/([^/]+)\/build/)[1];
  check('the studio opened for the new course', Boolean(courseId));

  console.log('\n=== Seven steps ===');
  await page.waitForSelector('nav[aria-label="Course studio steps"] button', { timeout: 20000 });
  const steps = await page.$$eval('nav[aria-label="Course studio steps"] button', (bs) => bs.map((b) => b.textContent.trim().replace(/^\d+/, '')));
  check('there are exactly seven steps', steps.length === 7, `saw ${steps.length}: ${steps.join(' | ')}`);
  check('named Basics, Learning Outcomes, Modules, Content, Assessment, Preview, Publish',
    ['Basics', 'Learning Outcomes', 'Modules', 'Content', 'Assessment', 'Preview', 'Publish']
      .every((n) => steps.some((x) => x.includes(n))),
    steps.join(' | '));

  console.log('\n=== Step 1 Basics ===');
  await page.fill('textarea#f-short-description', 'Learn Python from scratch and build real projects, designed for young learners.');
  await page.selectOption('select#f-course-level', 'EASY');
  await page.fill('input#f-estimated-duration', '12');
  await page.fill('input#f-age-range', '9-12');
  await page.waitForTimeout(600);
  check('the short description counts characters against 500', /\/500/.test(await text()));

  // The overview panel is a live read of the form, not a static mock.
  const overview = await text();
  check('the overview panel reflects what was typed',
    /Course Overview/.test(overview) && /Beginner Level/.test(overview) && /12 hours/.test(overview),
    overview.slice(0, 200));

  const thumbInput = await page.$('input[type="file"][aria-label="Course thumbnail file"]');
  check('the thumbnail is a real file picker', Boolean(thumbInput));
  if (thumbInput) {
    await thumbInput.setInputFiles({ name: 'python.png', mimeType: 'image/png', buffer: PNG });
    await page.waitForTimeout(4000);
    check('the thumbnail uploaded', /python\.png/.test(await text()));
  }

  // Save Draft must really save: reload and the values have to come back.
  await page.click('button:has-text("Save Draft")');
  await page.waitForTimeout(2500);
  check('Save Draft confirms', /Draft saved/.test(await text()));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const afterReload = await page.$eval('textarea#f-short-description', (t) => t.value).catch(() => '');
  check('the draft survived a reload', /Learn Python from scratch/.test(afterReload), afterReload.slice(0, 80));

  console.log('\n=== Step 2 Learning Outcomes ===');
  await page.click('nav[aria-label="Course studio steps"] button:has-text("Learning Outcomes")');
  await page.waitForTimeout(1500);
  await page.fill('textarea#f-about-this-course', 'A complete introduction to Python for beginners, taught week by week with videos, readings and quizzes.');
  await page.fill('input[aria-label="New learning objective"]', 'Understand Python fundamentals');
  await page.click('button:has-text("Add")');
  await page.waitForTimeout(1200);
  await page.fill('input[aria-label="New learning objective"]', 'Write basic Python programs');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  const outcomesText = await text();
  check('both objectives are listed', /Understand Python fundamentals/.test(outcomesText) && /Write basic Python programs/.test(outcomesText));
  check('the objectives show in the overview panel under What You\u2019ll Learn',
    /What You.{1,3}ll Learn/.test(outcomesText));

  await page.fill('input[aria-label="Add to Prerequisites"]', 'Can read simple English');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);
  check('a prerequisite is recorded', /Can read simple English/.test(await text()));
  await page.waitForTimeout(2000); // autosave

  console.log('\n=== Step 3 Modules: the three columns ===');
  await page.click('nav[aria-label="Course studio steps"] button:has-text("Modules")');
  await page.waitForTimeout(1500);
  check('the curriculum tree is present', Boolean(await page.$('nav[aria-label="Course curriculum"]')));

  await page.click('button:has-text("Add module")');
  await page.waitForTimeout(400);
  await page.fill('input[aria-label="New module title"]', 'Python Fundamentals');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);
  check('the module appears in the tree', /Python Fundamentals/.test(await text()));

  const addLesson = await page.$('nav[aria-label="Course curriculum"] button:has-text("Add lesson")');
  check('the tree offers Add lesson', Boolean(addLesson));
  if (addLesson) {
    await addLesson.click();
    await page.waitForTimeout(300);
    await page.fill('input[aria-label="New lesson in Python Fundamentals"]', 'Variables and Data Types');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2500);
    check('the lesson appears', /Variables and Data Types/.test(await text()));
  }

  check('the settings column is present', Boolean(await page.$('input[aria-label="Lesson title"], textarea#f-description, [aria-label="Module title"]'))
    || /Lesson settings|Module settings/.test(await text()));

  console.log('\n=== Add content: tiles, not a dropdown ===');
  const addContent = await page.$('button:has-text("Add content"), button:has-text("Add learning material")');
  check('there is an add-content button', Boolean(addContent));
  if (addContent) {
    await addContent.click();
    await page.waitForTimeout(700);
    const modal = await page.$('[aria-labelledby="add-content-title"]');
    check('a modal opens', Boolean(modal));
    const tiles = await page.$$eval('[aria-labelledby="add-content-title"] button', (bs) => bs.map((b) => b.textContent.trim()));
    check('it offers Video, Reading, Quiz, Assignment and Peer review',
      ['Video', 'Reading', 'Quiz', 'Assignment', 'Peer review'].every((t) => tiles.some((x) => x.includes(t))),
      tiles.join(' | '));

    await page.click('[aria-labelledby="add-content-title"] button:has-text("Reading")');
    await page.waitForTimeout(1200);
    const readingText = await text();
    check('the reading editor opens with a formatting toolbar',
      Boolean(await page.$('button[aria-label="Bold"]')) && Boolean(await page.$('button[aria-label="Heading 1"]')),
      readingText.slice(0, 200));

    await page.fill('textarea[aria-label="Reading content"]', '# Python Variables\n\nA variable stores information your program can use later.');
    await page.waitForTimeout(2500);
    check('the reading saved', /Saved|Saving/.test(await text()));
  }

  console.log('\n=== Video editor with timestamp questions ===');
  const addAgain = await page.$('button:has-text("Add content")');
  if (addAgain) {
    await addAgain.click();
    await page.waitForTimeout(600);
    await page.click('[aria-labelledby="add-content-title"] button:has-text("Video")');
    await page.waitForTimeout(1200);
    check('the video editor shows a transcript panel', /Transcript/.test(await text()));
    const addQ = await page.$('button:has-text("Add a question")');
    check('and can add an in-video question', Boolean(addQ));
    if (addQ) {
      await addQ.click();
      await page.waitForTimeout(600);
      await page.fill('input[aria-label="Question 1"]', 'What does a variable do?');
      await page.fill('input[aria-label="Question 1 option 1"]', 'Stores a value');
      await page.fill('input[aria-label="Question 1 option 2"]', 'Prints text');
      await page.waitForTimeout(2500);
      check('the question saved', /Saved|Saving/.test(await text()));
    }
  }

  console.log('\n=== Assessment step ===');
  await page.click('nav[aria-label="Course studio steps"] button:has-text("Assessment")');
  await page.waitForTimeout(1500);
  const assessText = await text();
  check('it offers quizzes, assignments, exams and completion',
    ['Quizzes', 'Assignments', 'Exams', 'Completion'].every((t) => assessText.includes(t)), assessText.slice(0, 200));

  await page.click('button:has-text("Exams")');
  await page.waitForTimeout(1200);
  check('exams list the course final and each module',
    /Course final exam/.test(await text()) && /Python Fundamentals/.test(await text()));

  console.log('\n=== Step 6 Preview, inside the wizard ===');
  await page.click('nav[aria-label="Course studio steps"] button:has-text("Preview")');
  await page.waitForTimeout(2500);
  const stepPreview = await text();
  check('the preview step shows the course as a student sees it',
    /Preview as a student/.test(stepPreview) && /Introduction to Python/.test(stepPreview),
    stepPreview.slice(0, 200));
  check('with the objectives and the module', /Understand Python fundamentals/.test(stepPreview) && /Python Fundamentals/.test(stepPreview));
  check('and the prerequisite entered on step 2', /Can read simple English/.test(stepPreview));
  check('the Start Learning button is inert in preview',
    await page.$eval('button:has-text("Start Learning")', (b) => b.disabled).catch(() => false));

  console.log('\n=== Publish ===');
  await page.click('nav[aria-label="Course studio steps"] button:has-text("Publish")');
  await page.waitForTimeout(2000);
  const pubText = await text();
  check('the readiness list shows counts', /Modules/.test(pubText) && /Lessons/.test(pubText));
  check('and the learning objectives count', /Learning objectives/.test(pubText));
  check('visibility options are offered', /Published to Kidora/.test(pubText) && /My school only/.test(pubText));

  const publishBtn = await page.$('button:has-text("Publish course")');
  check('a publish button is present', Boolean(publishBtn));
  if (publishBtn && !(await publishBtn.isDisabled())) {
    await publishBtn.click();
    await page.waitForTimeout(600);
    check('it asks for confirmation rather than publishing at once', /Publish this course\?/.test(await text()));
    await page.click('button:has-text("Yes, publish")');
    await page.waitForTimeout(3000);
    const after = await text();
    check('the course reports as published', /This course is published/.test(after), after.slice(0, 250));
    check('and the version history appears', /v1/.test(after));
  } else {
    check('publish is enabled once ready', false, 'button was disabled');
  }

  console.log('\n=== Courses dashboard tabs ===');
  await page.goto(`${WEB}/teacher/courses`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const coursesText = await text();
  check('Drafts, Published and Archived tabs are offered',
    /Drafts/.test(coursesText) && /Published/.test(coursesText) && /Archived/.test(coursesText));
  check('the new course is listed', /Introduction to Python/.test(coursesText));

  console.log('\n=== Preview ===');
  await page.goto(`${WEB}/teacher/courses/${courseId}/preview`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const prevText = await text();
  check('the preview shows the course as a student sees it',
    /Introduction to Python/.test(prevText) && /What you.{0,3}ll learn/.test(prevText), prevText.slice(0, 250));
  check('with the module listed', /Python Fundamentals/.test(prevText));

  console.log('\n=== Mobile ===');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${WEB}/teacher/courses/${courseId}/build`, { waitUntil: 'domcontentloaded' });
  // Wait for the layout to settle rather than a fixed pause: measuring
  // mid-hydration reports an overflow that is gone a frame later.
  await page.waitForSelector('nav[aria-label="Course studio steps"]', { timeout: 20000 });
  await page.waitForTimeout(2500);
  const mobile = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const offenders = [];
    document.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1) offenders.push(`${el.tagName}.${(el.className || '').toString().slice(0, 60)}`);
    });
    return { overflow: document.documentElement.scrollWidth - vw, offenders: offenders.slice(0, 4) };
  });
  check('the studio fits a phone', mobile.overflow <= 2, `overflow ${mobile.overflow}px — ${mobile.offenders.join(', ') || 'no element found'}`);

  console.log('\n=== Console ===');
  check('no uncaught page errors', errors.length === 0,
    [...errors.slice(0, 5), ...failed.slice(0, 5)].join('\n        '));

  await browser.close();
  console.log('\n======================================');
  console.log(`  passed: ${pass}   failed: ${fail}`);
  console.log('======================================\n');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
