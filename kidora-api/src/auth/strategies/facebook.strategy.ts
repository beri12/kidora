import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';
import { oauthCallbackUrl } from '../../config/oauth-callback';

const GRAPH = process.env.FACEBOOK_API_VERSION || 'v19.0';

// Facebook Login. Set FACEBOOK_CLIENT_ID / FACEBOOK_CLIENT_SECRET to enable;
// the guard returns a clean "not configured" error until then.
@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor() {
    super({
      authorizationURL: `https://www.facebook.com/${GRAPH}/dialog/oauth`,
      tokenURL: `https://graph.facebook.com/${GRAPH}/oauth/access_token`,
      clientID: process.env.FACEBOOK_CLIENT_ID || 'missing',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || 'missing',
      callbackURL: oauthCallbackUrl('facebook'),
      scope: ['email', 'public_profile'],
    });
  }

  async validate(accessToken: string) {
    const { data } = await axios.get(`https://graph.facebook.com/${GRAPH}/me`, {
      params: { fields: 'id,name,email', access_token: accessToken },
    });
    // Facebook accounts registered with a phone number have no email, so the
    // OAuth service must be able to cope with `email: undefined` here.
    return { provider: 'facebook', providerId: String(data.id), email: data.email, name: data.name || 'Facebook User' };
  }
}
