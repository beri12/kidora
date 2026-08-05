import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';

// Microsoft Identity (v2.0). Set MICROSOFT_CLIENT_ID/SECRET/TENANT.
@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor() {
    const tenant = process.env.MICROSOFT_TENANT || 'common';
    super({
      authorizationURL: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      tokenURL: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      clientID: process.env.MICROSOFT_CLIENT_ID || 'missing',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || 'missing',
      callbackURL: process.env.MICROSOFT_CALLBACK_URL || 'http://localhost:4000/api/auth/microsoft/callback',
      scope: ['user.read'],
    });
  }
  async validate(accessToken: string) {
    const { data } = await axios.get('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: 'Bearer ' + accessToken } });
    return { provider: 'microsoft', providerId: data.id, email: data.mail || data.userPrincipalName, name: data.displayName };
  }
}
