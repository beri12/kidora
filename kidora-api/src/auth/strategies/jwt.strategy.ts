import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../infrastructure/cache/cache.service';

export interface JwtPayload { sub: string; email: string; role: string; jti: string; }

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private cache: CacheService) {
    super({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  ignoreExpiration: false,
  secretOrKey: config.getOrThrow<string>('auth.accessSecret'),
  passReqToCallback: false,
});
  }
  async validate(payload: JwtPayload) {
    // Reject tokens that have been revoked (logout / security event).
    if (payload.jti && (await this.cache.isBlacklisted(payload.jti))) throw new UnauthorizedException('Token revoked');
    return { id: payload.sub, email: payload.email, role: payload.role, jti: payload.jti };
  }
}
