import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';
import { oauthCallbackUrl, oauthCredentials } from '../../config/oauth-callback';
import { oauthStateStore } from './oauth-state.store';

/** TikTok calls it the client key; both spellings are accepted. */
export function tiktokClientKey() {
  return oauthCredentials('tiktok').id || 'missing';
}

// TikTok Login Kit (v2). Set TIKTOK_CLIENT_ID (TikTok calls it the client key)
// and TIKTOK_CLIENT_SECRET to enable.
//
// TikTok deviates from plain OAuth2 in one place: it expects the app
// identifier as `client_key` rather than `client_id`, on both the authorize
// redirect and the token exchange. The two hooks below add it.
@Injectable()
export class TiktokStrategy extends PassportStrategy(Strategy, 'tiktok') {
  constructor() {
    super({
      authorizationURL: 'https://www.tiktok.com/v2/auth/authorize/',
      tokenURL: 'https://open.tiktokapis.com/v2/oauth/token/',
      clientID: tiktokClientKey(),
      clientSecret: oauthCredentials('tiktok').secret || 'missing',
      callbackURL: oauthCallbackUrl('tiktok'),
      scope: (process.env.TIKTOK_SCOPE || 'user.info.basic').split(/[,\s]+/).filter(Boolean),
      scopeSeparator: ',',
      // CSRF protection for the round trip; see SignedCookieStateStore.
      store: oauthStateStore,
    });
  }

  authorizationParams() {
    return { client_key: tiktokClientKey() };
  }

  tokenParams() {
    return { client_key: tiktokClientKey() };
  }

  async validate(accessToken: string) {
    const { data } = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
      params: { fields: 'open_id,display_name,avatar_url' },
      headers: { Authorization: 'Bearer ' + accessToken },
    });
    const u = data?.data?.user ?? {};
    // TikTok never returns an email address, so these accounts are identified
    // by open_id alone and land with `email: undefined`.
    return { provider: 'tiktok', providerId: String(u.open_id), email: undefined, name: u.display_name || 'TikTok User', avatarUrl: u.avatar_url ?? null };
  }
}
