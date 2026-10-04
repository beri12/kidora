# Facebook Login

"Continue with Facebook" signs a visitor in, and creates their Kidora account on
the first visit. It uses the same flow as Google: Passport strategy → signed
OAuth `state` cookie → find-or-create the user via `SocialAccount` → one-time
code → the normal Kidora access and refresh tokens.

Only the **`public_profile`** permission is requested. Email is never asked
for, so an account is identified by the Facebook user id alone (stored in
`SocialAccount` as `provider = FACEBOOK`, `providerId = <id>`) and is never
matched to another Kidora account by email address.

## Environment (kidora-api/.env)

```
FACEBOOK_CLIENT_ID=<App ID>
FACEBOOK_CLIENT_SECRET=<App Secret>
FACEBOOK_CALLBACK_URL=http://localhost:4000/api/auth/facebook/callback
WEB_URL=http://localhost:3000
```

Production:

```
FACEBOOK_CALLBACK_URL=https://api.justkidora.com/api/auth/facebook/callback
WEB_URL=https://justkidora.com
API_URL=https://api.justkidora.com/api
```

`FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` are accepted as alternatives. The
secret stays on the API; the web app only links to `/api/auth/facebook`. At
boot the API prints the exact redirect URI it will send to Facebook. Register
exactly that.

## Meta Developer settings (developers.facebook.com → My Apps)

1. **Create app.** Choose the use case **Authenticate and request data from
   users with Facebook Login** (shown in older dashboards as type *Consumer*).
   App name "Kidora"; add your contact email.
2. **Use cases → Facebook Login (Authentication and account creation) →
   Customize → Permissions.** Leave **`public_profile`** (it is granted by
   default). You do **not** need to add `email`. "Invalid Scopes: email" is
   what Facebook shows when the code asks for `email` and the app does not
   have it, and Kidora no longer asks for it.
3. **Facebook Login → Settings:**
   - Client OAuth login: **On**
   - Web OAuth login: **On**
   - Enforce HTTPS: **On** (localhost is still allowed while developing)
   - Use Strict Mode for redirect URIs: **On**
   - Valid OAuth Redirect URIs:
     - `http://localhost:4000/api/auth/facebook/callback`
     - `https://api.justkidora.com/api/auth/facebook/callback`
4. **App settings → Basic:** copy the **App ID** and **App Secret** into the
   env vars above. Fill in:
   - App domains: `justkidora.com`
   - Privacy Policy URL: `https://justkidora.com/privacy`
   - Terms of Service URL: `https://justkidora.com/terms`
   - User data deletion: an instructions URL (for example the privacy page,
     which explains how to request deletion), or a data deletion callback
   - Category (Education) and a 1024×1024 app icon
5. **Who can sign in.** While the app is in **Development** mode, only people
   with a role on the app (Admins, Developers, Testers under **App roles**) can
   use Facebook Login. Everyone else sees an "app not active" error. To open it
   to the public, switch the app to **Live** (this needs step 4 completed).
   `public_profile` needs no App Review.

## What happens

| Situation | Result |
| --- | --- |
| First sign-in | New user: Facebook name, Facebook photo (or none), no email, no password, role PARENT with the "How will you use Kidora?" step, free subscription. |
| Later sign-ins | The same user, found by Facebook id. Never a duplicate. |
| Two first sign-ins at once | Only one account is created; the second request signs in to it. |
| No photo, or only the grey silhouette | `avatarUrl` stays empty, so the Kidora default avatar is shown. |
| User presses Cancel | Back to the web app's sign-in screen with "Sign-in cancelled". |
| Bad/forged callback, Graph error, database error | Back to the sign-in screen with a generic "That sign-in didn't finish". Details are not shown. |

## Known limits

- The Facebook photo URL is a Facebook CDN link and can expire after some
  weeks. It is saved once, at account creation. Uploading a photo in Kidora
  replaces it.
- A Facebook user has no email in Kidora, so emailed codes, password reset and
  receipts don't reach them until they add an email in Settings.
- Facebook ids are app-scoped: a new Meta app would give everyone new ids and
  therefore new Kidora accounts. Keep the same app for development and
  production, or plan a migration.
