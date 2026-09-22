import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';
import { oauthCallbackUrl } from '../../config/oauth-callback';

// Requires: npm i passport-oauth2 axios ; set GITHUB_CLIENT_ID/SECRET.
@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor() {
    super({
      authorizationURL: 'https://github.com/login/oauth/authorize',
      tokenURL: 'https://github.com/login/oauth/access_token',
      clientID: process.env.GITHUB_CLIENT_ID || 'missing',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'missing',
      callbackURL: oauthCallbackUrl('github'),
      scope: ['user:email'],
    });
  }
  async validate(accessToken: string) {
    const { data } = await axios.get('https://api.github.com/user', { headers: { Authorization: 'token ' + accessToken } });
    const emails = await axios.get('https://api.github.com/user/emails', { headers: { Authorization: 'token ' + accessToken } });
    return { provider: 'github', providerId: String(data.id), email: emails.data?.find((e: any) => e.primary)?.email ?? data.email, name: data.name || data.login };
  }
}
