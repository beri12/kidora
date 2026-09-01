# KIDORA — School + Teacher LMS + Gamified Learning: Change Plan

> Status: written after a full read-through of the existing repository.
> This is an **incremental upgrade plan** for the existing Kidora codebase.
> Nothing in it rebuilds the product, replaces the stack, or deletes shipped features.

---

## A. Current architecture

Two applications in one repository (no monorepo tooling — no pnpm workspace, no
`packages/`, no root `package.json`; each app has its own `package.json`,
`node_modules`, `Dockerfile`):

| Path | What it is |
|---|---|
| `kidora-api/` | NestJS 11 + TypeScript + Prisma 6 + PostgreSQL + Redis (ioredis + node-redis) + Socket.IO |
| `kidora-web/` | Next.js 15 App Router + React 19 + Tailwind 3 + TanStack Query 5 + Zustand + GSAP + three/@react-three |

**There is no React Native / Expo application in this repository.** Phase 38
(mobile) therefore has nothing to integrate into — see section R.

### Backend layout (`kidora-api/src`)

```
main.ts            global prefix /api, CORS from CORS_ORIGIN, ValidationPipe
                   (whitelist+transform), AllExceptionsFilter, Swagger /api/docs,
                   static /uploads, Redis Socket.IO adapter
app.module.ts      ConfigModule(global) + ThrottlerModule(120/60s) + APP_GUARD Throttler
database/          PrismaService, DatabaseModule (@Global), PrismaModule (@Global, duplicate)
common/            guards (jwt-auth, roles, permissions), decorators
                   (roles, permissions, public, current-user), enums (AppRole, Permission),
                   constants/rbac.ts (ROLE_PERMISSIONS matrix), filters, interceptors
auth/              AuthModule (wired): controller, oauth controller, services
                   (auth/token/mfa/sms-mfa/oauth), passport strategies
auth/dto/          *** a second, unwired copy of an auth module *** (see O/conflicts)
infrastructure/    cache (Redis), storage (local|s3 driver), email, sms
courses/           wizard-shaped course API (draft → curriculum → publish) + public read
lessons/           thin controller over prisma.lesson
quizzes/           server-side scoring, +10 pts/correct, perfect-score badge
progress/          lesson progress, +20 pts, first-lesson badge, certificate on course complete
certificates/      idempotent issue by (userId, courseName)
rewards/           badges + Redis leaderboard
economy/           RewardWallet (coins/gems/xp/level), Transaction ledger, missions, achievements
avatar/ games/ chat/ ai-tutor/ learning-path/ notifications/ analytics/
payments/ subscriptions/ invoices/ teachers/ users/ health/ redis/
```

### Frontend layout (`kidora-web/src`)

```
app/               App Router. (auth)/login|register, dashboard/{admin,teacher,parent,child,
                   school,district,students,for-teachers}, courses, kid/{dashboard,learn},
                   games, rewards, avatar, profile, account, plus, pricing, onboarding,
                   messages, ai-tutor, payment/*
lib/               axios.ts (canonical `api` client, NEXT_PUBLIC_API_URL, refresh interceptor),
                   http.ts (second client, NEXT_PUBLIC_API_BASE_URL — payments only),
                   api.ts (route-name constants), env.ts, i18n.tsx, utils.ts, query-client.ts
features/          React Query hooks per domain (courses, rewards, students, teachers,
                   payments, games, avatar, chat, subscription, ai-tutor)
stores/            auth.store (zustand+persist), courseWizard.store, ui.store
components/        ui/{button,card,badge,input}, shared/{RoleGate,StatCard,...}, navbar,
                   sidebar, footer, checkout, course-witzard/WizardStepper
constants/         ROLE_HOME, PERMISSIONS, PLANS, SUBJECTS, LIVE_GAMES, SIGNUP_ROLES, ONBOARDING
types/index.ts     Role, User, Course, Lesson, Badge, Plan…
```

### Infrastructure

* `kidora-api/docker-compose.yml` — postgres:16, redis:7, mailhog, api (build .)
* `kidora-api/Dockerfile` — multi-stage, runs `npx prisma migrate deploy && node dist/main.js`
* `kidora-web/Dockerfile` — multi-stage Next build
* Prisma migrations: `20260726111444_kidora`, `20260729084849_add_school_leader_role`

