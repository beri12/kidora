/**
 * Clicks through sign-up the way a person would, for each role:
 *
 *   /auth/signup → emailed code → "How will you use Kidora?" → profile → complete → dashboard
 *
 * asserting each step and writing screenshots. Needs this app (npm run dev) and
 * the API started with AUTH_TEST_EXPOSE_OTP=true, which returns the emailed
 * code in the register response for tests only (real users get it by email).
 *
 *   npm run walkthrough                 # all roles, desktop
 *   WIDTH=390 npm run walkthrough       # phone width
 *
 * WEB, SHOTS and CHROME override the defaults.
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const WEB = process.env.WEB ?? 'http://localhost:3000';
const SHOTS = process.env.SHOTS ?? 'walkthrough-shots';
const WIDTH = Number(process.env.WIDTH ?? 1440);
const ROLES = ['Student', 'Parent', 'Teacher', 'School Leader'];
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
let failed = 0;

for (const role of ROLES) {
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: WIDTH < 500 ? 844 : 900 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  let devCode = null;
  p.on('response', async (r) => { if (r.url().endsWith('/auth/register')) { try { devCode = (await r.json()).devCode; } catch { /* not json */ } } });
  const slug = role.toLowerCase().replace(/\s/g, '-');
  const shot = (n) => p.screenshot({ path: `${SHOTS}/${slug}-${n}.png`, fullPage: true });

  try {
    await p.goto(`${WEB}/auth/signup`, { waitUntil: 'networkidle' });
    await p.getByLabel('Full name').fill(`Walkthrough ${role}`);
    await p.getByLabel('Email').fill(`walk.${slug}.${Date.now()}@example.com`);
    await p.getByLabel('Password', { exact: true }).fill('Kidora2026!');
    await p.getByLabel('Confirm password').fill('Kidora2026!');
    await shot('1-signup');
    await p.getByRole('button', { name: 'Sign up' }).click();
    await p.getByText('Check your inbox').waitFor();
    if (!devCode) throw new Error('No devCode — start the API with AUTH_TEST_EXPOSE_OTP=true');
    await p.locator('input').first().fill(devCode);
    await p.waitForURL('**/auth/signup/role**');
    await shot('2-role');
    await p.getByRole('radio', { name: new RegExp(role) }).click();
    await p.getByRole('button', { name: 'Continue' }).click();

    if (role === 'Student') {
      await p.waitForURL('**/auth/signup/profile**');
      await p.getByLabel('Date of birth').fill('2015-05-20');
      await p.getByLabel('Grade').selectOption('Grade 5');
      await shot('3-profile');
      await p.getByRole('button', { name: 'Continue' }).click();
    } else if (role === 'Teacher') {
      await p.waitForURL('**/auth/signup/profile**');
      await p.getByRole('button', { name: 'Skip for now' }).click();
    } else if (role === 'School Leader') {
      await p.waitForURL('**/auth/signup/profile**');
      await p.getByText('Verify your school').waitFor();
      await shot('3-verify');
      console.log(`✓ ${role}: reaches school verification`);
      continue;
    }
    await p.waitForURL('**/auth/signup/complete**');
    await shot('4-complete');
    await p.getByRole('link', { name: /Start learning|Go to my dashboard/ }).click();
    await p.waitForURL(/\/(student|parent|teacher)\//, { timeout: 60000 });
    await p.waitForLoadState('networkidle');
    await shot('5-dashboard');
    if (errors.length) throw new Error(`page errors: ${errors.slice(0, 3).join(' | ')}`);
    console.log(`✓ ${role}: ${new URL(p.url()).pathname}`);
  } catch (e) {
    failed++;
    console.log(`✗ ${role}: ${e.message.split('\n')[0]}`);
    await shot('error').catch(() => {});
  } finally {
    await ctx.close();
  }
}

await browser.close();
process.exit(failed ? 1 : 0);
