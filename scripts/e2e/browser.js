/**
 * Finding Playwright and a Chromium to drive.
 *
 * The browser suites used to hardcode this container's paths, which meant they
 * only ran here. Now they look for whatever is installed: Playwright from
 * either app's node_modules, and the browser Playwright downloaded for itself
 * — falling back to a prebuilt one only when that is what exists.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function loadChromium() {
  const candidates = [
    'playwright', 'playwright-core',
    path.join(ROOT, 'kidora-web', 'node_modules', 'playwright'),
    path.join(ROOT, 'kidora-web', 'node_modules', 'playwright-core'),
    path.join(ROOT, 'kidora-api', 'node_modules', 'playwright'),
    path.join(ROOT, 'kidora-api', 'node_modules', 'playwright-core'),
  ];
  for (const c of candidates) {
    try { return require(c).chromium; } catch { /* try the next one */ }
  }
  throw new Error(
    'Playwright is not installed.\n' +
    '  cd kidora-web && npm install -D playwright && npx playwright install chromium',
  );
}

/** Prebuilt browsers to try when Playwright cannot find its own. */
const PREBUILT = ['/opt/pw-browsers/chromium', process.env.PLAYWRIGHT_CHROMIUM].filter(Boolean);

async function launchBrowser(opts = {}) {
  const chromium = loadChromium();

  // An explicit path wins: that is someone saying which binary to use.
  if (process.env.PLAYWRIGHT_CHROMIUM) {
    return chromium.launch({ ...opts, executablePath: process.env.PLAYWRIGHT_CHROMIUM });
  }
  try {
    return await chromium.launch(opts);
  } catch (err) {
    const prebuilt = PREBUILT.find((p) => fs.existsSync(p));
    if (!prebuilt) {
      throw new Error(
        `${err.message}\n\nNo Chromium found. Install one with:\n` +
        '  cd kidora-web && npx playwright install chromium\n' +
        'or point PLAYWRIGHT_CHROMIUM at an existing browser binary.',
      );
    }
    return chromium.launch({ ...opts, executablePath: prebuilt });
  }
}

module.exports = { launchBrowser };
