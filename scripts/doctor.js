/**
 * Why is Kidora returning 404?
 *
 * Checks the handful of things that actually cause it — a stale compiled API,
 * a leftover process on the port, a missing rebuild after a schema change, a
 * frontend pointed at the wrong base URL — and prints what to do about the one
 * that is wrong. Read-only unless you pass --fix.
 *
 *   node scripts/doctor.js
 *   node scripts/doctor.js --fix     (regenerates the Prisma client and rebuilds)
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const API_DIR = path.join(ROOT, 'kidora-api');
const WEB_DIR = path.join(ROOT, 'kidora-web');
const API = (process.env.API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
const WEB = (process.env.WEB_URL || 'http://localhost:3000').replace(/\/$/, '');
const FIX = process.argv.includes('--fix');

/** Everything the frontend needs the API build to have. */
const NEEDED = ['uploads.file', 'uploads.video-presign', 'learning.content-progress'];

const problems = [];
const ok = (m) => console.log(`  ok    ${m}`);
const bad = (m, fix) => { console.log(`  BAD   ${m}`); problems.push({ m, fix }); };
const note = (m) => console.log(`        ${m}`);

const once = async (url, init) => {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), ...init });
    const body = await res.text();
    let json = null;
    try { json = JSON.parse(body); } catch { /* not json */ }
    return { status: res.status, body, json, url };
  } catch (e) {
    return { status: 0, body: String(e.message ?? e), json: null, url };
  }
};

/**
 * Ask over 'localhost' and, if nothing answers, over 127.0.0.1.
 *
 * On Windows and newer Linux, 'localhost' usually resolves to ::1 first. A
 * server bound only to IPv4 then looks completely dead over 'localhost' while
 * answering perfectly over 127.0.0.1 — which this script reported as "nothing
 * answered", the one wrong answer it could give.
 */
const get = async (url, init) => {
  const first = await once(url, init);
  if (first.status !== 0 || !/\/\/localhost/.test(url)) return first;
  const viaIpv4 = await once(url.replace('//localhost', '//127.0.0.1'), init);
  if (viaIpv4.status !== 0) viaIpv4.ipv6Only = true;
  return viaIpv4;
};

/** Newest mtime under a directory, skipping the noisy folders. */
function newest(dir, skip = /node_modules|\.next|dist|\.git/) {
  let latest = 0;
  const walk = (d) => {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (skip.test(p)) continue;
      if (e.isDirectory()) walk(p);
      else {
        const t = fs.statSync(p).mtimeMs;
        if (t > latest) latest = t;
      }
    }
  };
  walk(dir);
  return latest;
}

