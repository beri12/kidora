import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';

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
      clientID: process.env.TIKTOK_CLIENT_ID || 'missing',
      clientSecret: process.env.TIKTOK_CLIENT_SECRET || 'missing',
      callbackURL: process.env.TIKTOK_CALLBACK_URL || 'http://localhost:4000/api/auth/tiktok/callback',
      scope: ['user.info.basic'],
      scopeSeparator: ',',
    });
  }

  authorizationParams() {
    return { client_key: process.env.TIKTOK_CLIENT_ID || 'missing' };
  }

  tokenParams() {
    return { client_key: process.env.TIKTOK_CLIENT_ID || 'missing' };
  }

  async validate(accessToken: string) {
    const { data } = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
      params: { fields: 'open_id,display_name' },
      headers: { Authorization: 'Bearer ' + accessToken },
    });
    const u = data?.data?.user ?? {};
    // TikTok never returns an email address, so these accounts are identified
    // by open_id alone and land with `email: undefined`.
    return { provider: 'tiktok', providerId: String(u.open_id), email: undefined, name: u.display_name || 'TikTok User' };
  }
}
