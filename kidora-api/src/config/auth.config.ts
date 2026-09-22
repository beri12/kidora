import { registerAs } from '@nestjs/config';

// The dev fallbacks below are committed to the repository, so anyone could
// forge an admin token against a production instance that booted without
// these set. Refuse to start instead of failing open.
function secret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set in production. Generate one with: openssl rand -hex 32`);
  }
  return devFallback;
}

export default registerAs('auth', () => ({
  accessSecret: secret('JWT_ACCESS_SECRET', 'dev-access-secret'),
  refreshSecret: secret('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
  accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 604800),
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:4000/api/auth/google/callback',
  },
  mfaIssuer: process.env.MFA_ISSUER ?? 'Kidora',
}));
