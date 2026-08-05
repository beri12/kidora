import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TokenService } from './token.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { Role } from '@prisma/client';

export interface OAuthProfile { provider: string; providerId: string; email: string; name: string; }

@Injectable()
export class OAuthService {
  constructor(private prisma: PrismaService, private tokens: TokenService, private email: EmailService) {}

  // Find-or-create a user from a verified OAuth profile, then issue tokens.
  async validateOAuthLogin(p: OAuthProfile) {
    let user = await this.prisma.user.findFirst({ where: { OR: [{ googleId: p.provider === 'google' ? p.providerId : undefined }, { email: p.email }] } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { email: p.email, name: p.name, role: Role.PARENT, emailVerified: true, googleId: p.provider === 'google' ? p.providerId : undefined },
      });
      await this.prisma.subscription.create({ data: { userId: user.id, plan: 'free' } });
      this.email.sendWelcome(user.email, user.name);
    } else if (p.provider === 'google' && !user.googleId) {
      user = await this.prisma.user.update({ where: { id: user.id }, data: { googleId: p.providerId } });
    }
    const t = await this.tokens.issue(user);
    const { passwordHash, mfaSecret, backupCodes, ...safe } = user as any;
    return { user: safe, ...t };
  }
}