---

## B. Existing features (verified in code, not assumed)

| # | Area | Status |
|---|---|---|
| 1 | Auth: register/login/refresh/logout/me | ✅ JWT access+refresh, jti blacklist in Redis |
| 2 | MFA (TOTP + SMS), OAuth (Google/GitHub/Microsoft/Apple) | ✅ |
| 3 | RBAC | ✅ `AppRole` enum + `Permission` enum + `ROLE_PERMISSIONS` matrix + `RolesGuard`/`PermissionsGuard` |
| 4 | Multi-tenancy | ⚠️ `User.schoolId` + `School` + `District` models exist, but **no tenant enforcement anywhere** |
| 5 | Parent ↔ child | ✅ `ChildProfile` (`User -ParentChildren-> ChildProfile`) |
| 6 | Teacher | ✅ owns courses (`Course.teacherId`), `/teachers/courses`, `/teachers/students` (demo data) |
| 7 | School | ⚠️ model only — no controller, no service, no dashboard (the `/dashboard/school` page is a marketing landing page) |
| 8 | Course | ✅ `Course` + `Section` + `Lecture` (wizard) **and** `Course` + `Lesson` (learning) |
| 9 | Lesson | ✅ `Lesson` (VIDEO/INTERACTIVE/QUIZ/GAME) + `Resource` |
| 10 | Quiz | ✅ `Quiz`/`QuizQuestion`, server-side scoring, answers stripped on read |
| 11 | Assignment | ❌ none |
| 12 | Exam | ❌ none |
| 13 | Certificate | ✅ minimal (`userId` + `courseName` + `issuedAt`) |
| 14 | Gamification | ✅ points, `RewardWallet` (coins/gems/xp/level), `Badge`/`UserBadge`, `Achievement`, `Mission`, `Transaction` ledger, Redis leaderboard |
| 15 | Quests | ⚠️ `Mission` is a quest-shaped model but is not tied to curriculum |
| 16 | Worlds | ⚠️ `World` enum + `LearningPath` (per-student progress per world), no zones/curriculum link |
| 17 | Payments | ✅ Stripe + PayPal, `Payment`, `Subscription`, `Invoice` |
| 18 | Uploads | ⚠️ `StorageService` (local\|s3) exists; `courses.controller` does its own multer disk upload; **`UploadsModule` is imported by `app.module.ts` but the directory does not exist → the API does not compile** |
| 19 | Analytics | ⚠️ platform totals + one child report; no event stream |
| 20 | Chat / AI tutor / live games | ✅ Socket.IO gateways + Redis adapter |
| 21 | Tests | ⚠️ 3 unit specs (`rbac`, `mfa`, `quizzes`, `ai-tutor`) + 2 e2e; no authorization or tenancy tests |

### Baseline build state (recorded before any change)

```
kidora-api : tsc -p tsconfig.build.json --noEmit
  → src/app.module.ts(16,31): TS2307 Cannot find module './uploads/uploads.module'   (1 error, BUILD BROKEN)

kidora-web : tsc --noEmit
  → 8 pre-existing errors:
     courses/page.tsx ×3          Course.thumbnailUrl missing from the shared type
     create-course/*/page.tsx ×3  StepStatus not assignable to Record<string, boolean>
     SignupModal.tsx              missing @types/react-dom
     Sidebar.tsx                  Record<Role,…> missing SCHOOL_ADMIN / DISTRICT_ADMIN
     lib/axios.ts                 refresh() called with 1 arg, declared with 0
```

Both baselines are fixed as part of this change (see D).

---

## C. Features that can be reused as-is

* Auth, refresh rotation, jti blacklist, MFA, OAuth — **untouched**.
* `AppRole` / `Permission` / `ROLE_PERMISSIONS` / `RolesGuard` / `PermissionsGuard` — **extended, not replaced**.
* `User`, `ChildProfile`, parent↔child relation — **untouched**.
* `Course`, `Section`, `Lecture`, `Lesson`, `Resource`, `Quiz`, `QuizQuestion`, `Progress` — **extended**.
* `Certificate` — **extended** (new nullable columns only).
* `RewardWallet`, `Transaction`, `Badge`, `UserBadge`, `Achievement`, `Mission`, `LearningPath` — **reused as the gamification substrate**.
* `EconomyService.earn()` / `RewardsService.award()` — become the internals of the central reward service.
* `StorageService` (local/s3 driver) — becomes the single upload path.
* `PrismaService`, `CacheService`, `NotificationsService` — reused everywhere.
* `lib/axios.ts` `api` client + TanStack Query + `features/*/hooks.ts` — the pattern all new frontend data access follows.
* Tailwind brand tokens (`brand`/`grass`/`sun`/`coral`, Baloo 2 + Nunito) and `components/ui/*` — the design system all new UI is built from.

