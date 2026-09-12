/**
 * Runs every end-to-end suite in order and prints one summary.
 *
 * Checks the services are up first, because a suite failing with 60 refused
 * connections tells you nothing about the code.
 */
const { spawn } = require('child_process');
const path = require('path');

const API = process.env.API_URL || 'http://localhost:4000/api';
const WEB = process.env.WEB_URL || 'http://localhost:3000';

const API_SUITES = ['roles', 'course-flow', 'lms-workflow', 'coursera-structure', 'studio', 'cal-support', 'settings', 'ai'];
const UI_SUITES = ['ui-lms', 'ui-studio'];

const up = async (url) => {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return res.status < 500;
  } catch { return false; }
};

const run = (name) => new Promise((resolve) => {
  const child = spawn(process.execPath, [path.join(__dirname, `${name}.js`)], { stdio: 'inherit' });
  child.on('close', (code) => resolve(code === 0));
});

(async () => {
  const apiUp = await up(`${API}/health`);
  if (!apiUp) {
    console.error(`\nThe API is not answering at ${API}.\n  cd kidora-api && npm run start:dev\n`);
    process.exit(1);
  }

  const webUp = await up(WEB);
  const suites = [...API_SUITES];
  if (webUp) suites.push(...UI_SUITES);
  else console.warn(`\nThe web app is not answering at ${WEB}; skipping the browser suites.\n  cd kidora-web && npm run dev\n`);

  const results = [];
  for (const s of suites) {
    console.log(`\n\n########## ${s} ##########`);
    results.push([s, await run(s)]);
  }

  console.log('\n\n==================== summary ====================');
  for (const [name, ok] of results) console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
  const failed = results.filter(([, ok]) => !ok);
  if (!webUp) console.log('  SKIP  ui-lms, ui-studio (web app was not running)');
  console.log('=================================================');
  process.exit(failed.length ? 1 : 0);
})();
