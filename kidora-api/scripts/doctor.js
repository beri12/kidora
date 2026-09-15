#!/usr/bin/env node
/*
 * Upload pipeline doctor.
 *
 * Checks, in order, the things that actually break image / banner / video
 * uploads, and reports each one separately so a failure points at a cause
 * rather than just "404".
 *
 *   node scripts/doctor.js                 # against http://localhost:4000
 *   API_URL=http://host:4000 node scripts/doctor.js
 *
 * A 401 from an upload route counts as a pass: it proves the route is
 * mounted and reached the auth guard. Only a 404 means the endpoint is
 * genuinely missing from the running build.
 */

const fs = require('fs');
const path = require('path');

const API_URL = (process.env.API_URL || 'http://localhost:4000').replace(/\/+$/, '');
const ROOT = path.join(__dirname, '..');

let failures = 0;
let warnings = 0;

const pass = (m) => console.log(`  \x1b[32mPASS\x1b[0m  ${m}`);
const warn = (m) => { warnings++; console.log(`  \x1b[33mWARN\x1b[0m  ${m}`); };
const fail = (m) => { failures++; console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`); };

function section(title) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

// --- 1. source tree -------------------------------------------------------

function checkSources() {
  section('Source tree');

  const required = [
    'src/uploads/uploads.module.ts',
    'src/uploads/uploads.controller.ts',
    'src/infrastructure/storage/storage.service.ts',
    'src/infrastructure/storage/local.driver.ts',
  ];

  for (const rel of required) {
    if (fs.existsSync(path.join(ROOT, rel))) pass(rel);
    else fail(`${rel} is missing — the API cannot compile without it`);
  }

  // Every module app.module.ts imports from a relative path must exist, or
  // `nest build` fails with TS2307 and the running server silently keeps
  // serving the previous build.
  const appModule = path.join(ROOT, 'src/app.module.ts');
  if (fs.existsSync(appModule)) {
    const src = fs.readFileSync(appModule, 'utf8');
    const missing = [];
    for (const m of src.matchAll(/from\s+'(\.[^']+)'/g)) {
      const spec = m[1];
      const base = path.join(ROOT, 'src', spec);
      const found = ['.ts', '.tsx', '/index.ts', '.js'].some((ext) =>
        fs.existsSync(base + ext),
      ) || fs.existsSync(base);
      if (!found) missing.push(spec);
    }
    if (missing.length) {
      fail(`app.module.ts imports modules that do not exist: ${missing.join(', ')}`);
    } else {
      pass('every relative import in app.module.ts resolves');
    }
  }
}

// --- 2. compiled output ---------------------------------------------------

function checkBuild() {
  section('Compiled output (dist/)');

  const dist = path.join(ROOT, 'dist');
  if (!fs.existsSync(dist)) {
    warn('dist/ does not exist — run "npm run build" (only needed for npm run start:prod)');
    return;
  }

  const controller = path.join(dist, 'uploads/uploads.controller.js');
  if (fs.existsSync(controller)) {
    pass('dist/uploads/uploads.controller.js is present');
  } else {
    fail('dist/ exists but has no uploads controller — the build is stale or failed');
  }

  const distMain = path.join(dist, 'main.js');
  const srcMain = path.join(ROOT, 'src/main.ts');
  if (fs.existsSync(distMain) && fs.existsSync(srcMain)) {
    if (fs.statSync(distMain).mtimeMs < fs.statSync(srcMain).mtimeMs) {
      warn('dist/main.js is older than src/main.ts — rebuild to pick up changes');
    } else {
      pass('dist/ is newer than src/main.ts');
    }
  }
}

// --- 3. storage directory -------------------------------------------------

function checkStorage() {
  section('Storage');

  const driver = process.env.STORAGE_DRIVER || 'local';
  pass(`STORAGE_DRIVER=${driver}`);

  if (driver === 's3') {
    for (const key of ['S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY', 'S3_SECRET_KEY']) {
      if (process.env[key]) pass(`${key} is set`);
      else fail(`${key} is not set but STORAGE_DRIVER=s3`);
    }
    try {
      require.resolve('@aws-sdk/client-s3');
      pass('@aws-sdk/client-s3 is installed');
    } catch {
      fail('@aws-sdk/client-s3 is not installed — run: npm i @aws-sdk/client-s3');
    }
    return;
  }

  const dir = path.resolve(ROOT, process.env.STORAGE_DIR || './uploads');
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, `.doctor-${Date.now()}`);
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    pass(`${dir} exists and is writable`);
  } catch (err) {
    fail(`cannot write to ${dir}: ${err.message}`);
  }

  const base = process.env.STORAGE_PUBLIC_BASE || 'http://localhost:4000/uploads';
  if (/^https?:\/\//.test(base)) pass(`STORAGE_PUBLIC_BASE=${base}`);
  else fail(`STORAGE_PUBLIC_BASE must be an absolute URL, got "${base}"`);
}

// --- 4. the running server ------------------------------------------------

async function probe(method, url) {
  try {
    const res = await fetch(url, { method });
    return res.status;
  } catch (err) {
    return { error: err.message };
  }
}

async function checkRunningServer() {
  section(`Running server (${API_URL})`);

  const health = await probe('GET', `${API_URL}/api/health`);
  if (health && health.error) {
    fail(`cannot reach ${API_URL} — is the API running? (${health.error})`);
    return;
  }
  if (health === 200) pass('GET /api/health → 200');
  else warn(`GET /api/health → ${health}`);

  // 404 here is the symptom this script exists to diagnose: the route is
  // absent from the build the server is actually running.
  const routes = ['/api/uploads', '/api/uploads/image', '/api/uploads/video', '/api/uploads/document'];
  for (const route of routes) {
    const status = await probe('POST', `${API_URL}${route}`);
    if (status && status.error) {
      fail(`POST ${route} — request failed: ${status.error}`);
    } else if (status === 404) {
      fail(`POST ${route} → 404 (route not mounted; rebuild and restart the API)`);
    } else if (status === 401) {
      pass(`POST ${route} → 401 (mounted, auth required — expected)`);
    } else {
      pass(`POST ${route} → ${status} (mounted)`);
    }
  }

  const staticStatus = await probe('GET', `${API_URL}/uploads/`);
  if (staticStatus && staticStatus.error) {
    warn(`GET /uploads/ — ${staticStatus.error}`);
  } else if (staticStatus === 500) {
    fail('GET /uploads/ → 500 (static handler misconfigured)');
  } else {
    pass(`GET /uploads/ → ${staticStatus} (static file route is served)`);
  }
}

(async () => {
  console.log('\x1b[1mKidora upload doctor\x1b[0m');
  checkSources();
  checkBuild();
  checkStorage();
  await checkRunningServer();

  console.log('');
  if (failures) {
    console.log(`\x1b[31m${failures} check(s) failed\x1b[0m, ${warnings} warning(s).`);
    process.exit(1);
  }
  console.log(`\x1b[32mAll checks passed\x1b[0m${warnings ? `, ${warnings} warning(s).` : '.'}`);
})();