## D. Features that need modification

| Thing | Change | Why |
|---|---|---|
| `app.module.ts` | create the missing `uploads/` module it already imports | API currently does not compile |
| `common/enums/role.enum.ts` | add `SCHOOL_LEADER` | present in the Prisma `Role` enum, missing from `AppRole` |
| `common/enums/permission.enum.ts` + `rbac.ts` | add the LMS permission set | Phase 4 |
| `common/decorators/current-user.decorator.ts` | accept an optional field name | so `@CurrentUser('id')` (used by `courses.controller`) works against the canonical decorator |
| `courses.controller.ts` | import guards/decorators from `common/`, not `auth/dto/` | resolve the duplicate-auth conflict without deleting anything |
| `courses.service.ts` | tenant + grade + visibility aware; section/lesson CRUD | Phases 3, 5, 6, 7 |
| `quizzes.service.ts` | attempts, passing score, time limit, shuffling, typed questions | Phase 10 — while keeping the existing `answers:number[]` contract working |
| `progress.service.ts` | route rewards through the central reward service; certificate eligibility rules | Phases 13, 16 |
| `certificates.service.ts` | richer certificate payload + verifiable serial | Phase 13 |
| `rewards.service.ts` | becomes the central reward service (`awardXp`/`awardCoins`/`unlockBadge`/`completeQuest`) | Phase 16 |
| `analytics.service.ts` | school dashboard + teacher dashboard aggregates; event ingestion | Phases 20, 21, 34 |
| `teachers.controller.ts` | real roster from enrollments instead of "all CHILD users" | it currently leaks every child in the platform to any teacher |
| web `types/index.ts` | add the LMS types + `thumbnailUrl` | fixes 3 baseline errors |
| web `Sidebar.tsx` | add SCHOOL_ADMIN / SCHOOL_LEADER / DISTRICT_ADMIN nav | fixes 1 baseline error |
| web `lib/axios.ts` / `auth.store.ts` | `refresh(client?)` signature | fixes 1 baseline error |
| web `courseWizard.store.ts` | index signature on `StepStatus` | fixes 3 baseline errors |

Nothing is deleted. The unwired `auth/dto/*` copy stays on disk (see O).

---

## E. New database models

Extended (new **nullable** columns / new relations only — no drops, no renames):

* `School` — `slug?`, `code?` (unique join code), `city?`, `country?`, `timezone`, `isActive`, `createdAt`, relations to grades/classes/courses/certificates/subscriptions
* `User` — relations only (`enrollments`, `classEnrollments`, `taughtClasses`, `assignmentSubmissions`, `examAttempts`, `quizAttempts`, `activityAttempts`, `studentQuests`, `xpEvents`, `gradeId?`)
* `Course` — `schoolId?`, `gradeId?`, `visibility`, `accessType`, `prerequisiteCourseId?`, `objectives[]`, `sponsorName?`
* `Lesson` — `sectionId?`, `description?`, `content?`, `audioUrl?`, `imageUrls[]`, `documentUrls[]`, `objectives[]`, `estimatedMinutes`, `isRequired`
* `Section` — `description?`, `objectives[]`
* `Quiz` — `courseId?`, `sectionId?`, `description?`, `passingScore`, `timeLimitSec?`, `maxAttempts`, `shuffleQuestions`, `shuffleOptions`, `xpReward`, `coinReward`
* `QuizQuestion` — `type`, `order`, `points`, `explanation?`, `data Json?` (matching/ordering/drag-drop payloads), `correctText?`
* `Certificate` — `courseId?`, `schoolId?`, `serial` (unique), `studentName`, `gradeName?`, `score?`

New:

