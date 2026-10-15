// Drives the two pages behind /teacher/assignments in a real browser: the
// "New" button (which used to 404 — there was no page at all), the create
// form, and the assignment it lands on.
//
//   npm start                     # in kidora-web, with the API on :4000
//   CHROME=/path/to/chrome node scripts/assign-probe.mjs
import { chromium } from 'playwright';
const API = 'http://localhost:4000/api', WEB = 'http://localhost:3000';
const post = (p, b, t) => fetch(`${API}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify(b ?? {}) }).then(r => r.json());

let pass = 0, fail = 0;
const is = (w, g, x) => { if (String(g) === String(x)) { pass++; console.log('  ✓', w); } else { fail++; console.log('  ✗', w, `— got ${g}, wanted ${x}`); } };

// The API must run with AUTH_TEST_EXPOSE_OTP=true so the emailed code comes back.
const email = `probe.teacher.${Date.now()}@example.com`;
const s = await post('/auth/register', { name: 'Probe Teacher', email, password: 'Kidora2026!' });
const v = await post('/auth/email/verify', { email, code: s.devCode });
const r = await post('/auth/role', { role: 'TEACHER', name: 'Probe Teacher' }, v.accessToken);
const tok = r.accessToken;
// A course to attach an assignment to.
const course = await fetch(`${API}/authoring/courses`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` }, body: JSON.stringify({ title: 'Probe Course' }) }).then(r => r.json());
if (!course.id) { console.log('could not create the course:', JSON.stringify(course).slice(0, 200)); process.exit(1); }

const b = await chromium.launch({ executablePath: process.env.CHROME });
const page = await b.newPage({ viewport: { width: 1280, height: 950 } });
const errs = [];
page.on('pageerror', e => errs.push(e.message));

await page.goto(`${WEB}/`, { waitUntil: 'domcontentloaded' });
await page.evaluate(([st]) => {
  localStorage.setItem('cl.auth', JSON.stringify({ state: st, version: 0 }));
  document.cookie = `kidora_role=${st.user.role}; Path=/; Max-Age=86400; SameSite=Lax`;
}, [{ user: r.user, accessToken: tok, refreshToken: r.refreshToken, hydrated: true }]);

console.log('\n1 · The New button no longer 404s');
await page.goto(`${WEB}/teacher/assignments`, { waitUntil: 'networkidle' });
await page.getByRole('link', { name: /New/ }).click();
await page.waitForURL(/\/teacher\/assignments\/new/, { timeout: 15000 });
is('lands on the create page', new URL(page.url()).pathname, '/teacher/assignments/new');
is('not a 404', await page.getByText(/This page could not be found/).count(), 0);
// The picker only appears once the teacher's courses have loaded.
await page.getByLabel('Course').waitFor({ timeout: 20000 });
is('asks for a course first', await page.getByLabel('Course').isVisible(), 'true');
is('the title box is disabled until a course is picked', await page.getByPlaceholder('Fractions worksheet 2').isDisabled(), 'true');

console.log('\n2 · Publishing needs a brief');
await page.getByLabel('Course').selectOption({ label: 'Probe Course' });
await page.getByPlaceholder('Fractions worksheet 2').fill('Probe assignment');
is('cannot publish with only a title', await page.getByRole('button', { name: /Publish to students/ }).isDisabled(), 'true');
is('says why', await page.getByText(/Add a description or instructions before publishing/).isVisible(), 'true');
is('but a draft can still be saved', await page.getByRole('button', { name: /Save as draft/ }).isDisabled(), 'false');

console.log('\n3 · Creating one');
await page.getByPlaceholder('What this covers, in one line.').fill('A probe.');
await page.getByRole('button', { name: /Publish to students/ }).click();
await page.waitForURL((u) => /\/teacher\/assignments\/c[a-z0-9]{10,}$/.test(u.pathname), { timeout: 20000 });
is('goes to the new assignment', /\/teacher\/assignments\/c[a-z0-9]+/.test(page.url()), 'true');
await page.getByText('Marks out of 100').waitFor({ timeout: 20000 });
is('shows its title', await page.getByText('Probe assignment').first().isVisible(), 'true');
is('shows it is published', await page.getByText('published').first().isVisible(), 'true');
is('shows the mark scheme', await page.getByText('Marks out of 100').isVisible(), 'true');
is('says nothing is handed in', await page.getByText(/Nothing handed in yet/).isVisible(), 'true');
await page.screenshot({ path: 'walkthrough-shots/assignment-detail.png' });

console.log('\n4 · Back to the list');
await page.getByRole('link', { name: /All assignments/ }).click();
await page.waitForURL(/\/teacher\/assignments$/, { timeout: 15000 });
// The list is cached with a 60s staleTime, so it only refreshes here because
// creating the assignment invalidated it. Without that invalidation a teacher
// sees the page from before they made it and thinks nothing saved.
await page.getByRole('link', { name: 'Probe assignment' }).waitFor({ timeout: 15000 });
is('the new one is in the list', await page.getByRole('link', { name: 'Probe assignment' }).isVisible(), 'true');

console.log(`\n${pass} passed, ${fail} failed`);
console.log('page errors:', errs.length ? errs : 'none');
await b.close();
process.exit(fail ? 1 : 0);
