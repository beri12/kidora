# Kidora API (NestJS)

Production-grade backend for **Kidora** — an AI-powered learning ecosystem for children,
parents, teachers, schools, and districts. (Evolved from `children-learning-api`.)

## Stack
- **NestJS 10** modular architecture
- **PostgreSQL + Prisma**
- **Redis** (ioredis) — cache, token blacklist, leaderboard, live-game room state
- **Auth** — JWT access + refresh, **RBAC** (6 roles + permission guards), **MFA (TOTP)**,
  account lockout, login history, token revocation, OAuth scaffolds
- **AI Tutor (Kai)** — chat endpoint with conversation history + lesson recommendations
  (provider-agnostic; kid-safe offline fallback when no `AI_API_KEY`)
- **Avatar system** — config, item catalog, inventory, equip
- **Reward economy** — coins/gems/XP wallet, transaction ledger, shop purchases,
  missions, achievements, leaderboard
- **Subscriptions & payments** — Stripe checkout + webhook, PayPal orders/capture,
  invoices; both activate the plan and email a confirmation on success
- **Learning paths** — 5 fantasy worlds with per-student progress + unlock gating
- **Uploads** — teacher video/document/image uploads attached to lessons
- **Live games** — socket.io gateway with Redis-synced multiplayer rooms + REST results
- **Swagger** at `/api/docs`

## Roles
`CHILD · PARENT · TEACHER · SCHOOL_ADMIN · SCHOOL_LEADER · DISTRICT_ADMIN · SUPER_ADMIN` (+ legacy `ADMIN`).
Permission matrix in `src/common/constants/rbac.ts`.

Roles are **not** chosen before an account exists. Phone and social sign-ups land with the
default `PARENT` role and `roleConfirmed = false`; the web app then asks "How will you use
Kidora?" and posts the answer to `POST /api/auth/role`, which records it once and re-issues
the token pair (the role is a JWT claim). `CHILD`, `ADMIN` and `SUPER_ADMIN` can never be
self-assigned — children join through a parent or a school.

`PARENT` and `TEACHER` are granted straight away. **`SCHOOL_ADMIN`, `SCHOOL_LEADER` and
`DISTRICT_ADMIN` are not** — see below.

## Administrative access is verified

    Create account → choose role → School / District Leader
      → verification or invitation → pending → approved → permissions on

Asking for an administrative role does not grant it. `POST /auth/role` answers
`needsVerification` and leaves `user.role` untouched; the claim is recorded by
`POST /org/requests` as an `OrgAccessRequest`, and the role is written onto the account
**only** by an approval. An unapproved claim carries no permissions at any point.

Two ways through:

| Path | What happens |
|---|---|
| **Invitation** — request carries a valid `School.joinCode` / `District.joinCode` | Approved in the same transaction. The organisation vouched for the person by handing over the code. |
| **Application** — organisation name, job title, work email, website, optional evidence file | Sits at `PENDING` until Kidora staff decide. |

Reviewing lives under `/api/admin/org-requests` and is restricted to `ADMIN` / `SUPER_ADMIN`
— the roles it hands out must never be able to hand them out further. Approving creates the
school (with a join code and grades 1–8) or the district, links the user, writes the role,
notifies the applicant and records an `AuditLog` entry. Refusing requires a reason, which
the applicant sees; they may then apply again.

Because the role is a JWT claim, an approval takes effect on the account's next token
refresh — `POST /auth/refresh` reads the role from the database rather than copying it out
of the token it is replacing, which is also what stops a disabled account from refreshing
its way back in.

## Sign-in methods
Email + password (with an emailed 6-digit code to confirm the address), Google, Facebook
and TikTok. **Phone-number sign-in has been removed**: the `/auth/phone/*`, `/auth/otp/*`
and SMS-MFA routes no longer exist and `/auth/login` takes an email only. The `User.phone`
column is kept (nothing is deleted), but it is no longer a way in — an older account that
only ever had a phone number needs an email added by support, or can sign in with Google.
Twilio is now only used for optional organisation-request notices.

