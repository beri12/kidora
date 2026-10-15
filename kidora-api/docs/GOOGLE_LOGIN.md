# Google Login

Same flow as Facebook (see FACEBOOK_LOGIN.md): Passport → signed `state`
cookie → find-or-create via `SocialAccount` → one-time code → Kidora tokens.
Google may share a verified email; an existing Kidora account with that email
is then linked rather than duplicated.

## Environment (kidora-api/.env)

```
GOOGLE_CLIENT_ID=1234567890-xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
```

Production: `GOOGLE_CALLBACK_URL=https://api.justkidora.com/api/auth/google/callback`
(or set `API_URL=https://api.justkidora.com/api` and leave it out).

## Google Cloud Console (console.cloud.google.com)

1. **APIs & Services → OAuth consent screen** (Google Auth Platform →
   Branding / Audience): app name "Kidora", support email, authorized domain
   `justkidora.com`, links to `/privacy` and `/terms`. While the audience is
   **Testing**, only the listed **test users** can sign in. Publish the app
   for everyone else.
2. **Credentials → Create credentials → OAuth client ID**, application type
   **Web application** (not Desktop/Android/iOS).
   - Authorized JavaScript origins: `http://localhost:3000`, `https://justkidora.com`
   - Authorized redirect URIs (exactly, no trailing slash):
     - `http://localhost:4000/api/auth/google/callback`
     - `https://api.justkidora.com/api/auth/google/callback`
3. Copy the **Client ID** (ends in `.apps.googleusercontent.com`) and the
   **Client secret** (`GOCSPX-…`) into the env vars above. Restart the API.

## "Error 400: invalid_request" and friends

At boot the API prints, under `Sign-in:`, the exact redirect URI it sends
plus an `ERROR:` line for anything Google will refuse. `GET /api/auth/google`
answers with that message instead of redirecting while a problem exists. It
checks for:

- a redirect URI that is not a full `http(s)://` URL;
- plain `http://` on anything but `localhost` (Google allows http only for
  localhost; a LAN address like `192.168.x.x` is refused);
- a client ID that is not `….apps.googleusercontent.com`, or the ID and secret
  swapped.

Quotes and stray spaces around values in `.env` are now ignored.

If Google still shows an error page, click **"error details"** on it. It
names the real cause:

| Google says | Fix |
| --- | --- |
| `redirect_uri_mismatch` | Add the URI printed at boot to Authorized redirect URIs, exactly. |
| `invalid_client` / "OAuth client was not found" | Wrong client ID, or the client was deleted. Copy it again. |
| `invalid_request` + "doesn't comply with Google's OAuth 2.0 policy" | http on a non-localhost host, or the consent screen is incomplete. |
| `access_denied` / "has not completed the Google verification process" | You're not a test user while the app is in Testing. Add yourself under Audience → Test users. |

Also open the web app as `http://localhost:3000`, and keep
`NEXT_PUBLIC_API_URL=http://localhost:4000/api` in `kidora-web/.env.local`
when testing locally.