`Grade`, `SchoolClass`, `ClassEnrollment`, `Enrollment`, `CourseProgress`,
`Activity`, `ActivityAttempt`, `QuizAttempt`, `Assignment`, `AssignmentSubmission`,
`Exam`, `ExamQuestion`, `ExamAttempt`, `Quest`, `StudentQuest`, `XpEvent`,
`AnalyticsEvent`, `AuditLog`, `SchoolSubscription`, `SponsorCampaign`.

New enums: `CourseVisibility`, `CourseAccessType`, `QuestionType`, `ActivityType`,
`SubmissionType`, `SubmissionStatus`, `AttemptStatus`, `QuestStatus`, `XpReason`,
`EnrollmentStatus`. `LessonType` gains `ARTICLE`, `AUDIO`, `RESOURCE` (additive).

## F. Migrations

One additive migration, `add_school_lms`, generated with `prisma migrate dev
--create-only` and reviewed by hand. Constraints:

* No `DROP TABLE`, no `DROP COLUMN`, no column renames, no type narrowing.
* Every added column on an existing table is nullable **or** has a `DEFAULT`.
* New enum values are appended (`ALTER TYPE … ADD VALUE`), never removed.
* Applied in production with `prisma migrate deploy` only. `prisma migrate reset`
  is never used against production.

## G. New backend modules

`schools/` (school + grades + classes + roster + dashboard), `enrollments/`,
`activities/`, `assignments/`, `exams/`, `quests/`, `gamification/` (thin —
re-exports the central reward service), `uploads/` (the missing one),
`common/tenancy/` (TenantService + `SchoolAccessGuard`).

## H. Modified backend modules

`courses`, `lessons`, `quizzes`, `progress`, `certificates`, `rewards`,
`analytics`, `teachers`, `common`, `app.module`.

## I. New frontend routes

Student (game): `/learn`, `/learn/world/[slug]`, `/learn/quest/[id]`,
`/learn/lesson/[id]`, `/learn/quiz/[id]`, `/learn/exam/[id]`, `/learn/certificates`.

Teacher: `/dashboard/teacher/courses/[id]/builder`, `/dashboard/teacher/assignments`,
`/dashboard/teacher/exams`, `/dashboard/teacher/students`, `/dashboard/teacher/analytics`.

School admin: `/dashboard/school/overview`, `/students`, `/teachers`, `/classes`,
`/grades`, `/courses`, `/analytics`, `/settings`.

Parent: `/dashboard/parent/children`, `/dashboard/parent/children/[id]`.

> `/dashboard/school/page.tsx` today renders a **marketing landing page**, not an
> admin dashboard. It is left exactly as it is; the admin surface lives at
> `/dashboard/school/overview` and the sidebar points there.

## J. Modified frontend routes

`/dashboard/teacher` (real data), `/dashboard/teacher/courses` (links to the builder),
`/dashboard/child` (links into `/learn`), `/dashboard/parent` (real child progress),
`/courses` (grade/subject server-side filters).

## K. New UI components

`CourseCard`, `CourseBuilder`, `SectionEditor`, `LessonEditor`, `ProgressBar`,
`XPBar`, `RewardPopup`, `QuestCard`, `WorldMap`, `CertificateCard`, `DataTable`,
`FilterBar`, `EmptyState`, `ErrorState`, `LoadingState`, `Skeleton`, `Select`,
`Textarea`, `Modal`.

## L. New game components

`ActivityRenderer` dispatching on `ActivityType` to `MultipleChoiceActivity`,
`TrueFalseActivity`, `MatchingActivity`, `DragDropActivity`, `OrderingActivity`,
`MemoryActivity`, `PuzzleActivity`, `SimulationActivity`, `DialogueActivity`,
`BossChallengeActivity`; plus `QuizPlayer`, `ExamPlayer`, `AssignmentSubmission`.

No new animation dependency: GSAP and `canvas-confetti` are already installed and
are what the new game UI uses. Drag-and-drop uses the native HTML5 DnD API plus a
keyboard fallback — no new library (Phase 7 / Phase 30).

## M. API endpoints

New, all under the existing `/api` prefix and existing controller conventions:

