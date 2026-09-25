/**
 * Clicks the whole sign-up chain in a real browser, the way a person would:
 *
 *   phone + code  →  role  →  verification  →  pending  →  approved  →  in
 *
 * It asserts on each step and exits non-zero if any of them misbehaves, so it
 * is usable in CI as well as by hand.
 *
 *   npm run dev                 # this app, in another terminal
 *   npm run start:dev           # the API, in another terminal
 *   node scripts/walkthrough.mjs
 *
 * Environment:
 *   WEB          where the web app is        (default http://localhost:3000)
 *   API          where the API is            (default http://localhost:4000/api)
 *   SHOTS        where to write screenshots  (default ./walkthrough-shots)
 *   ADMIN_PHONE  an existing SUPER_ADMIN's number, used to approve the request
 *   CHROME       path to a Chromium binary, if Playwright cannot find one
 *
 * Needs the API started with AUTH_TEST_EXPOSE_OTP=true and no TWILIO_*
 * variables: the code is read from the API's response to the browser's own
 * request. The page itself never shows it — that is one of the checks.
 */
import { chromium } from 'playwright';
import fs from 'fs';

const shots = process.env.SHOTS || 'walkthrough-shots';
const WEB = process.env.WEB || 'http://localhost:3000';
const API = process.env.API || 'http://localhost:4000/api';
const ADMIN_PHONE = process.env.ADMIN_PHONE || '+251900000999';
fs.mkdirSync(shots, { recursive: true });

let pass = 0, fail = 0;
const is = (what, got, want) => {
  if (String(got) === String(want)) { pass++; console.log('  ✓', what); }
  else { fail++; console.log('  ✗', what, `— got ${got}, wanted ${want}`); }
};

const b = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
);
const page = await b.newPage({ viewport: { width: 1280, height: 950 } });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));

const phone = () => String(910000000 + Math.floor(Math.random() * 89999999));

// A name this run alone will use. Every run leaves its request in the queue,
// so a fixed name meant step 4 found — and approved — some earlier run's
// pending request, and this run's applicant waited for an approval that had
// gone to someone else.
const SCHOOL = `Walkthrough School ${Date.now().toString(36)}`;

async function signUp() {
  await page.goto(`${WEB}/join`, { waitUntil: 'networkidle' });
  await page.getByLabel('Phone number').fill(phone());
  const started = page.waitForResponse((r) => r.url().endsWith('/auth/phone/start'));
  await page.getByRole('button', { name: /Continue/ }).click();
  const { devCode: code } = await (await started).json();
  await page.getByLabel('Digit 1').waitFor({ timeout: 20000 });
  is('the code is not shown on screen', await page.getByText(code).count(), 0);
  await page.getByLabel('Digit 1').fill(code);
  await page.getByText('How will you use Kidora?').waitFor({ timeout: 20000 });
}

