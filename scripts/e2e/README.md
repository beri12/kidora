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

In a second terminal, from the repo root, run everything:

```powershell
node scripts/e2e/all.js
```

That checks the API is answering before it starts, runs every suite in order,
and prints one summary. It exits non-zero if any suite failed. If the web app
is not running it says so and runs the API suites only, rather than reporting
a wall of connection failures as test failures.

To run one suite on its own:

```powershell
node scripts/e2e/roles.js
node scripts/e2e/course-flow.js
node scripts/e2e/lms-workflow.js
node scripts/e2e/coursera-structure.js
node scripts/e2e/studio.js
node scripts/e2e/cal-support.js
node scripts/e2e/settings.js
node scripts/e2e/ai.js        # needs the AI service running, see below
```

The two browser suites additionally need the web app on http://localhost:3000
and Playwright installed:

```powershell
cd kidora-web
npm install -D playwright
npx playwright install chromium
npm run dev
# then, in another terminal, from the repo root
node scripts/e2e/ui-lms.js
node scripts/e2e/ui-studio.js
```

Each script prints `PASS`/`FAIL` per assertion and exits non-zero if anything
failed.

Both the API and the web address can be overridden with `API_URL` and
`WEB_URL`, and `PLAYWRIGHT_CHROMIUM` points the browser suites at a specific
Chromium binary when you do not want the one Playwright downloaded.

## What each one covers

| Script | Covers |
| --- | --- |
| `roles.js` | Registration and login for every role, JWT contents, role guards on protected endpoints |
| `course-flow.js` | Teacher wizard (draft to curriculum to publish), then the student side: catalogue, enrolment, and the course appearing on the student dashboard with the right id and lesson count |
| `cal-support.js` | Calendar events and support tickets, including who is allowed to see and edit each |
| `settings.js` | Profile and settings updates, and the fields a user is not allowed to change about themselves |
| `ai.js` | AI tutor: structured responses, the degraded response when no LLM is configured, moderation, and the authorisation rules that stop one user asking about another user's child |
| `lms-workflow.js` | The whole course workflow: teacher builds a course (modules, lessons, content, quiz, assignment, final exam), publishes it against a validated checklist, then a student browses, enrols, learns, is graded, sits the exam, completes the course and gets a verifiable certificate. Also the teacher library pages and cross-teacher isolation. |
| `ui-lms.js` | The same journey driven through the real browser (Playwright): every teacher page, the course studio, a real file upload, enrolment and the lesson player, the AI assistant, plus phone-width layout checks |
| `studio.js` | The course studio API: learning outcomes, co-instructors, per-item publishing, module exams, publish readiness and the version snapshot taken at each publish |
| `ui-studio.js` | The seven-step course wizard in the browser: Basics through Publish, the live course overview panel, Save Draft surviving a reload, the three-column curriculum builder, the add-content modal, the video editor's timestamp questions, the in-wizard preview, and publishing |
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

The upload sections of `ui-lms.js` and `ui-studio.js` write real files. With
`STORAGE_DRIVER=local` (the default) they land in `kidora-api/uploads/` and are
served at `/uploads/...`. Delete that folder to clean up after a test run.
