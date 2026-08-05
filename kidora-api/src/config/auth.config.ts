import { registerAs } from '@nestjs/config';
export default registerAs('auth', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
  accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
  refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 604800),
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:4000/api/auth/google/callback',
  },
  mfaIssuer: process.env.MFA_ISSUER ?? 'Kidora',
}));
