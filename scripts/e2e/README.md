# End-to-end API tests

Plain Node scripts (no framework, no install) that drive the running API over
HTTP the way the browser does. Each one registers its own throwaway accounts,
so they are safe to re-run and do not depend on seed data.

They talk to `http://localhost:4000/api` by default; override with `API_URL`.

## Running

Start Postgres and Redis, apply migrations, then start the API:

```powershell
cd kidora-api
npx prisma migrate deploy
npm run start:dev
```

In a second terminal, from the repo root:

```powershell
node scripts/e2e/roles.js
node scripts/e2e/course-flow.js
node scripts/e2e/cal-support.js
node scripts/e2e/settings.js
node scripts/e2e/ai.js        # needs the AI service running, see below
```

Each script prints `PASS`/`FAIL` per assertion and exits non-zero if anything
failed.

## What each one covers

| Script | Covers |
| --- | --- |
| `roles.js` | Registration and login for every role, JWT contents, role guards on protected endpoints |
| `course-flow.js` | Teacher wizard (draft to curriculum to publish), then the student side: catalogue, enrolment, and the course appearing on the student dashboard with the right id and lesson count |
| `cal-support.js` | Calendar events and support tickets, including who is allowed to see and edit each |
| `settings.js` | Profile and settings updates, and the fields a user is not allowed to change about themselves |
| `ai.js` | AI tutor: structured responses, the degraded response when no LLM is configured, moderation, and the authorisation rules that stop one user asking about another user's child |

## The AI service

`ai.js` needs `apps/ai-service` running as well:

```powershell
cd apps/ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env      # set AI_SERVICE_TOKEN to match kidora-api/.env
uvicorn app.main:app --port 8000
```

Without an LLM key the service answers honestly with `degraded: true` rather
than inventing text, and `ai.js` asserts that behaviour — so the script passes
either way.

Its own unit tests run separately:

```powershell
cd apps/ai-service
python -m pytest
```