## Email verification
`POST /auth/register` creates the account unverified and emails a 6-digit code; it returns
`{ needsEmailVerification, email, maskedEmail, resendIn }` and **no tokens**.
`POST /auth/email/verify` checks the code and signs in; `POST /auth/email/resend` sends a
new one (and answers identically for unknown addresses). A correct password on an
unverified account gets `403 { code: "EMAIL_NOT_VERIFIED", … }` and a fresh code, so the
web app goes straight to the code step. Same limits as SMS codes, with a 10-minute expiry.
Accounts that existed before this change are marked verified by migration.

## Pricing
Every plan on `/pricing` lives in the `SubscriptionPlan` table and is served by
`GET /pricing` — no price is hard-coded in the web app. Prices are integers in the
currency's minor units, with the currency stored per plan; a null price means "custom".
Stripe and PayPal checkout charge the price read from the same row, and a payment
turns into a plan only through `PaymentSettlementService`. That service checks the
provider's amount, currency and payer against the `Payment` row written at checkout,
and it is idempotent, so a webhook delivered twice grants once. The first rows come
from the migration `20260926100000_subscription_plans`; change a price by updating
its row (an admin pricing screen is planned).

## Social sign-in (Google, Facebook, TikTok)
Set `<PROVIDER>_CLIENT_ID` and `_CLIENT_SECRET` (TikTok: `TIKTOK_CLIENT_KEY`; Facebook:
`FACEBOOK_APP_ID` / `_APP_SECRET` also work); the redirect URI to register is printed at
startup. Linked identities are rows in `SocialAccount` (unique per provider + provider id),
so one Kidora user can hold Google, TikTok and a phone number at once. The callback never
puts tokens in the URL: it redirects with a one-time code (60 s, single use) that the web
app trades at `POST /auth/oauth/exchange`. The OAuth `state` is HMAC-signed and bound to the browser by a short-lived
httpOnly cookie (login-CSRF protection). A cancelled or failed round trip lands on
`/auth/callback#error=cancelled|failed` with a readable message instead of a JSON 401.
When a provider's verified email matches an account whose address was never verified,
the address is marked verified and that account's unproven password is removed.

**Google "invalid_request"** almost always means the redirect URI is http or not
registered. Set `API_URL=https://<your api host>/api` (behind a proxy, `TRUST_PROXY=1`),
restart, and register exactly the `…/auth/google/callback` URI the boot banner prints in
Google Cloud Console → Credentials → OAuth client → Authorized redirect URIs. TikTok needs
the same for `…/auth/tiktok/callback` in the TikTok developer portal (and, while the app
is in sandbox, the testers added as target users).

## Chapa payments
`POST /payments/chapa/checkout { plan }` prices the plan from `SubscriptionPlan`, writes a
pending `Payment` (`externalId` = `tx_ref`) and returns Chapa's `checkout_url`. After paying,
Chapa sends the child's grown-up to `/payment/return`, which calls
`GET /payments/chapa/verify/:txRef`; Chapa's own callback and the signed webhook
(`x-chapa-signature`, HMAC of `CHAPA_WEBHOOK_SECRET`) do the same. Every path re-verifies
with Chapa and settles through `PaymentSettlementService`, so the amount, currency and
payer must match and a payment grants its plan once. Plan prices are USD; your Chapa
account must accept USD, or change the plan rows to ETB.

## Learning games
Five games (Math Treasure Rush, Word Safari, Science Lab, Code City, Africa History
Quest), 3 levels × 6 challenges each, synced into the `Game*` tables at boot. Answers are
judged by the server (`solution` is never sent), so XP, stars, streaks, badges and mastery
(`StudentSkill`) can't be forged; implausibly fast levels earn no XP. Parents and teachers
read progress at `GET /games/students/:id/progress` and `GET /games/classes/:id/mastery`.

## Passwords and sessions
`POST /auth/password/forgot` emails a reset code (identical answer for unknown addresses);
`POST /auth/password/reset` sets the new password, ends every other session and signs in.
Refresh tokens rotate: each one works once, and presenting a used one revokes all of that
user's sessions. The spec's endpoint names are aliases of the existing handlers:
`/auth/phone/request-otp`, `/auth/phone/verify-otp`, `/auth/email/login`,
`/auth/email/register`, `/users/role`.

