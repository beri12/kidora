# API gaps — backend work the mobile app needs

The mobile app was built against the existing NestJS API in `kidora-api/`
(controllers inspected directly; responses typed in `types/`). Everything
below is **missing or web-only** today. The app already calls the proposed
endpoint and degrades gracefully (fallback, "coming soon", or silent retry)
until the backend ships it — no app release is needed when it lands.

| # | Endpoint | Priority | Mobile behaviour until it exists |
|---|----------|----------|----------------------------------|
| 1 | `POST /auth/password/forgot`, `POST /auth/password/reset` | **High** | Forgot-password screen shows a neutral confirmation; reset shows the error |
| 2 | `redirect_uri` support on `GET /auth/{google,facebook,tiktok,apple}` | **High** | Social buttons appear (from `/auth/providers`) but finish on the web callback |
| 3 | `/district/*` (dashboard, schools, school/:id, students, teachers, analytics) | **High** | District screens show "District analytics are coming soon" on 404 |
| 4 | `POST /notifications/push-tokens`, `DELETE /notifications/push-tokens/:token` + server-side push fan-out | **High** | Token is fetched and kept locally; local daily reminder works; no server push |
| 5 | `POST /analytics/events` | Medium | Events buffered on device (max 200), retried, never block the UI |
| 6 | `POST /lms/ai/tutor/report` | **High** (child safety) | Report sheet thanks the child; request fails silently and is logged in dev |
| 7 | `GET /student/recommendations` | Medium | Transparent rule-based fallback from the dashboard data |
| 8 | `GET /teacher/students/:id/analytics` | Medium | Student drill-down shows roster facts + "coming soon" card |
| 9 | `GET /i18n/:locale` (translation bundles) and `am` in `UpdateSettingsDto.language` | Medium | Bundled `en` + `am`; language choice stored on device only |
| 10 | Parental controls (`PATCH /parent/children/:id/settings` — AI tutor on/off, daily limit) | Medium | Not shown; schools control AI limits today (`aiTutorDailyLimit`) |

---

## 1. Password reset

**Purpose:** let users who registered with email recover their account.

```http
POST /api/auth/password/forgot
{ "email": "parent@example.com" }
→ 200 { "ok": true }            # always, to prevent account enumeration

POST /api/auth/password/reset
{ "token": "<from email link>", "password": "NewPassw0rd" }
→ 200 { "ok": true }
→ 400 { "error": { "message": "Reset link expired" } }
```

**Backend:** single-use, hashed, 30-minute token stored in Redis; email link
`https://justkidora.com/app/reset-password?token=…` (opens the app via
universal links, route `/(auth)/reset-password`). Revoke all refresh tokens on
success.

## 2. Mobile OAuth redirect

**Purpose:** Google / Facebook / TikTok / Apple sign-in in the app.

`OAuthController.finish()` always redirects to `${app.webUrl}/auth/callback#…`.
Accept an allow-listed `redirect_uri` (exactly `kidora://oauth`, plus the
universal-link equivalent) carried through the OAuth `state` param, and
redirect there with the same fragment:

```
kidora://oauth#accessToken=…&refreshToken=…&needsRole=0
```

The app opens the provider with `WebBrowser.openAuthSessionAsync`, parses the
fragment (`parseOAuthCallback`), and stores tokens in SecureStore. **Never**
accept arbitrary redirect URIs (token theft).

## 3. District endpoints

**Purpose:** district leaders (`DISTRICT_ADMIN`) compare schools.

Today `SchoolService` scopes by `u.schoolId`, which a district admin doesn't
have. Proposed (all guarded by `@Roles('DISTRICT_ADMIN', …)` and scoped to
`user.districtId`):

```http
GET /api/district/dashboard?schoolId&gradeId&subjectId&from&to
→ {
  "district": { "id", "name" },
  "totals": { "schools", "students", "teachers", "activeUsers", "courseCompletion", "averageScore", "engagement" },
  "activity": { "dau", "wau", "mau" },
  "outcomes": [{ "label": "Sep", "value": 72 }],
  "schools": [{ "id", "name", "students", "teachers", "activeStudents", "averageScore", "completion", "engagement", "learningGrowth" }]
}
GET /api/district/analytics            (same shape, heavier aggregation)
GET /api/district/schools?page&search  → Paginated<DistrictSchoolSummary>
GET /api/district/schools/:id          → same shape as GET /school/dashboard
GET /api/district/students?page&search → Paginated<roster row>
GET /api/district/teachers?page&search → Paginated<teacher row>
```

Contract: `types/district.ts`. Cache with the existing `CacheService.wrap`.

## 4. Push notifications

```http
POST /api/notifications/push-tokens
{ "token": "ExponentPushToken[…]", "platform": "ios|android", "locale": "en" }
→ 201 { "ok": true }
DELETE /api/notifications/push-tokens/:token → 200
```

**Backend:** `PushToken { userId, token @unique, platform, locale, lastSeenAt }`;
a BullMQ worker sends through Expo's push service whenever a `Notification`
row is created, honouring `User.settings.notifications`. Payload `data`
must match `types/notification.ts → PushPayload`, e.g.
`{ "type": "ACHIEVEMENT", "achievementId": "…" }`,
`{ "type": "parent_report", "childId": "…" }` — the app routes taps from it
(`features/notifications/routing.ts`). Delete tokens on `DeviceNotRegistered`.

## 5. Analytics ingestion

```http
POST /api/analytics/events
{ "events": [{ "name": "lesson_completed", "props": { "lessonId": "…", "durationSec": 300 }, "at": "ISO" }] }
→ 202
```

Props are already allow-listed and stripped of PII on device
(`features/analytics/track.ts`). Rate-limit per user; drop unknown names.

## 6. Report an AI answer

```http
POST /api/lms/ai/tutor/report
{ "messageId": "<AIConversation.id>", "reason": "inappropriate|wrong|confusing|other" }
→ 201 { "ok": true }
```

**Backend:** flag the `AIConversation` row, notify the school's admins (and the
parent for `inappropriate`), and feed the safety review queue. High priority —
this is the child's "tell a grown-up" button.

## 7. Recommendations

```http
GET /api/student/recommendations
→ [{ "id", "kind": "CONTINUE|PRACTICE|CHALLENGE|NEXT_LEVEL|QUEST", "title", "subtitle?", "lessonId?", "courseId?", "worldKey?", "questId?" }]
```

Can reuse `AiTutorService` with `kind: 'RECOMMEND'` server-side; never expose
model prompts to the client.

## 8. Teacher → student analytics

```http
GET /api/teacher/students/:id/analytics
→ { "completionRate", "averageScore", "timeSpentMin", "weakTopics": [], "strongTopics": [], "engagement" }
```

Guard with `tenancy.assertTeacherOfStudent`. Data is already computed by
`AnalyticsService.studentHealth/topicMastery`.

## 9. Translations

```http
GET /api/i18n/:locale → { "<nested keys like en.ts>": "…" }   (ETag-cached)
```

Also add `am` (and future codes) to `UpdateSettingsDto.language`'s `@IsIn`.

## 10. Parental controls

```http
PATCH /api/parent/children/:id/settings
{ "aiTutorEnabled": true, "aiDailyLimit": 10, "leaderboardVisible": false }
```

Enforced in `AiTutorService.ask` and the leaderboard queries.
