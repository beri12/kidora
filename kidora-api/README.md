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
`CHILD · PARENT · TEACHER · SCHOOL_ADMIN · DISTRICT_ADMIN · SUPER_ADMIN` (+ legacy `ADMIN`).
Permission matrix in `src/common/constants/rbac.ts`.

## Run (dev)
```bash
cp .env.example .env
npm install
docker compose up -d postgres redis mailhog
npm run prisma:migrate
npm run db:seed
npm run start:dev        # http://localhost:4000/api  · docs /api/docs
```
Seeded logins (password `password123`): `admin@ / teacher@ / parent@ / child@kidora.com`
MailHog UI: http://localhost:8025

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
- Google/GitHub/Microsoft/Apple OAuth, SMS MFA, and S3 storage are scaffolded in
  config/enums/.env — supply credentials to enable.
- Stripe webhook needs the raw body (enabled via `rawBody: true` in main.ts). Use
  `stripe listen --forward-to localhost:4000/api/payments/stripe/webhook` in dev.