```
GET    /api/schools/me                      GET  /api/schools/me/dashboard
GET    /api/schools/me/students             GET  /api/schools/me/teachers
GET    /api/schools/me/courses              GET  /api/schools/me/analytics
GET    /api/schools/me/grades               POST /api/schools/me/grades
GET    /api/schools/me/classes              POST /api/schools/me/classes
POST   /api/schools/me/classes/:id/students

POST   /api/courses                         GET/PATCH/DELETE /api/courses/:id
POST   /api/courses/:id/publish             POST /api/courses/:id/unpublish
POST   /api/courses/:id/enroll              GET  /api/courses/:id/builder
POST   /api/courses/:courseId/sections      PATCH/DELETE /api/sections/:id
POST   /api/sections/:sectionId/lessons     PATCH/DELETE /api/lessons/:id
POST   /api/lessons/:lessonId/activities    PATCH/DELETE /api/activities/:id
POST   /api/activities/:id/submit

POST   /api/quizzes  /api/quizzes/:id/start  /api/quizzes/:id/submit
POST   /api/assignments  /api/assignments/:id/submit  /api/assignments/:id/grade
POST   /api/exams  /api/exams/:id/start  /api/exams/:id/submit  GET /api/exams/:id/result
GET    /api/students/me/progress  /api/students/me/certificates  /api/students/me/courses
GET    /api/quests/me   POST /api/quests/:id/start
GET    /api/learn/worlds  GET /api/learn/worlds/:slug
POST   /api/uploads/lesson  /api/uploads/image  /api/uploads/file
POST   /api/analytics/events
```

**Existing endpoints keep their exact shapes.** `GET /courses`, `GET /courses/:id`,
`GET /courses/mine`, `POST /courses/draft`, `PATCH /courses/:id/draft`,
`PATCH /courses/:id/curriculum`, `POST /courses/:id/publish`,
`POST /courses/upload/video|thumbnail`, `POST /quizzes/:id/submit` (still accepts
`{answers:number[]}`), `GET/POST /progress`, `GET /certificates/me`, `/rewards`,
`/missions`, `/achievements`, `/learning-path`, `/auth/*` — all unchanged.

## N. Authorization rules

| Actor | May reach |
|---|---|
| SUPER_ADMIN / ADMIN | everything |
| DISTRICT_ADMIN | schools whose `districtId` matches their school's district |
| SCHOOL_ADMIN / SCHOOL_LEADER | only rows whose resolved `schoolId` equals **their own** `User.schoolId` |
| TEACHER | courses they own, plus classes/students of their own school; may publish only into their own school |
| PARENT | only their own children (`ChildProfile.parentId` / linked child users) |
| CHILD (student) | published courses matching school+grade or an explicit enrollment; only their own attempts/progress/certificates |

Enforcement: `TenantService.resolve(userId)` reads `schoolId` **from the database
on every request** and `SchoolAccessGuard` attaches it to `request.tenant`.
`schoolId` is never read from the request body, query string, or the JWT.

## O. Security concerns

1. **Server-authoritative scoring.** Quiz/exam/activity grading, XP, coins, pass/fail
   and certificate issuance are computed server-side only. Client-supplied `score`,
   `xp`, `coins`, `passed`, `attempts` are rejected by the DTO whitelist.
2. **Answer leakage.** `correct` / `correctText` / `data.correct` are stripped from
   every student-facing read of a quiz, exam, or activity.
3. **Tenant isolation.** Every school-scoped query is filtered by the resolved
   tenant, not by a client value.
4. **Roster leak (existing bug).** `GET /teachers/students` returns every `CHILD`
   user on the platform. Narrowed to the teacher's own school/classes.
5. **Uploads.** MIME allow-list + size caps + generated filenames via `StorageService`;
   no user-controlled path segments.
6. **Child privacy.** Leaderboards expose personal-best and class-challenge framing;
   no "last place", no cross-school ranking, no behavioural ad profiling.
7. **Audit.** `AuditLog` rows for publish/unpublish, grade changes, certificate
   issuance, roster changes, role changes.
8. **Never exposed:** `passwordHash`, `mfaSecret`, `backupCodes`, refresh tokens,
   other schools' student data.

### Conflicts found during inspection (Phase 44 requires these be documented)

