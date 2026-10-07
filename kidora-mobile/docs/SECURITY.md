# Security, privacy & child safety

Kidora is used by children. These are the rules the app enforces.

## Credentials
* Access/refresh tokens live **only** in Expo SecureStore (Keychain /
  Keystore, `WHEN_UNLOCKED_THIS_DEVICE_ONLY` — not in backups). Never in
  AsyncStorage, never in logs. The web preview keeps them in memory only.
* `lib/logger.ts` redacts password/token/otp/code/secret keys and is silent in
  release builds.
* Refresh is single-flight; on refresh failure the app wipes tokens, the
  query cache, game state, the offline queue (so one child's progress is never
  replayed under another account) and returns to sign-in.
* Logout revokes server refresh tokens (`POST /auth/logout`) and still wipes
  locally when offline.

## Transport & configuration
* Release builds refuse a non-HTTPS API URL and fall back to
  `https://api.justkidora.com/api` (`config/env.ts`).
* Only `EXPO_PUBLIC_*` non-secret values exist in the app. No OpenAI or other
  provider keys — every AI call goes to `POST /lms/ai/tutor`.

## Authorization
UI gating (protected stacks, `RoleGate`, `useOwnChild`) mirrors — never
replaces — the backend's `RolesGuard` and tenancy checks.

## Children's data
* Registration never asks a student for a phone number.
* Leaderboards show display/first names only; the global board's full names
  are reduced to first names on arrival.
* Analytics props are allow-listed primitives (ids, counts, flags) — no
  names, emails, answers or chat text.
* AI conversation history is not persisted to disk on the device.
* No location, contacts, camera or microphone permissions (blocked in
  `app.config.ts`); iOS privacy manifest declares no tracking.

## AI safety (Kai)
* Backend-enforced system prompt (school subjects only, no personal info,
  hints not answers), per-school daily limits, server logging.
* App: plain-text rendering only (no links/HTML), visible safety notice,
  "Report this answer" on every reply (API GAP #6), offline-disabled input,
  2 000-char cap.

## Content & links
* Lesson HTML is stripped to text before display.
* External links open only for `justkidora.com` HTTPS hosts, in an in-app
  browser (`lib/safe-links.ts`); everything else is blocked.
* No direct messaging between children.
