# Deploying Kidora (justkidora.com)

One Linux server (Ubuntu 22.04+, 2 vCPU / 4 GB RAM is plenty for a pilot)
running Docker, with Nginx in front:

```
justkidora.com, www.justkidora.com ──► Nginx :443 ──► web  (127.0.0.1:3000)
api.justkidora.com                  ──► Nginx :443 ──► api  (127.0.0.1:4000) ──► postgres, redis, ai-service
```

## 0. Before you start: rotate every credential that has been shared

Any secret pasted into a chat, an email or a commit must be replaced:
- Google, Facebook and TikTok client secrets
- PayPal client secret
- Twilio auth token
- the Gmail App Password
- the database password
- the JWT secrets (generate new ones with `openssl rand -hex 32`)

Use the new values only in `kidora-api/.env.production` on the server.

## 1. DNS

Point `justkidora.com`, `www.justkidora.com` and `api.justkidora.com` (A
records) at the server's IP.

## 2. Server packages

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx git
sudo usermod -aG docker $USER && newgrp docker
```

## 3. Code and configuration

```bash
git clone https://github.com/beri12/kidora.git && cd kidora
cp kidora-api/.env.production.example kidora-api/.env.production
nano kidora-api/.env.production      # fill every REPLACE_… value, one block only
```

`kidora-web/.env.production.example` lists the public build values. The
compose file defaults them to `https://api.justkidora.com/api` and
`https://justkidora.com`.

## 4. Start the stack

```bash
docker compose -f docker-compose.production.yml --env-file kidora-api/.env.production up -d --build
docker compose -f docker-compose.production.yml logs -f api
```

The API runs `prisma migrate deploy` on every start (it never resets data).
In its boot log, check that:
- the `Sign-in:` callbacks are the `https://api.justkidora.com/...` ones;
- `SMTP …: connection OK` appears;
- the pilot line shows the date you set.

## 5. Nginx and HTTPS

```bash
sudo cp deploy/nginx/justkidora.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/justkidora.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d justkidora.com -d www.justkidora.com -d api.justkidora.com
```

## 6. Provider consoles (production URLs)

| Provider | Setting | Value |
| --- | --- | --- |
| Google Cloud → Credentials → OAuth client | Authorized redirect URI | `https://api.justkidora.com/api/auth/google/callback` |
| | Authorized JavaScript origin | `https://justkidora.com` |
| Meta → Facebook Login → Settings | Valid OAuth Redirect URI | `https://api.justkidora.com/api/auth/facebook/callback` |
| | App mode | **Live** (needs privacy, terms and data-deletion URLs) |
| TikTok → Login Kit | Redirect URI | `https://api.justkidora.com/api/auth/tiktok/callback` |
| PayPal | Keep `PAYPAL_ENVIRONMENT=sandbox` until a sandbox purchase works | |

Keep the `http://localhost:4000/...` redirect URIs as well, so local
development keeps working.

## 7. Smoke test

```bash
curl -s https://api.justkidora.com/api/health
curl -s https://api.justkidora.com/api/pricing | head -c 300
```

Then in a browser:
1. On https://justkidora.com/pricing, the prices load and the pilot banner shows.
2. Sign up with email; the code arrives.
3. Sign in with Google and with Facebook.
4. "Start free pilot" goes to "Your Kidora pilot access is now active."
5. "Skip for now" opens the dashboard, and premium courses are unlocked.

## Updating

```bash
cd kidora && git pull
docker compose -f docker-compose.production.yml --env-file kidora-api/.env.production up -d --build
```

## Backups

```bash
docker compose -f docker-compose.production.yml exec -T postgres pg_dump -U kidora kidora | gzip > kidora-$(date +%F).sql.gz
```

Take one before every update; keep copies off the server.
