import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Role } from '@prisma/client';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { PrismaService } from '../../database/prisma.service';

export interface JwtPayload { sub: string; email: string; role: string; jti: string; }

/** What every controller sees as request.user. The LMS contract needs schoolId. */
export interface RequestUser {
  id: string;
  email: string;
  role: Role;
  schoolId: string | null;
  districtId: string | null;
  jti: string;
}

interface Tenancy { role: Role; email: string; schoolId: string | null; districtId: string | null; active: boolean }

const TENANCY_TTL = 60; // seconds

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private cache: CacheService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('auth.accessSecret'),
      passReqToCallback: false,
    });
  }

  /**
   * Tenancy is read from the database, not from the token.
   *
   * schoolId in the token would go stale: a user moved to another school, or
   * removed from one, would keep reaching the old school's data for the rest
   * of the token's life. TenancyService bases every cross-school check on this
   * field, so it has to reflect the database. Cached briefly because it is
   * read on every authenticated request.
   */
  private async tenancy(userId: string): Promise<Tenancy | null> {
    const key = `tenancy:${userId}`;
    try {
      const hit = await this.cache.get<Tenancy>(key);
      if (hit) return hit;
    } catch {
      // Redis down: fall through to the database rather than failing the request.
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true, schoolId: true, districtId: true, active: true },
    });
    if (!user) return null;

    try {
      await this.cache.set(key, user, TENANCY_TTL);
    } catch {
      // Caching is an optimisation; a failure here must not fail the request.
    }
    return user;
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    // Reject tokens that have been revoked (logout / security event).
    if (payload.jti && (await this.cache.isBlacklisted(payload.jti))) {
      throw new UnauthorizedException('Token revoked');
    }

    const user = await this.tenancy(payload.sub);
    if (!user) throw new UnauthorizedException('Account no longer exists');
    if (!user.active) throw new UnauthorizedException('Account is disabled');

    return {
      id: payload.sub,
      email: user.email,
      // The stored role wins over the token's copy, so a demotion takes effect
      // without waiting for the access token to expire.
      role: user.role,
      schoolId: user.schoolId,
      districtId: user.districtId,
      jti: payload.jti,
    };
  }
}
