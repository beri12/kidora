# Kidora — Security Checklist

## Auth
- [x] Passwords hashed with bcrypt
- [x] JWT access (short TTL) + refresh (hashed, stored) with rotation
- [x] Token revocation via Redis blacklist (jti) on logout
- [x] RBAC: role guard + permission matrix (6 roles)
- [x] MFA (TOTP) with backup codes; SMS OTP scaffold
- [x] Account lockout after repeated failures + login history
- [x] Rate limiting (global ThrottlerGuard)

## Data & payments
- [x] Stripe webhook signature verification (raw body)
- [x] Server-side price catalog (never trust client amounts)
- [x] Input validation (class-validator, whitelist DTOs)
- [x] Global exception filter (no stack leakage in prod)

## Child safety
- [x] AI tutor uses a kid-safe fallback; wire a moderated system prompt for the LLM
- [x] Leaderboard scoped to approved groups (no public global PII)
- [ ] Add COPPA/GDPR-K parental consent flow before launch
- [ ] Pen-test + dependency audit (npm audit / Snyk) in CI

## Ops
- [ ] Rotate JWT/Stripe/PayPal/AI secrets; store in a secret manager
- [ ] Enable TLS everywhere (Nginx + managed DB SSL)
- [ ] Backups + PITR on PostgreSQL
