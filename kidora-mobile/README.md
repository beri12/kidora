# Kidora Mobile

The Kidora iOS & Android app — game-based, AI-assisted learning for children,
with experiences for **students, parents, teachers, school leaders and
district leaders** in one Expo application with role-based routing.

Built with Expo SDK 57 · React Native 0.86 · TypeScript (strict) · Expo Router ·
TanStack Query · Zustand · React Hook Form + Zod · NativeWind · Reanimated 4 ·
Gesture Handler · SecureStore · Notifications · expo-audio / expo-video ·
expo-image · Haptics · Localization · Network · react-native-svg · Lottie.

It talks to the existing NestJS backend in `../kidora-api` (no backend changes
were made). Endpoints that don't exist yet are listed in
[`docs/API-GAPS.md`](docs/API-GAPS.md); the app degrades gracefully until
they ship.

## Quick start

```bash
cd kidora-mobile
cp .env.example .env          # point EXPO_PUBLIC_API_URL at your API
npm install
npx expo start                # then press a / i, or scan with a dev build
```

Android emulator → local API: `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000/api`.
Native modules (SecureStore, notifications, video…) need a **development
build**: `eas build --profile development` or `npx expo run:android`.

## Scripts

| Command | What it does |
|---|---|
| `npm start` / `npm run android` / `npm run ios` | Expo dev server |
| `npm run typecheck` | `tsc --noEmit` (strict, `noUncheckedIndexedAccess`) |
| `npm run lint` | ESLint (expo config + React Compiler rules) |
| `npm test` | Jest + React Native Testing Library (unit, integration, component) |
| `npm run verify` | typecheck + lint + tests |
| `npm run e2e:maestro` | Maestro E2E flows (see `e2e/README.md`) |
| `npm run build:dev|build:preview|build:prod` | EAS builds |

## What's inside

* **Auth** — email/phone + password (with MFA code), SMS OTP, social sign-in
  architecture (Google/Facebook/TikTok/Apple via `/auth/providers`),
  registration for all five roles, forgot/reset password, session restore,
  single-flight token refresh, secure logout.
* **Student** — playful dashboard (greeting, avatar, level/XP, streak,
  continue learning, recommendations, daily challenge, current island, Kai,
  recently completed, achievements, rewards, leaderboard), Kidora Islands,
  animated 2D island map, lesson player (text, images, audio, video,
  activities, questions), quizzes & final exams, Kai AI tutor, achievements &
  badges, leaderboards (class/school/everyone), rewards & quests, profile with
  avatar customisation, settings.
* **Gamification** — XP/levels (mirrors the server curve), coins, streaks,
  quests, celebrations (XP pop, level-up, achievements, confetti, Lottie,
  haptics, sound), all respecting reduced-motion and sound settings.
* **Parent** — child selector, KPIs, weekly activity, subject progress,
  strengths / needs practice, recommendations, child profile (progress,
  performance, activity, achievements), progress charts, reports.
* **Teacher** — dashboard, classes, class drill-down (students, performance,
  top learners, interventions), students, student drill-down, assignments
  (create), quizzes, analytics.
* **School leader** — dashboard, students, teachers, classes, courses (approve
  reviews), analytics, reports.
* **District leader** — dashboard (DAU/WAU/MAU, outcomes), school comparison,
  schools, students, teachers, analytics with school/grade/subject/date filters,
  reports.
* **Platform** — offline queue + persisted cache, push & local notifications
  with tap routing and per-category preferences, deep links
  (`kidora://lesson/123`, `kidora://island/math`, `kidora://achievement/456`)
  and universal links (`https://justkidora.com/app/...`), i18n (English +
  Amharic, backend-bundle ready), privacy-safe `analytics.track()`.

## Docs

* [Architecture](docs/ARCHITECTURE.md)
* [API gaps (backend TODO)](docs/API-GAPS.md)
* [Security, privacy & child safety](docs/SECURITY.md)
* [Internationalisation](docs/I18N.md)
* [Building & releasing](docs/RELEASE.md)
* [E2E tests](e2e/README.md)
