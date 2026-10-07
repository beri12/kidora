# End-to-end tests (Maestro)

Critical flows: register, login, student dashboard, open island, open lesson,
complete lesson, earn XP, open AI tutor, parent login, teacher login.

## Prerequisites

1. Install Maestro: https://maestro.mobile.dev (`curl -Ls "https://get.maestro.mobile.dev" | bash`).
2. A development build installed on an emulator/simulator (`eas build --profile development`
   or `npx expo run:android`). App id: `com.kidora.app.dev`.
3. The Kidora API running with seeded accounts (see `kidora-api/prisma/seed`).

## Run

```bash
maestro test e2e/maestro \
  -e STUDENT_EMAIL=student@example.com -e STUDENT_PASSWORD=... \
  -e PARENT_EMAIL=parent@example.com   -e PARENT_PASSWORD=... \
  -e TEACHER_EMAIL=teacher@example.com -e TEACHER_PASSWORD=...
```

Flows select elements by `testID` (Maestro `id:`), so copy changes and
translations don't break them. Never commit real credentials — pass them with `-e`
or from CI secrets.