console.log('\n1 · A parent goes straight in');
await signUp();
await page.getByRole('button', { name: /I'm a Parent/ }).click();
await page.getByPlaceholder('Your name').fill('Test Parent');
await page.getByRole('button', { name: /Enter Kidora/ }).click();
// ROLE_HOME points at the LMS tree, so a parent lands on /parent/dashboard.
// The old /dashboard/* pages still exist, which is why the loose /dashboard/
// match below is not enough on its own — /login?next=/parent/dashboard also
// contains the word, and that is exactly how the missing role cookie hid.
await page.waitForURL(/\/parent\/dashboard/, { timeout: 20000 });
is('lands on the parent dashboard', new URL(page.url()).pathname, '/parent/dashboard');

console.log('\n2 · A student signs up and lands on the student dashboard');
await signUp();
await page.getByRole('button', { name: /I'm a Student/ }).click();
await page.waitForTimeout(400);
is('offers an optional school code', await page.getByPlaceholder('K7M2QP').isVisible(), 'true');
await page.getByPlaceholder('e.g. Leo').fill('Test Student');
await page.getByLabel(/Your grade/).selectOption('Grade 3');
await page.getByRole('button', { name: /start learning/ }).click();
await page.waitForURL(/\/student\/dashboard/, { timeout: 20000 });
is('lands on the student dashboard', new URL(page.url()).pathname, '/student/dashboard');

console.log('\n3 · A school leader is verified first');
await signUp();
await page.getByRole('button', { name: /I'm a School Leader/ }).click();
await page.waitForTimeout(300);
is('warns that this one is checked', await page.getByText(/We verify this one/).isVisible(), 'true');
await page.getByPlaceholder('Your name').fill('Marta Alemu');
await page.getByRole('button', { name: /Continue →/ }).click();
await page.getByText('Verify your school').waitFor({ timeout: 20000 });
is('offers the code route first', await page.getByPlaceholder('K7M2QP').isVisible(), 'true');
await page.screenshot({ path: `${shots}/w1-verify.png` });

await page.getByRole('button', { name: /Register a school/ }).click();
await page.getByPlaceholder('Sunrise Academy').fill(SCHOOL);
await page.getByPlaceholder('Principal', { exact: true }).fill('Principal');
await page.getByPlaceholder('principal@school.edu').fill('head@walkthrough.edu.et');
await page.getByRole('button', { name: /Submit for review/ }).click();
await page.getByText(/in the queue/i).waitFor({ timeout: 20000 });
is('lands on the pending screen', await page.getByText(/In review/).isVisible(), 'true');
await page.screenshot({ path: `${shots}/w2-pending.png` });

// What the account can actually do while it waits.
const state = await page.evaluate(() => JSON.parse(localStorage.getItem('cl.auth')).state);
is('still holds no administrative role', state.user.role, 'PARENT');

console.log('\n4 · A reviewer approves it');

// Everything below goes through the API, so this needs no database client —
// only an account that is already SUPER_ADMIN (see ADMIN_PHONE above).
const post = (path, body, token) =>
  fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body ?? {}),
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

const started = await post('/auth/phone/start', { phone: ADMIN_PHONE });
if (!started.body.devCode) {
  console.log(`  ✗ could not sign in the reviewer (${ADMIN_PHONE}) — status ${started.status}`);
  console.log('    set ADMIN_PHONE to an account you have promoted, e.g.');
  console.log(`    UPDATE "User" SET role='SUPER_ADMIN', "roleConfirmed"=true WHERE phone='${ADMIN_PHONE}';`);
  process.exit(1);
}
const verified = await post('/auth/phone/verify', { phone: ADMIN_PHONE, code: started.body.devCode });
const adminTok = verified.body.accessToken;

// The queue is oldest-first and paged, and every run leaves its request
// behind, so this run's request is on the LAST page, not the first. Walk the
// pages until it turns up rather than asserting on page one.
const pageOf = (skip) =>
  fetch(`${API}/admin/org-requests?status=PENDING&take=100&skip=${skip}`, {
    headers: { Authorization: `Bearer ${adminTok}` },
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

let queue = await pageOf(0);
let mine = (queue.body.items || []).find((r) => r.organizationName === SCHOOL);
for (let skip = 100; !mine && queue.status === 200 && skip < (queue.body.total ?? 0); skip += 100) {
  const next = await pageOf(skip);
  if (next.status !== 200) break;
  mine = (next.body.items || []).find((r) => r.organizationName === SCHOOL);
}

if (queue.status === 403) {
  console.log(`  ✗ ${ADMIN_PHONE} is not staff, so it cannot review. Promote it with:`);
  console.log(`    UPDATE "User" SET role='SUPER_ADMIN', "roleConfirmed"=true WHERE phone='${ADMIN_PHONE}';`);
  process.exit(1);
}
is('the reviewer can open the queue', queue.status, 200);

is('the request is waiting in the queue', Boolean(mine), true);
if (!mine) { console.log(`\n${pass} passed, ${fail} failed`); await b.close(); process.exit(1); }

const approved = await post(`/admin/org-requests/${mine.id}/approve`, { decisionNote: 'Verified' }, adminTok);
is('it approves', approved.body.status, 'APPROVED');
console.log('  (approved out of band — the applicant’s tab is still open)');

console.log('\n5 · The open tab picks it up');
await page.getByRole('button', { name: /Check again/ }).click();
await page.waitForURL(/\/school\/dashboard/, { timeout: 25000 });
is('the tab moves itself to the school dashboard', new URL(page.url()).pathname, '/school/dashboard');
const after = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('cl.auth')).state;
  const p = s.accessToken.split('.')[1];
  return JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((-p.length % 4 + 4) % 4))).role;
});
is('the token now carries the role', after, 'SCHOOL_LEADER');
await page.screenshot({ path: `${shots}/w3-approved.png` });

console.log(`\n${pass} passed, ${fail} failed`);
console.log('page errors:', errs.length ? errs : 'none');
await b.close();
process.exit(fail ? 1 : 0);
