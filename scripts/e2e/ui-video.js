/**
 * Three videos uploaded into one lesson through the real browser.
 *
 * The API suite drives the same endpoints from Node, which does not enforce
 * CORS and never touches the queue UI. This is the only check that the
 * teacher's actual upload path works: the presigned PUT from a browser
 * origin, several transfers at once, and the items surviving the autosave
 * that follows.
 */
const { launchBrowser } = require('./browser');
const API = process.env.API_URL || 'http://localhost:4000/api';
const WEB = process.env.WEB_URL || 'http://localhost:3000';
let pass = 0, fail = 0;
const check = (l, c, extra = '') => { if (c) { console.log(`  PASS  ${l}`); pass++; } else { console.log(`  FAIL  ${l}${extra ? `\n        ${extra}` : ''}`); fail++; } };
const reg = async (p) => (await (await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) })).json());
const MP4 = Buffer.alloc(120000, 9);

(async () => {
  const s = Date.now();
  const t = { name: 'Vid UI Teacher', email: `vui.${s}@k.test`, password: 'Password123', role: 'TEACHER', subject: 'Programming' };
  await reg(t);
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const failed = [];
  page.on('response', async (r) => { if (r.status() >= 400 && /\/api\//.test(r.url())) failed.push(`${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')} :: ${(await r.text().catch(() => '')).slice(0, 200)}`); });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404 \(Not Found\)/.test(m.text())) errors.push(m.text()); });
  const text = () => page.evaluate(() => document.body.innerText);

  await page.goto(`${WEB}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.fill('input[type="email"]', t.email);
  await page.fill('input[type="password"]', t.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);

  await page.goto(`${WEB}/teacher/courses/new`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.fill('input#f-course-title', 'Introduction to Python');
  const subjects = await page.$$eval('select#f-subject option', (os) => os.map((o) => o.value).filter(Boolean));
  await page.selectOption('select#f-subject', subjects[0]);
  await page.click('button:has-text("Create draft and continue")');
  await page.waitForURL(/\/build/, { timeout: 20000 });
  await page.waitForTimeout(2500);

  // Module + lesson
  await page.click('nav[aria-label="Course studio steps"] button:has-text("Modules")');
  await page.waitForTimeout(1500);
  await page.click('button:has-text("Add module")');
  await page.waitForTimeout(400);
  await page.fill('input[aria-label="New module title"]', 'Python Basics');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2200);
  const addLesson = await page.$('nav[aria-label="Course curriculum"] button:has-text("Add lesson")');
  await addLesson.click();
  await page.waitForTimeout(400);
  await page.fill('input[aria-label="New lesson in Python Basics"]', 'Getting Started');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);

  console.log('\n=== Uploading three videos through the browser ===');
  await page.click('button:has-text("Add video")');
  await page.waitForTimeout(900);
  const picker = await page.$('input[aria-label="Choose videos to upload"]');
  check('the uploader takes several files', Boolean(picker) && await picker.evaluate((i) => i.multiple));

  await picker.setInputFiles([
    { name: '01-what-is-python.mp4', mimeType: 'video/mp4', buffer: MP4 },
    { name: '02-python-history.mp4', mimeType: 'video/mp4', buffer: MP4 },
    { name: '03-installing-python.mp4', mimeType: 'video/mp4', buffer: MP4 },
  ]);
  check('three files are queued', /3 |01-what-is-python/.test(await text()));

  // Wait for all three to reach Ready.
  let body = '';
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);
    body = await text();
    if ((body.match(/Video ready/g) ?? []).length >= 3) break;
  }
  check('all three report Video ready', (body.match(/Video ready/g) ?? []).length === 3, `saw ${(body.match(/Video ready/g) ?? []).length}`);

  await page.click('button:has-text("Done")');
  await page.waitForTimeout(1500);
  const listed = await text();
  check('all three appear as items in the lesson',
    /01-what-is-python/.test(listed) && /02-python-history/.test(listed) && /03-installing-python/.test(listed), listed.slice(0, 300));
  check('each shows Ready', (listed.match(/Ready/g) ?? []).length >= 3);
  const previews = await page.$$('button:has-text("Preview")');
  check('each offers a preview', previews.length >= 3, `${previews.length} preview buttons`);

  console.log('\n=== It survives a reload (nothing was lost to autosave) ===');
  await page.waitForTimeout(3000);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await page.click('nav[aria-label="Course studio steps"] button:has-text("Content")');
  await page.waitForTimeout(3000);
  const after = await text();
  check('the three videos are still there after a reload',
    /01-what-is-python/.test(after) && /02-python-history/.test(after) && /03-installing-python/.test(after), after.slice(0, 300));

  console.log('\n=== No errors ===');
  check('no failed API calls', failed.length === 0, failed.slice(0, 3).join('\n        '));
  check('no uncaught page errors', errors.length === 0, errors.slice(0, 3).join('\n        '));

  console.log(`\n  passed: ${pass}   failed: ${fail}\n`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
