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
  (auth)/login, (auth)/register     # auth pages (Zod-validated)
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
components/  ui · navbar · sidebar · shared
features/    auth · courses · teachers · payments · avatar · rewards ·
             ai-tutor · subscription · students · games   (typed React Query hooks)
hooks/       useRequireAuth · useLiveGame
lib/         axios.ts · query-client.ts · utils.ts
stores/      auth.store.ts · ui.store.ts   (Zustand, persisted)
types/  constants/  providers/
```

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
