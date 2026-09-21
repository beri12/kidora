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
  (auth)/join                       # THE entry point: phone → code → role
  (auth)/login                      # sign in (phone first, email/password behind a tap)
  (auth)/auth/callback              # social login lands here with the tokens
  (auth)/pending                    # waiting on school / district approval
  (auth)/register                   # legacy email + password signup
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
components/  ui · auth (PhoneField · CountryPicker · OtpInput · RolePicker · AuthShell) ·
             navbar · sidebar · shared
features/    auth · courses · teachers · payments · avatar · rewards ·
             ai-tutor · subscription · students · games   (typed React Query hooks)
hooks/       useRequireAuth · useLiveGame
lib/         axios.ts · query-client.ts · utils.ts
stores/      auth.store.ts · ui.store.ts   (Zustand, persisted)
types/  constants/  providers/     # constants/countries.ts = 238 dial codes + flags
```

## Signing in
There is one door: **`/join`**. A visitor types a phone number, gets a 6-digit code by SMS,
and is in — no password, and no "are you a parent / teacher / school?" question before the
account even exists. That question (`How will you use Kidora?`) is asked once, *after*
sign-in, and only for accounts the API flags with `needsRole`.

Parent and teacher are granted immediately. **School Leader and District Leader are not**:
picking one leads to `OrgVerifyForm`, where an organisation code admits them at once or
their details go for review, and then to `PendingApproval` — which polls every 30 seconds
and on window focus, so an approval that lands while the tab is open just opens the door.
The account keeps its existing role for the whole wait; nothing is granted until a reviewer
says so.

The country picker in `constants/countries.ts` covers every dial code. Flags are not
shipped as images: `flagEmoji('ET')` maps the ISO code onto regional indicator symbols, so
a flag can never go missing or drift out of sync with its country. Search matches a
country name, an ISO code or a dial code (`eth`, `ET`, `+251` all find Ethiopia), and the
list is fully keyboard-driven.

`toE164(dial, national)` drops leading zeros before building the number sent to the API:
people write `0911 22 33 44` for a number that is `+251911223344` internationally, and
typing that trunk prefix is the most common way to have an OTP delivered nowhere.

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
