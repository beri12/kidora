import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get('auth.google.clientId') || 'missing',
      clientSecret: config.get('auth.google.clientSecret') || 'missing',
      callbackURL: config.get('auth.google.callbackUrl'),
      scope: ['email', 'profile'],
    });
  }
  validate(_at: string, _rt: string, profile: any, done: VerifyCallback) {
    const p = {
      provider: 'google',
      providerId: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName || profile.name?.givenName || 'Google User',
    };
    done(null, p);
  }
}
