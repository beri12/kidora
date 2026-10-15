import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';
import { oauthCallbackUrl, oauthCredentials } from '../../config/oauth-callback';
import { oauthStateStore } from './oauth-state.store';
import type { OAuthProfile } from '../services/oauth.service';

// v19.0 reached end of life in 2026; Graph silently upgrades expired versions,
// but pinning a supported one keeps the response shape predictable.
const GRAPH = process.env.FACEBOOK_API_VERSION || 'v23.0';

/** What GET /me returns for the fields requested below; every field but `id` can be missing. */
export interface FacebookMe {
  id?: string | number;
  name?: string;
  first_name?: string;
  last_name?: string;
  picture?: { data?: { url?: string; is_silhouette?: boolean } };
}

/**
 * The Graph profile → Kidora's OAuthProfile. The Facebook user id (app-scoped)
 * is the only identity: no email is requested, so none is returned and no
 * account is ever matched by address.
 */
export function toOAuthProfile(me: FacebookMe): OAuthProfile {
  const providerId = me.id != null ? String(me.id).trim() : '';
  if (!providerId) throw new UnauthorizedException('Facebook did not return an account id');

  const fullName = [me.first_name, me.last_name].map((s) => s?.trim()).filter(Boolean).join(' ');
  const pic = me.picture?.data;
  return {
    provider: 'facebook',
    providerId,
    email: null,
    name: me.name?.trim() || fullName || 'Facebook User',
    // The grey default silhouette is not a real photo: leave it out so the
    // Kidora default avatar is used instead.
    avatarUrl: pic?.url && !pic.is_silhouette ? pic.url : null,
  };
}

// Facebook Login. Set FACEBOOK_CLIENT_ID / FACEBOOK_CLIENT_SECRET to enable;
// the guard returns a clean "not configured" error until then.
@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor() {
    super({
      authorizationURL: `https://www.facebook.com/${GRAPH}/dialog/oauth`,
      tokenURL: `https://graph.facebook.com/${GRAPH}/oauth/access_token`,
      clientID: oauthCredentials('facebook').id || 'missing',
      clientSecret: oauthCredentials('facebook').secret || 'missing',
      callbackURL: oauthCallbackUrl('facebook'),
      // public_profile only. Asking for `email` makes Facebook refuse the
      // whole dialog with "Invalid Scopes: email" unless the app has that
      // permission enabled, and many accounts (phone sign-ups) have no email.
      scope: ['public_profile'],
      // CSRF protection for the round trip; see SignedCookieStateStore.
      store: oauthStateStore,
    });
  }

  async validate(accessToken: string): Promise<OAuthProfile> {
    // A Graph failure throws here; ProviderGuard turns that into a redirect
    // to the web app's sign-in page with a generic "failed" reason.
    const { data } = await axios.get<FacebookMe>(`https://graph.facebook.com/${GRAPH}/me`, {
      params: { fields: 'id,name,first_name,last_name,picture.width(256).height(256)', access_token: accessToken },
      timeout: 10_000,
    });
    return toOAuthProfile(data);
  }
}