## Students
Students create their own account (email or social), pick **Student**, then give their date
of birth (ages 3–18) and grade, both required by `POST /auth/role`. A school is optional:
- with the school's **join code** they join it at once;
- picked from `GET /schools/search` without a code, it is only a request
  (`User.requestedSchoolId`) — no school courses or school plan until a school leader
  approves it at `POST /school/join-requests/:userId/approve`.

## Course access codes and assignments
Every course can have a code like `CPP-7K4M9X` (title prefix + 6 random characters from an
alphabet without 0/O/1/I/L; never derived from ids). Teachers, co-instructors, the course's
school leaders and admins manage it: `GET /courses/:id/access-code`,
`POST /courses/:id/access-code/rotate` (create/replace — the old code dies at once),
`PATCH /courses/:id/access-code {enabled}`.

A student joins with `POST /courses/access-code/join {code}` (case and dash insensitive).
The code opens invite-only courses but never overrides the other rules: school-only still
needs the school, premium still needs a plan (or the student's own school), prerequisites
still apply. Ten wrong codes in an hour locks a student out for the hour, on top of a per-IP
throttle.

`POST /courses/:id/assign {studentIds}` lets a parent (linked children), teacher (students
in their classes), school leader (their school) or admin enrol students; the assigner must be
responsible for every student. Teachers and school leaders may assign their own courses
whatever the access mode; anyone else only what the student could open anyway.

Each `CourseEnrollment` records `source` (SELF, ACCESS_CODE, PARENT, TEACHER, SCHOOL,
SCHOOL_LEADER, CLASS, ADMIN) and `assignedById`. The public catalogue (`GET /courses`,
`GET /courses/:id`) only shows published FREE/PREMIUM courses, and `POST /courses/:id/enroll`
now applies the same access rules as `/learning`.

## Run (dev)
```bash
cp .env.example .env          # every variable the code reads is listed there
npm install
docker compose up -d postgres redis mailhog
npm run prisma:migrate
npm run db:seed
npm run start:dev        # http://localhost:4000/api  · docs /api/docs
```
Seeded logins (password `password123`): `admin@ / teacher@ / parent@ / child@kidora.com`
MailHog UI: http://localhost:8025

## Testing the whole sign-up chain

`scripts/e2e-auth-flow.sh` walks every step against a running API and asserts on each
one — phone sign-in, the OTP limits, the role step, verification, pending, approval,
the invitation shortcut, refusal, the upload rules and the role guards:

```bash
AUTH_TEST_EXPOSE_OTP=true npm run start:dev   # in another terminal
npm run test:e2e:flow        # or ./scripts/e2e-auth-flow.sh
```

It needs Twilio unset and `AUTH_TEST_EXPOSE_OTP=true`, because it reads each code out of
the `devCode` field — the one test-only hook that returns a code, refused in production. It also paces itself: `/auth/phone/start` allows 6 requests a minute
per IP and the run needs about ten, so it waits between them — expect a few minutes.
It exits non-zero if anything fails.

Every run uses its own block of numbers (`+2519<run><n>`), so repeated runs never
collide and nothing has to be cleaned up in between. To remove them all later:

```sql
DELETE FROM "OrgAccessRequest" WHERE "userId"  IN (SELECT id FROM "User" WHERE phone LIKE '+2519%');
DELETE FROM "AuditLog"         WHERE "actorId" IN (SELECT id FROM "User" WHERE phone LIKE '+2519%');
DELETE FROM "User"             WHERE phone LIKE '+2519%';
```

The web app has a companion that clicks the same chain in a real browser —
`kidora-web/scripts/walkthrough.mjs`.

## Run (full stack)
```bash
docker compose up --build
```

## Module map (src/)
| Area | Path |
|---|---|
| Config | config/*.config.ts |
| Common (RBAC, guards, filters) | common/ |
| Database (Prisma) | database/ |
| Infra (cache, storage, email, sms) | infrastructure/ |
| Auth (JWT, MFA, strategies) | auth/ |
| Users / Teachers | users/, teachers/ |
| Courses / Lessons / Uploads | courses/, lessons/, uploads/ |
| Progress / Quizzes / Certificates | progress/, quizzes/, certificates/ |
| **Avatar** | avatar/ |
| **Reward economy** (wallet/shop/missions/achievements) | economy/ |
| **AI Tutor** | ai-tutor/ |
| **Learning paths** | learning-path/ |
| **Subscriptions / Invoices** | subscriptions/, invoices/ |
| Payments (Stripe + PayPal) | payments/ |
| Live games (socket.io + REST) | games/ |
| Rewards (badges + leaderboard) | rewards/ |
| Notifications / Analytics | notifications/, analytics/ |
| Health | health/ |

## Key endpoints
- **Auth** — `POST /api/auth/register|login|refresh|logout`, `GET /api/auth/me`, `POST /api/auth/mfa/setup|enable`
- **Phone auth** — `POST /api/auth/phone/start`, `POST /api/auth/phone/verify`, `POST /api/auth/role`
- **Social** — `GET /api/auth/google|facebook|tiktok|github|microsoft|apple` (+ `/callback`)
- **Learning** — `GET /api/courses`, `GET /api/lessons/:id`, `GET/POST /api/progress`, `GET /api/learning-path`
- **Games** — `GET /api/games`, `POST /api/games/:id/result`; socket.io `/games` (join/ready/answer/leave)
- **Avatar** — `GET/PUT /api/avatar`, `GET /api/avatar/items`, `GET /api/inventory`, `POST /api/inventory/:itemId/equip`
- **Rewards** — `GET /api/rewards`, `POST /api/rewards/purchase`, `GET /api/missions`, `POST /api/missions/:id/complete`, `GET /api/achievements`, `GET /api/leaderboard`
- **AI** — `POST /api/ai/chat`, `GET /api/ai/chat/history`
- **Subscriptions** — `GET /api/subscriptions`, `GET /api/subscriptions/usage`, `POST /api/subscriptions`, `POST /api/subscriptions/cancel`
- **Payments** — `POST /api/payments/stripe/checkout`, `POST /api/payments/stripe/webhook`, `POST /api/payments/paypal/order|capture`
- **Invoices** — `GET /api/invoices`, `GET /api/invoices/:id/pdf`
- **Admin** — `GET /api/admin/users`, `GET /api/analytics/platform`

## Frontend integration
The `children-learning-web` (Kidora web) app consumes these via typed React Query hooks in
`src/features/*`: `useStudentProgress`, `useAvatar`, `useInventory`, `useRewards`,
`usePurchase`, `useMissions`, `useAchievements`, `useAITutor`, `useSubscription`,
`useInvoices`, `useGames`. Set `NEXT_PUBLIC_API_URL=http://localhost:4000/api`.

## Notes
- **AI Tutor** works offline (heuristic replies) until you set `AI_API_KEY` + wire your LLM
  provider in `ai-tutor.service.ts` (`generate()`), using a kid-safe system prompt.
- Google/Facebook/TikTok/GitHub/Microsoft/Apple OAuth, SMS MFA, and S3 storage are
  scaffolded in config/enums/.env — supply credentials to enable. Each provider
  self-disables until its `*_CLIENT_ID` is set. TikTok calls its client id a *client key*;
  set it as `TIKTOK_CLIENT_ID` and the strategy sends it under the name TikTok expects.
- `User.email` is nullable: an account created from a phone number has no email address.
  Anything that emails a user must check for one first.
- One Redis serves the cache, the socket.io adapter and the rate limits.
  Set `REDIS_URL` (or `REDIS_HOST`/`REDIS_PORT`) — either works everywhere
  now; they used to be read in different places, so setting only one left
  part of the app pointing at localhost.
- `npm run lint` works in both apps. It never did before: the API had no
  ESLint config at all, and the web app dropped into an interactive setup
  prompt.
- Stripe webhook needs the raw body (enabled via `rawBody: true` in main.ts). Use
  `stripe listen --forward-to localhost:4000/api/payments/stripe/webhook` in dev.
