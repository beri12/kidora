# Kidora Mobile — architecture

```
SCREEN (app/…)            ← Expo Router file routes, one group per role
  ↓
FEATURE HOOK (hooks/…)    ← useStudentDashboard(), useCompleteLesson(), …
  ↓
TANSTACK QUERY            ← cache, retries, pagination, optimistic updates, persistence
  ↓
SERVICE (services/…)      ← typed calls, one file per domain
  ↓
API CLIENT (services/api.ts) ← auth header, refresh, ApiError normalisation
  ↓
NESTJS API → PostgreSQL
```

Local UI state goes **SCREEN → ZUSTAND** (`store/`): auth principal, settings,
celebrations, offline queue, notification prefs, selected child. Server data is
never copied into Zustand.

Forms go **FORM → React Hook Form → Zod (`features/auth/schemas.ts`) → SERVICE**.

## Folders

| Folder | Contents |
|---|---|
| `app/` | Routes only. `(auth)`, `(student)`, `(parent)`, `(teacher)`, `(school-leader)`, `(district-leader)`, `modal/` |
| `components/ui` | Design system: Button, Card, Avatar, Badge, ProgressBar, XPBar, LevelBadge, StatCard, Skeleton, Empty/Error/LoadingState, Modal, BottomSheet, Toast, TextField… |
| `components/game` | IslandCard, IslandMap, MapNodeButton, CelebrationOverlay, Confetti, LeaderboardRow, RewardCard, QuestCard, AvatarPicker, StreakWeek |
| `components/lms` | LessonCard, CourseCard, SubjectCard, ContentBlock (text/image/audio/video/code/callout/question), QuestionView |
| `components/charts` | SVG LineChart, BarChart, DonutChart, ProgressRing (sized by container) |
| `features/` | Feature modules: `game/` (engine seam, islands, map math), `offline/` (sync engine), `notifications/`, `analytics/`, `audio/`, `ai/`, `auth/` forms, role dashboards |
| `hooks/` | TanStack Query hooks per domain + `useT`, `useResponsive`, `useReducedMotionPref` |
| `services/` | `api.ts` + one service per backend domain |
| `store/` | Zustand stores |
| `lib/` | Pure helpers: roles, errors, level curve, secure storage, logger, safe links, query client |
| `i18n/` | Translation abstraction + `en`, `am` |
| `theme/` | colors, typography, spacing, radius, shadows, motion tokens |
| `types/` | API contracts (mirroring `kidora-api` responses) |

## Roles

The backend `Role` enum is mapped once in `lib/roles.ts`:

| Backend | Mobile experience |
|---|---|
| `CHILD` | STUDENT |
| `PARENT` | PARENT |
| `TEACHER` | TEACHER |
| `SCHOOL_ADMIN`, `SCHOOL_LEADER` | SCHOOL_LEADER |
| `DISTRICT_ADMIN` | DISTRICT_LEADER |
| `ADMIN`, `SUPER_ADMIN` | none → "use the web console" |

Authorization is layered:
1. **Root stack** registers each role group only for its role (`Stack.Protected`).
2. **Group layout** wraps in `RoleGate` (deep links, stale state).
3. **Parent child screens** check ownership (`useOwnChild`).
4. **The backend** is the authority (`RolesGuard`, `tenancy.assertParentOf`, …).
   The UI never relies on hiding elements alone.

## Game layer

`features/game/engine.ts` defines `GameRenderer { kind, isSupported, Scene }`.
The MVP registers a 2D renderer (`components/game/IslandMap.tsx`: one SVG path +
positioned nodes, Reanimated pulses, no game loop). A Unity-as-a-library view,
an R3F/expo-gl scene or a native module registers the same contract;
`selectRenderer()` picks the best supported one. Islands are data-driven: new
`World` keys from the API render automatically.

## Offline

* TanStack Query cache persisted to AsyncStorage (non-sensitive roots only,
  3-day max age, `networkMode: offlineFirst`).
* `expo-network` → `networkState` → `onlineManager` + offline banner.
* Queue (`store/offlineStore.ts`, persisted): lesson progress, lesson
  completion, content completion, notification reads. Only idempotent
  actions are queued (server dedupes rewards per lesson+student; progress
  only moves forward). Coalescing, exponential backoff, permanent-4xx drop,
  replay on reconnect / foreground / sign-in. Quiz submissions are never
  queued (timed, graded server-side).
* Replayed completions play their rewards when they land.

## Performance on low-end Android

Hermes, lazy tabs, FlatList with windowing for every long list, memoised
rows, expo-image disk caching + `recyclingKey`, vector art instead of bitmaps
(no bundled images beyond icons), animations on the UI thread only
(Reanimated shared values), ≤ 28 confetti pieces, charts downsampled to
≤ 60 points, a data-saver mode, and reduced-motion support everywhere.
