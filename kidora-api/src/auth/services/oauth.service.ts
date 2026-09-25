import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TokenService } from './token.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { Prisma, Role } from '@prisma/client';

export interface OAuthProfile {
  provider: string;
  providerId: string;
  /** Facebook accounts created with a phone number, and every TikTok account, have none. */
  email?: string | null;
  name: string;
}

/** provider name → the column that stores its account id. */
const PROVIDER_COLUMN: Record<string, 'googleId' | 'facebookId' | 'tiktokId'> = {
  google: 'googleId',
  facebook: 'facebookId',
  tiktok: 'tiktokId',
};

@Injectable()
export class OAuthService {
  constructor(private prisma: PrismaService, private tokens: TokenService, private email: EmailService) {}

  // Find-or-create a user from a verified OAuth profile, then issue tokens.
  async validateOAuthLogin(p: OAuthProfile) {
    if (!p?.providerId) throw new BadRequestException('The provider did not return an account id');

    const column = PROVIDER_COLUMN[p.provider];
    const email = p.email?.trim().toLowerCase() || null;

    // Match on the provider id first; fall back to the email address so a
    // visitor who signed up with email/password can add a social login later.
    // Providers with no email (TikTok) only ever match on the provider id.
    const or: Prisma.UserWhereInput[] = [];
    if (column) or.push({ [column]: p.providerId } as Prisma.UserWhereInput);
    if (email) or.push({ email });

    let user = or.length ? await this.prisma.user.findFirst({ where: { OR: or } }) : null;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: p.name,
          role: Role.PARENT,
          // The role step ("How will you use Kidora?") runs after the redirect.
          roleConfirmed: false,
          emailVerified: Boolean(email),
          ...(column ? { [column]: p.providerId } : {}),
        },
      });
      await this.prisma.subscription.create({ data: { userId: user.id, plan: 'free' } });
      if (user.email) this.email.sendWelcome(user.email, user.name);
    } else if (column && !(user as any)[column]) {
      // Link this provider to the account the email matched.
      //
      // If that account never proved it owns the address, whoever registered
      // it may not be the person now signing in with the provider — they could
      // have typed someone else's email with a password of their own. The
      // provider has just proved ownership, so the address is marked verified
      // and the unproven password is dropped rather than left as a back door.
      const unproven = !user.emailVerified;
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          [column]: p.providerId,
          ...(unproven ? { emailVerified: true, passwordHash: null } : {}),
        },
      });
    } else if (email && !user.emailVerified && user.email === email) {
      user = await this.prisma.user.update({ where: { id: user.id }, data: { emailVerified: true, passwordHash: null } });
    }

    const t = await this.tokens.issue(user);
    const { passwordHash, mfaSecret, backupCodes, ...safe } = user as any;
    return { user: safe, ...t, needsRole: !user.roleConfirmed };
  }
}
