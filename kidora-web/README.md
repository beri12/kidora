# Kidora — Web (Next.js)

Frontend for **Kidora**, an AI-powered learning ecosystem for children, parents, teachers,
schools, and districts. Next.js 15 (App Router) + TypeScript, Tailwind v3, shadcn-style UI,
Zod, Zustand, TanStack Query, GSAP, Three.js (R3F), socket.io-client, Stripe & PayPal.
Talks to the **`kidora-api`** NestJS backend.

## Run
```bash
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL + payment keys
npm install
npm run dev                  # http://localhost:3000
```
Point `NEXT_PUBLIC_API_URL` at the Kidora API (default `http://localhost:4000/api`).

## Folder structure (`src/`)
```
app/
  (auth)/auth/signup                # create account (email or Google / Facebook / TikTok)
  (auth)/auth/signup/role           # "How will you use Kidora?"
  (auth)/auth/signup/profile        # student info / school / leader verification
  (auth)/auth/signup/complete       # done → dashboard
  (auth)/auth/login                 # welcome back (email + password, remember me)
  (auth)/auth/forgot-password, reset-password
  (auth)/auth/callback              # social login lands here with a one-time code
  (auth)/pending                    # waiting on school / district approval
  (auth)/login, join, signup, register  # old URLs, redirect to /auth/*
  dashboard/                        # role router + per-role dashboards
    admin, teacher, teacher/upload, parent, child
  courses/                          # catalog (premium-gated)
  students/                         # teacher/admin roster
  games/, games/live/[slug]         # games index + live socket.io room
  avatar/                           # avatar builder  → /avatar, /inventory API
  rewards/                          # wallet + shop + missions + achievements
  ai-tutor/                         # Kai chat  → POST /ai/chat
  account/                          # subscription + usage + invoices
  pricing/                          # Stripe + PayPal checkout
  layout.tsx, page.tsx, globals.css
components/  ui · auth (kidora/ layouts · ui · illustrations, SignupForm, LoginForm, CodeStep, SchoolSearch) ·
             navbar · sidebar · shared
features/    auth · courses · teachers · payments · avatar · rewards ·
             ai-tutor · subscription · students · games   (typed React Query hooks)
hooks/       useRequireAuth · useLiveGame
lib/         axios.ts · query-client.ts · utils.ts
stores/      auth.store.ts · ui.store.ts   (Zustand, persisted)
types/  constants/  providers/
```

## Signing in
Email + password or Google / Facebook / TikTok — phone sign-in has been removed.
`/auth/signup` creates the account and emails a 6-digit code; after it comes
**How will you use Kidora?** (`/auth/signup/role`), then the profile step: students give
date of birth and grade and may pick their school (a request the school approves, or joined
at once with the school code), teachers may pick a school, and School / District Leaders go
to `OrgVerifyForm` — an organisation code admits them at once, otherwise their details are
reviewed and they wait on `/pending`. Nothing administrative is granted by choosing a card.

"Remember me" keeps the session in localStorage; without it the session lives in
sessionStorage and ends with the browser. `?next=` is only followed for same-site paths.

Students join courses with a teacher's code on their dashboard ("Have a course code?"),
teachers manage the code on the course's Publish step, and parents add courses for their
child from the parent dashboard. The server decides every one of these.

## Testing the sign-up chain in a browser

`scripts/walkthrough.mjs` signs up as each role through the real pages — form, emailed code,
role, profile, complete, dashboard — asserting each step and writing screenshots:

```bash
npm run dev                  # this app
# ...and the API with AUTH_TEST_EXPOSE_OTP=true (development only)
npm run walkthrough          # CHROME=/path/to/chromium if Playwright can't find one
```

The API has its own end-to-end script for the same chain plus course codes, assignment
rules and access checks — `kidora-api/scripts/e2e-auth-flow.sh`.

## Backend integration
`lib/axios.ts` creates one client pointed at `NEXT_PUBLIC_API_URL`, attaches the JWT from
`stores/auth.store.ts` on every request, and on a 401 performs a single refresh + replay.
Every screen reads live data through typed hooks in `features/*`:

| Hook | Endpoint |
|---|---|
| `useStudentProgress` / `useStudentProfile` | `/learning-path`, `/users/me` |
| `useAvatar` / `useInventory` / `useAvatarItems` | `/avatar`, `/inventory`, `/avatar/items` |
| `useRewards` / `usePurchase` | `/rewards`, `/rewards/purchase` |
| `useMissions` / `useAchievements` | `/missions`, `/achievements` |
| `useAITutor` / `useAIHistory` | `/ai/chat`, `/ai/chat/history` |
| `useSubscription` / `useInvoices` | `/subscriptions`, `/invoices` |
| `useGames` / `useSubmitGameResult` | `/games`, `/games/:id/result` |
| `useLiveGame` | socket.io `/games` gateway |

## Requires the backend
Start **`kidora-api`** first (auth, courses, uploads, payments, avatar, rewards, AI tutor,
subscriptions, socket.io). Delivered separately.
