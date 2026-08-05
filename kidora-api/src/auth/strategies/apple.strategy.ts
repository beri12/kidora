import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';

// Sign in with Apple. Apple returns an id_token (JWT) you decode for email/sub.
// Set APPLE_CLIENT_ID + APPLE_TEAM_ID + APPLE_KEY_ID + APPLE_PRIVATE_KEY and
// generate the client secret JWT per Apple's docs (helper left as a TODO).
@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor() {
    super({
      authorizationURL: 'https://appleid.apple.com/auth/authorize',
      tokenURL: 'https://appleid.apple.com/auth/token',
      clientID: process.env.APPLE_CLIENT_ID || 'missing',
      clientSecret: process.env.APPLE_CLIENT_SECRET || 'missing',
      callbackURL: process.env.APPLE_CALLBACK_URL || 'http://localhost:4000/api/auth/apple/callback',
      scope: ['name', 'email'],
    });
  }
  validate(_at: string, _rt: string, params: any) {
    // params.id_token is a JWT; decode to get { sub, email }.
    const payload = JSON.parse(Buffer.from((params.id_token || '..').split('.')[1], 'base64').toString() || '{}');
    return { provider: 'apple', providerId: payload.sub ?? 'apple', email: payload.email ?? 'unknown@apple', name: 'Apple User' };
  }
}
