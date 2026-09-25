import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { oauthStateStore } from './oauth-state.store';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get('auth.google.clientId') || 'missing',
      clientSecret: config.get('auth.google.clientSecret') || 'missing',
      callbackURL: config.get('auth.google.callbackUrl'),
      scope: ['email', 'profile'],
      // CSRF protection for the round trip; see SignedCookieStateStore.
      store: oauthStateStore,
    });
  }
  /** Always show the account chooser, so a shared computer never signs in as the wrong person. */
  authorizationParams(options: any) {
    return (Strategy.prototype as any).authorizationParams.call(this, { prompt: 'select_account', ...options });
  }

  validate(_at: string, _rt: string, profile: any, done: VerifyCallback) {
    // Only an address Google has verified may be used to match an existing
    // Kidora account; an unverified one is treated as no address at all.
    const verified = profile._json?.email_verified !== false;
    const p = {
      provider: 'google',
      providerId: profile.id,
      email: verified ? profile.emails?.[0]?.value : undefined,
      name: profile.displayName || profile.name?.givenName || 'Google User',
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
    done(null, p);
  }
}