(async () => {
  console.log('\n=== Repository ===');
  try {
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT }).toString().trim();
    const commit = execFileSync('git', ['log', '-1', '--format=%h %s'], { cwd: ROOT }).toString().trim();
    ok(`on ${branch} at ${commit}`);
  } catch { bad('not a git checkout?', 'Run this from the repository root.'); }

  const controller = path.join(API_DIR, 'src/lms/uploads/uploads.controller.ts');
  if (fs.existsSync(controller)) ok('src/lms/uploads/uploads.controller.ts is present');
  else bad('the uploads controller is MISSING from your working tree',
    'git checkout -- kidora-api/src/lms/uploads  (or git pull again)');

  console.log('\n=== Is the compiled API up to date? ===');
  const mainJs = path.join(API_DIR, 'dist/main.js');
  if (!fs.existsSync(mainJs)) {
    bad('kidora-api/dist does not exist — nothing has been built',
      'cd kidora-api && npm run build');
  } else {
    const builtAt = fs.statSync(mainJs).mtimeMs;
    const srcAt = newest(path.join(API_DIR, 'src'));
    console.log(`        dist/main.js  ${new Date(builtAt).toISOString()}`);
    console.log(`        newest source ${new Date(srcAt).toISOString()}`);
    if (srcAt > builtAt) {
      bad('your source is NEWER than your build — the running API is behind the code',
        'cd kidora-api && npm run build');
    } else ok('the build is at least as new as the source');
    if (!fs.existsSync(path.join(API_DIR, 'dist/lms/uploads/uploads.controller.js'))) {
      bad('dist has no uploads controller', 'cd kidora-api && npm run build');
    } else ok('dist contains the uploads controller');
  }

  console.log('\n=== Is the Prisma client current? ===');
  const clientIndex = path.join(API_DIR, 'node_modules/.prisma/client/index.d.ts');
  if (!fs.existsSync(clientIndex)) {
    bad('no generated Prisma client', 'cd kidora-api && npx prisma generate');
  } else {
    const generated = fs.readFileSync(clientIndex, 'utf8');
    const missing = ['VideoAsset', 'UploadSession', 'ContentProgress'].filter((m) => !generated.includes(m));
    if (missing.length) {
      bad(`the Prisma client is missing ${missing.join(', ')} — it predates the current schema`,
        'cd kidora-api && npx prisma generate && npm run build');
    } else ok('the client knows VideoAsset, UploadSession and ContentProgress');
  }

  console.log('\n=== Is the API answering, and with which build? ===');
  const health = await get(`${API}/health`);
  if (health.status === 0) {
    bad(`nothing answered at ${API}/health (${health.body})`,
      'cd kidora-api && npm run start:dev   — and read that terminal for a boot error');
  } else if (health.status !== 200) {
    bad(`${API}/health returned ${health.status}`, 'Check the API terminal for the real error.');
  } else {
    ok(`the API answers; started ${health.json?.startedAt ?? 'unknown'}`);
    if (health.ipv6Only) {
      bad('the API answers on 127.0.0.1 but NOT on localhost — localhost is resolving to IPv6 (::1)',
        'Either start the API with HOST=0.0.0.0, or point the frontend at the IPv4 literal: '
        + 'NEXT_PUBLIC_API_URL=http://127.0.0.1:4000/api in kidora-web/.env.local');
    }
    const features = health.json?.features;
    if (!Array.isArray(features)) {
      bad('the running API reports no feature list, so it predates this branch entirely',
        'Stop every node process on port 4000, then: cd kidora-api && npm run build && npm run start:dev');
    } else {
      const absent = NEEDED.filter((f) => !features.includes(f));
      if (absent.length) {
        bad(`the running API is missing: ${absent.join(', ')}`,
          'Stop every node process on port 4000, then: cd kidora-api && npm run build && npm run start:dev');
      } else ok(`the running API has every feature the frontend needs`);
    }
    if (fs.existsSync(mainJs) && health.json?.startedAt) {
      const started = new Date(health.json.startedAt).getTime();
      if (started < fs.statSync(mainJs).mtimeMs) {
        bad('the running process started BEFORE the current build — it is a leftover',
          process.platform === 'win32'
            ? 'netstat -ano | findstr :4000   then   taskkill /PID <pid> /F   then start it again'
            : 'pkill -f "dist/main" ; pkill -f "nest start" — then start it again');
      } else ok('the running process is newer than the build it should be serving');
    }
  }

  console.log('\n=== The API root ===');
  const root = await get(API);
  if (root.status === 200 && root.json?.name) {
    ok(`${API} answers with an index (opening it in a browser is not an error)`);
  } else if (root.status === 404) {
    note(`${API} has no index in this build — harmless; use ${API}/health and ${API}/docs`);
  } else if (root.status === 0) {
    note('skipped — the API is not answering');
  }

  console.log('\n=== Does POST /api/uploads exist in the running API? ===');
  const probe = await get(`${API}/uploads`, { method: 'POST' });
  const healthFeatures = health.json?.features;
  if (probe.status === 401) ok('401 Unauthorized — the route EXISTS (rejecting an unauthenticated call is correct)');
  else if (probe.status === 404) {
    if (Array.isArray(healthFeatures) && healthFeatures.includes('uploads.file')) {
      // These two answers cannot come from the same process: one claims the
      // feature, the other has no route for it.
      bad('/api/health claims uploads.file but POST /api/uploads is 404 — these are TWO DIFFERENT SERVERS',
        'Something else is on port 4000 as well, or a proxy is splitting the requests. '
        + (process.platform === 'win32'
          ? 'Run: netstat -ano | findstr :4000 — if more than one PID appears, kill them all and start one API.'
          : 'Run: ss -ltnp | grep 4000 — kill every listener and start one API.'));
    } else {
      bad(`404 "${probe.json?.error?.message ?? probe.body.slice(0, 60)}" — the route is NOT in the running API`,
        'The API is an older build. Kill every process on 4000, then rebuild and restart. '
        + 'If you run it with Docker, the image is what is stale: docker compose up -d --build');
    }
  } else if (probe.status === 0) note('skipped — the API is not answering');
  else note(`returned ${probe.status}; not 404, so the route exists`);

  console.log('\n=== Is the API running in Docker? ===');
  let docker = '';
  try {
    docker = execFileSync('docker', ['ps', '--format', '{{.Image}} {{.Ports}} {{.CreatedAt}}'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString();
  } catch { /* docker not installed or not running, which is fine */ }
  const onFourThousand = docker.split('\n').filter((l) => l.includes('4000'));
  if (onFourThousand.length === 0) {
    ok('no container is publishing port 4000, so the API is the process you started by hand');
  } else {
    bad(`a container is serving port 4000:\n        ${onFourThousand.join('\n        ')}`,
      'Rebuilding source on the host does nothing to a running image. Run: cd kidora-api && docker compose up -d --build');
  }

  console.log('\n=== Frontend base URL ===');
  const envLocal = path.join(WEB_DIR, '.env.local');
  if (!fs.existsSync(envLocal)) {
    ok('no .env.local, so development falls back to http://localhost:4000/api (correct)');
  } else {
    const line = fs.readFileSync(envLocal, 'utf8').split('\n').find((l) => l.startsWith('NEXT_PUBLIC_API_URL='));
    const value = line?.split('=')[1]?.trim();
    if (!value) ok('.env.local sets no NEXT_PUBLIC_API_URL, so the development default applies');
    else if (!/\/api$/.test(value)) {
      bad(`NEXT_PUBLIC_API_URL is "${value}" — it must end in /api`,
        `Set NEXT_PUBLIC_API_URL=${value.replace(/\/$/, '')}/api in kidora-web/.env.local, then restart npm run dev`);
    } else ok(`NEXT_PUBLIC_API_URL is ${value}`);
  }

  console.log('\n=== Is the web app answering? ===');
  const web = await get(WEB);
  if (web.status === 0) bad(`nothing answered at ${WEB}`, 'cd kidora-web && npm run dev');
  else ok(`the web app answers with ${web.status}`);

  console.log('\n======================================');
  if (problems.length === 0) {
    console.log('  Nothing wrong found. Both services are current and the upload route exists.');
    console.log('  If the browser still shows 404, open its Network tab, click the failing');
    console.log('  request, and check the full Request URL — that is the only thing left.');
  } else {
    console.log(`  ${problems.length} problem${problems.length === 1 ? '' : 's'} found:\n`);
    problems.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.m}`);
      console.log(`     fix: ${p.fix}\n`);
    });
  }
  console.log('======================================\n');

  console.log('===== paste this if you need help =====');
  console.log(JSON.stringify({
    platform: process.platform,
    commit: (() => { try { return execFileSync('git', ['log', '-1', '--format=%h'], { cwd: ROOT }).toString().trim(); } catch { return '?'; } })(),
    distBuiltAt: fs.existsSync(mainJs) ? new Date(fs.statSync(mainJs).mtimeMs).toISOString() : null,
    apiStatus: health.status,
    apiStartedAt: health.json?.startedAt ?? null,
    apiFeatures: health.json?.features ?? null,
    uploadsProbe: probe.status,
    uploadsBody: probe.body.slice(0, 120),
    dockerOn4000: onFourThousand,
    problems: problems.map((p) => p.m),
  }, null, 2));
  console.log('=======================================\n');

  if (FIX) {
    console.log('--fix: regenerating the Prisma client and rebuilding the API…\n');
    execFileSync('npx', ['prisma', 'generate'], { cwd: API_DIR, stdio: 'inherit', shell: process.platform === 'win32' });
    execFileSync('npm', ['run', 'build'], { cwd: API_DIR, stdio: 'inherit', shell: process.platform === 'win32' });
    console.log('\nDone. Now stop any old API process and start it again.');
  }

  process.exit(problems.length ? 1 : 0);
})();
