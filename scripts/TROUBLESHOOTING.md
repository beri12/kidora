# When Kidora returns 404

## First: is it the API root?

```
GET http://localhost:4000/api  ->  404 "Cannot GET /api"
```

That one was never a fault. Every route lives *under* `/api`, so the bare root
had nothing of its own — and opening the URL the API prints on startup is the
first thing anyone does. It now answers with an index listing `/api/docs`,
`/api/health` and the build's features.

These are the URLs worth opening by hand:

| URL | What it tells you |
| --- | --- |
| `http://localhost:4000/api` | The API is up, and which features this build has |
| `http://localhost:4000/api/health` | The same, as a liveness probe |
| `http://localhost:4000/api/docs` | Swagger: every route, with a Try it out button |

A 404 on `/api/auth/login` or `/api/uploads` is a real problem. A 404 on `/api`
in an older build is not.

Run this first. It checks the things that actually cause it and prints the fix
for whichever one is wrong:

```powershell
node scripts/doctor.js
```

Add `--fix` to have it regenerate the Prisma client and rebuild the API:

```powershell
node scripts/doctor.js --fix
```

## What it looks at

| Check | Why |
| --- | --- |
| Working tree has `src/lms/uploads/uploads.controller.ts` | `.gitignore` once matched `uploads` at any depth and swallowed this folder |
| `dist/main.js` is newer than the newest file in `src/` | A build older than the source means the running API is behind the code |
| `dist/lms/uploads/uploads.controller.js` exists | Confirms the route was actually compiled |
| Generated Prisma client knows `VideoAsset`, `UploadSession`, `ContentProgress` | A client older than the schema fails at runtime on models it cannot see |
| `GET /api/health` lists the features the frontend needs | The running process tells you which build it is |
| The process started *after* the current build | Catches a leftover API still holding port 4000 |
| `POST /api/uploads` returns 401, not 404 | 401 proves the route exists; 404 proves it does not |
| `NEXT_PUBLIC_API_URL` ends in `/api` | Without the suffix every call lands one path segment short |
| Both `:4000` and `:3000` answer | The obvious one, checked last |

## Reading the two probes

```
POST /api/uploads   ->  401 Unauthorized          the route EXISTS
POST /api/uploads   ->  404 "Cannot POST ..."     the route is NOT in the running API
```

A 404 here is never a permissions or CORS problem. It means the process
answering on port 4000 was built before that route existed.

## Three causes the checks distinguish

**1. An older build is serving.** `/api/health` has no `features` key, or is
missing the one you need. Kill every process on 4000, rebuild, restart.

**2. The API is a Docker container.** Rebuilding source on the host does
nothing to a running image — the doctor names the container if one is
publishing 4000.

```powershell
cd kidora-api
docker compose up -d --build
```

**3. Two servers on one port.** `/api/health` claims `uploads.file` but
`POST /api/uploads` is 404 — impossible from one process, so two are involved,
or a proxy is splitting the requests. `netstat -ano | findstr :4000` shows more
than one PID.

There is also a fourth, which the doctor now reports rather than mistaking for
a dead server: the API answers on `127.0.0.1` but not on `localhost`, because
`localhost` resolved to IPv6 `::1`. Point the frontend at the IPv4 literal:

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:4000/api
```

## The usual cause

An old API process still holds port 4000, so the newly started one exited with
`EADDRINUSE` and the old route table keeps serving. Everything that existed
before the pull keeps working, and only the newest routes 404 — which is what
makes it confusing.

```powershell
netstat -ano | findstr :4000
taskkill /PID <the pid> /F

cd kidora-api
npx prisma migrate deploy
npm run build
npm run start:dev
```

Watch that terminal as it boots: `Mapped {/api/uploads, POST} route` should
appear, and nine `/api/uploads` lines in total. If the boot ends in an error,
that error is the actual problem.
