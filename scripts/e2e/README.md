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
node scripts/e2e/lms-workflow.js
node scripts/e2e/coursera-structure.js
node scripts/e2e/cal-support.js
node scripts/e2e/settings.js
node scripts/e2e/ai.js        # needs the AI service running, see below
```

`ui-lms.js` additionally needs the web app running on http://localhost:3000
and Playwright installed:

```powershell
cd kidora-web
npm run dev
# then, in another terminal, from the repo root
node scripts/e2e/ui-lms.js
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
| `lms-workflow.js` | The whole course workflow: teacher builds a course (modules, lessons, content, quiz, assignment, final exam), publishes it against a validated checklist, then a student browses, enrols, learns, is graded, sits the exam, completes the course and gets a verifiable certificate. Also the teacher library pages and cross-teacher isolation. |
| `ui-lms.js` | The same journey driven through the real browser (Playwright): every teacher page, the 12-step builder, a real file upload, enrolment and the lesson player, plus phone-width layout checks |
| `coursera-structure.js` | Teacher file uploads, modules numbered as weeks, typed lesson items (video with captions and in-video questions, readings with attachments), formative vs summative quizzes, and peer review end to end |

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

## Uploads

`uploads.js` and the upload section of `ui-lms.js` write real files. With
`STORAGE_DRIVER=local` (the default) they land in `kidora-api/uploads/` and are
served at `/uploads/...`. Delete that folder to clean up after a test run.
