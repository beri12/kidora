# Building & releasing

## Environments

| Profile | Bundle id / package | API |
|---|---|---|
| development | `com.kidora.app.dev` | `http://10.0.2.2:4000/api` (Android emulator → host) |
| preview | `com.kidora.app.preview` | `https://api.justkidora.com/api` |
| production | `com.kidora.app` | `https://api.justkidora.com/api` |

Set `EAS_PROJECT_ID` (from `eas init`) and optionally `EXPO_OWNER` in the EAS
project environment; the push-token flow needs the project id.

## Commands

```bash
npx expo start                 # dev server (development build or Expo Go for UI-only work)
npx expo start --android
npx expo start --ios
eas build --profile development
eas build --profile preview    # internal APK / ad-hoc iOS for QA
eas build --profile production # AAB + IPA, auto-incremented build numbers
eas submit --profile production --platform android   # Play internal track, draft
eas submit --profile production --platform ios
eas update --channel production  # OTA JS updates (runtimeVersion = app version)
```

## Store checklist

**Both stores — children's apps**
* Google Play: Families Policy / Designed for Families; target audience
  includes under-13; Data safety form (no data sold, no ads SDKs, data
  encrypted in transit, deletion on request).
* App Store: Kids category (age band 6–8 / 9–11), no third-party analytics or
  ads, no external links without a parental gate (the app only opens
  `justkidora.com` — add a parental gate before linking out if required by
  review).
* Privacy policy URL and COPPA / GDPR-K statements.

**Universal links:** host
`https://justkidora.com/.well-known/apple-app-site-association` (appID
`<TEAMID>.com.kidora.app`, paths `/app/*`) and
`https://justkidora.com/.well-known/assetlinks.json` (package
`com.kidora.app`, release SHA-256 from `eas credentials`).

**Push:** upload APNs key and FCM v1 service account with `eas credentials`.

**Assets:** `assets/icon.png`, adaptive icon layers, splash and notification
icon are brand placeholders generated in-repo — replace with final artwork at
the same sizes.
