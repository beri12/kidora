# Kidora — Deployment Guide

## Topology
- **Frontend** (children-learning-web) → Vercel
- **Backend** (kidora-api) → DigitalOcean/AWS VPS (Docker) behind **Nginx**
- **PostgreSQL** → managed (RDS / DO Managed DB)
- **Redis** → managed (Upstash / DO)
- **Storage** → S3 / Cloudflare R2 (set STORAGE_DRIVER=s3)

## Backend (VPS + Docker)
```bash
git clone <repo> && cd kidora-api
cp .env.example .env      # fill real secrets (JWT, Stripe, PayPal, AI_API_KEY, DB, Redis)
docker compose up -d --build
# migrations run automatically (prisma migrate deploy in the container CMD)
```

## Nginx reverse proxy (sketch)
```nginx
server {
  server_name api.kidora.com;
  client_max_body_size 512M;                 # large lesson uploads
  location / { proxy_pass http://127.0.0.1:4000; proxy_http_version 1.1; }
  location /socket.io/ {                      # websockets for live games
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

## Frontend (Vercel)
Set env `NEXT_PUBLIC_API_URL=https://api.kidora.com/api` + payment public keys, then deploy.

## Stripe/PayPal webhooks
- Stripe: point a webhook at `https://api.kidora.com/api/payments/stripe/webhook` (raw body enabled).
- PayPal: capture flow is server-side; add a webhook for subscription sync in production.

## Health
`GET /api/health` for load-balancer checks.
