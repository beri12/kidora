import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { AuthProvider, Role, User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { TokenService } from './token.service';

export interface OAuthProfile {
  provider: string;
  providerId: string;
  /** Facebook accounts created with a phone number, and every TikTok account, have none. */
  email?: string | null;
  name: string;
  avatarUrl?: string | null;
}

/** Strategy name → the provider stored on SocialAccount. */
const PROVIDERS: Record<string, AuthProvider> = {
  google: AuthProvider.GOOGLE,
  tiktok: AuthProvider.TIKTOK,
  facebook: AuthProvider.FACEBOOK,
  apple: AuthProvider.APPLE,
  microsoft: AuthProvider.MICROSOFT,
  github: AuthProvider.GITHUB,
};

/** How long the one-time code handed to the web app stays redeemable. */
const EXCHANGE_TTL = 60;

@Injectable()
export class OAuthService {
  constructor(
    private prisma: PrismaService,
    private tokens: TokenService,
    private email: EmailService,
    private cache: CacheService,
  ) {}

  /**
   * One Kidora user per person, whatever they sign in with.
   *
   *   1. The provider identity is already linked → that user.
   *   2. The provider reported an email that matches a user → link it there.
   *   3. Otherwise → a new user, linked.
   *
   * SocialAccount is unique on (provider, providerId), so one identity can
   * never end up on two users, and on (userId, provider), so a user holds at
   * most one account per provider.
   */
  async resolveUser(p: OAuthProfile): Promise<User> {
    if (!p?.providerId) throw new BadRequestException('The provider did not return an account id');
    const provider = PROVIDERS[p.provider];
    if (!provider) throw new BadRequestException('Unsupported sign-in provider');
    const email = p.email?.trim().toLowerCase() || null;

    const linked = await this.prisma.socialAccount.findUnique({
      where: { provider_providerId: { provider, providerId: p.providerId } },
      include: { user: true },
    });
    if (linked) return linked.user;

    let user = email ? await this.prisma.user.findUnique({ where: { email } }) : null;

    if (user) {
      // If that account never proved it owns the address, whoever registered
      // it may not be the person now signing in — they could have typed
      // someone else's email with a password of their own. The provider has
      // just proved ownership, so the address is marked verified and the
      // unproven password is dropped rather than left as a back door.
      const unproven = !user.emailVerified;
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          ...(unproven ? { emailVerified: true, passwordHash: null } : {}),
          ...(!user.avatarUrl && p.avatarUrl ? { avatarUrl: p.avatarUrl } : {}),
          socialAccounts: { create: { provider, providerId: p.providerId, email } },
        },
      });
      return user;
    }

    user = await this.prisma.user.create({
      data: {
        email,
        name: p.name,
        avatarUrl: p.avatarUrl ?? null,
        role: Role.PARENT,
        // The role step ("How will you use Kidora?") runs after the redirect.
        roleConfirmed: false,
        emailVerified: Boolean(email),
        socialAccounts: { create: { provider, providerId: p.providerId, email } },
        subscription: { create: { plan: 'free' } },
      },
    });
    if (user.email) this.email.sendWelcome(user.email, user.name);
    return user;
  }

  /**
   * Signs the provider's user in and returns a one-time code for the web
   * app, instead of the tokens themselves. Tokens in a redirect URL end up in
   * browser history, extensions and screenshots; this code is useless after
   * one redemption or 60 seconds, whichever comes first.
   */
  async createExchangeCode(p: OAuthProfile) {
    const user = await this.resolveUser(p);
    const code = randomBytes(24).toString('base64url');
    await this.cache.set(`oauth:exchange:${code}`, { userId: user.id }, EXCHANGE_TTL);
    return { code, needsRole: !user.roleConfirmed };
  }

  /** POST /auth/oauth/exchange: the code from the redirect → a token pair. */
  async redeemExchangeCode(code: string) {
    const key = `oauth:exchange:${code}`;
    const entry = await this.cache.get<{ userId: string }>(key);
    // Deleted before anything else so a second, racing redemption finds nothing.
    await this.cache.del(key);
    if (!entry) throw new BadRequestException('That sign-in link has expired. Please try again.');

    const user = await this.prisma.user.findUnique({ where: { id: entry.userId }, include: { subscription: true } });
    if (!user || !user.active) throw new BadRequestException('That sign-in link has expired. Please try again.');

    const t = await this.tokens.issue(user);
    const { passwordHash: _p, mfaSecret: _m, backupCodes: _b, subscription, ...safe } = user;
    return { user: { ...safe, subscriptionPlan: subscription?.plan }, ...t, needsRole: !user.roleConfirmed };
  }
}
