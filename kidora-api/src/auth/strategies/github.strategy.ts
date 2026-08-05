import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

// Requires: npm i passport-oauth2 axios ; set GITHUB_CLIENT_ID/SECRET.
@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService) {
    super({
      authorizationURL: 'https://github.com/login/oauth/authorize',
      tokenURL: 'https://github.com/login/oauth/access_token',
      clientID: process.env.GITHUB_CLIENT_ID || 'missing',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'missing',
      callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:4000/api/auth/github/callback',
      scope: ['user:email'],
    });
  }
  async validate(accessToken: string) {
    const { data } = await axios.get('https://api.github.com/user', { headers: { Authorization: 'token ' + accessToken } });
    const emails = await axios.get('https://api.github.com/user/emails', { headers: { Authorization: 'token ' + accessToken } });
    return { provider: 'github', providerId: String(data.id), email: emails.data?.find((e: any) => e.primary)?.email ?? data.email, name: data.name || data.login };
  }
}