1. **Duplicate auth stack.** `src/auth/dto/` contains a second `auth.module.ts`,
   `auth.controller.ts`, `auth.service.ts`, `Jwt.strategy.ts`, `Jwt-auth.guard.ts`,
   `Roles.guard.ts`, `Roles.decorator.ts`, `Current-user.decorator.ts`. `app.module.ts`
   wires `src/auth/auth.module.ts` (the `src/auth/services/*` one), so the `dto/`
   copy is unreachable **except** that `courses.controller.ts` imports its guards and
   decorators. The two `Roles` decorators use different metadata shapes
   (Prisma `Role` vs `AppRole`) but the same `'roles'` metadata key, so the wrong
   guard silently accepting the wrong token shape is a live risk.
   **Resolution (safest existing implementation):** `common/` is canonical.
   `courses.controller.ts` is repointed at `common/`; `common/CurrentUser` gains the
   optional-field form so the call sites keep working. The `auth/dto/*` files are
   **left on disk** (removing them is a separate, reviewable change) and a
   `CONFLICT` note is added at the top of `auth/dto/auth.module.ts`.
2. **Two curriculum shapes.** `Course → Section → Lecture` (teacher wizard) and
   `Course → Lesson` (learning, progress, quizzes, certificates) both exist and are
   disconnected: a course published through the wizard produces `Lecture` rows that
   the student/progress side cannot see.
   **Resolution:** `Lesson` is the canonical learning unit. `Lesson` gains an
   optional `sectionId`, so `Course → Section → Lesson` is one tree. `Lecture` is
   kept and the old wizard endpoints keep writing to it, so nothing already
   published breaks; a backfill copies existing `Lecture` rows into `Lesson` rows.
3. **Two frontend API clients.** `lib/axios.ts` (`NEXT_PUBLIC_API_URL`) and
   `lib/http.ts` (`NEXT_PUBLIC_API_BASE_URL`). **Resolution:** `lib/axios.ts` is
   canonical for all new code; `http.ts` stays for the payment flow that uses it.
4. **`/dashboard/school` is a marketing page, not an admin dashboard** — see I.
5. **`UploadsModule` imported but absent** — the API does not compile. Created.

## P. Migration risks

| Risk | Mitigation |
|---|---|
| Additive migration locks a large table | all new columns are nullable or defaulted; no table rewrite |
| New enum values inside a transaction | `ALTER TYPE … ADD VALUE` statements are emitted before use |
| Existing `Lecture` content invisible to students | idempotent backfill script (`prisma/backfill-lms.ts`), re-runnable, never destructive |
| Existing users have no school/grade | all new FKs are nullable; unassigned users keep working exactly as today |
| Certificates lack a `serial` | backfilled with a deterministic value; column is nullable-then-unique |
| Rollback | the migration only adds; reverting the code leaves unused columns behind, which is safe |

## Q. Deployment changes

No new services, no stack change, no new required environment variable.
`docker compose up` still brings up postgres + redis + mailhog + api; the web
Dockerfile is unchanged. Deploy sequence stays
`prisma migrate deploy` → `node dist/main.js`.
Optional new env vars, all defaulted, are listed in the final report.

## R. Testing strategy

Jest (`kidora-api/jest.config.js`, `*.spec.ts`) with mocked Prisma — the existing
pattern from `quizzes.service.spec.ts`. New suites:

* `tenancy.service.spec.ts` — School A cannot resolve School B
* `school-access.guard.spec.ts` — cross-tenant requests are rejected
* `courses.service.spec.ts` — teacher cannot publish into another school; student
  cannot read an unpublished or out-of-grade course
* `quizzes.service.spec.ts` (extended) — score is server-computed; client-sent
  score/xp is ignored; attempts cap; answers stripped on read
* `exams.service.spec.ts` — attempt limits, time limit, server grading, no self-issued pass
* `assignments.service.spec.ts` — only the owning teacher grades; a student cannot grade
* `certificates.service.spec.ts` — eligibility gate; a student cannot self-issue
* `gamification.service.spec.ts` — XP/coins only via the central service; client values ignored
* `rbac.spec.ts` (extended) — the new permission matrix

**Mobile:** there is no Expo/React Native app in this repository, so Phase 38 has
no code to change. The API additions are transport-agnostic REST + JSON and the
shared types are exported from `kidora-web/src/types` for a future mobile client.
This is reported as unfinished scope rather than silently skipped.
