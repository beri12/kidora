# Wiring LmsModule into the existing Kidora backend

`main.ts`: **no change**. Global prefix `api`, `ValidationPipe({ whitelist, transform })`,
CORS with credentials, Swagger at /api/docs, the Redis Socket.IO adapter and the
`/uploads` static route all work as-is with this module.

`app.module.ts`: replaced by the copy in `src/app.module.ts` of this zip. The
only diff is one import and `LmsModule` appended to `imports`.

## Route namespaces (no collisions with your modules)

| Yours                | LmsModule                                              |
|----------------------|--------------------------------------------------------|
| QuizzesModule        | `/api/lms/quizzes/:id`, `/api/lms/attempts/:id/submit`, `/api/lms/exams/:id/attempts` |
| CertificatesModule   | `/api/lms/certificates/verify/:code` (public)          |
| NotificationsModule  | `/api/lms/notifications`                               |
| ChatModule           | `/api/lms/messages/*` (reuses Conversation/Message tables) |
| AiTutorModule        | `/api/lms/ai/tutor`                                    |
| TeachersModule       | `/api/teacher/*` (singular, role dashboard)            |
| AnalyticsModule      | analytics live inside `/api/{teacher,school}/analytics` |
| new                  | `/api/student/*`, `/api/school/*`, `/api/parent/*`, `/api/lms/attendance` |

If you would rather fold `lms/notifications` or `lms/certificates/verify` into
your existing controllers later, the services (`CertificatesService`,
`MessagesService`, `AiTutorService`) are exported for reuse.

## Three edits after copying `src/lms/`

1. **PrismaService** — `DatabaseModule` already provides one. Delete
   `src/lms/prisma/` and point the imports at yours, e.g.
   `grep -rl "../prisma/prisma.service" src/lms | xargs sed -i "s#'../prisma/prisma.service'#'../../database/prisma.service'#"`
   (adjust the path to the real file). Remove `PrismaService` from
   `providers` in `lms.module.ts` and add `DatabaseModule` to `imports`
   (unless it is `@Global()`).
2. **JwtAuthGuard** — `src/lms/common/guards/jwt-auth.guard.ts` currently
   declares `AuthGuard('jwt')`. Replace its body with a re-export of the guard
   from `AuthModule`. The strategy's `validate()` must return
   `{ id, role, schoolId }`; if it returns `sub`/`userId`, map it there.
3. **Redis + AI** — in `lms.module.ts`:
   ```ts
   imports: [RedisModule, AiTutorModule],
   providers: [
     { provide: KIDORA_REDIS, useFactory: (r: RedisService) => r.getClient(), inject: [RedisService] },
     { provide: KIDORA_AI_PROVIDER, useFactory: (ai: YourAiTutorService) => ({ complete: (p) => ai.chat(p) }), inject: [YourAiTutorService] },
   ]
   ```
   Names depend on what those modules export; the interfaces are in
   `common/cache.service.ts` and `ai/ai-provider.ts`. Both are optional.

## Existing modules to extend rather than duplicate

- `RewardsModule` / `EconomyModule`: they write to `RewardWallet` and `Transaction`
  today. `RewardsService` here also writes there and dedupes on `Transaction.sourceKey`.
  If your existing lesson-completion handler already grants XP, call
  `RewardsService.onLessonCompleted()` from it and remove the old grant, so
  XP is paid once.
- `ProgressModule`: keep it; `onLessonCompleted` upserts the same `Progress` row.
- `CoursesModule` (course wizard): add `sectionId`, `status`, `LessonContent`
  blocks and the DRAFT → REVIEW → PUBLISHED flow (`SchoolService.approveCourse`
  handles the approval side).
- `UploadsModule`: assignment/submission attachments are `{ name, url, sizeBytes }`,
  so URLs from your upload endpoints drop straight in.
- `ChatModule` gateway: `MessagesService.send()` creates the `Message` row; emit
  from the same gateway if you want push instead of the 15 s poll.

## Deploy order

1. `prisma migrate deploy` (see `prisma/SCHEMA_CHANGES.md`).
2. `npx ts-node prisma/backfill-lms.ts`.
3. Deploy backend with `LmsModule`.
4. Deploy frontend package.
