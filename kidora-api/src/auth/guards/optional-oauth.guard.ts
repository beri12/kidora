import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext, Injectable, NotImplementedException } from '@nestjs/common';

// Wrap a provider AuthGuard so unconfigured providers return a clean error.
export function ProviderGuard(name: string) {
  @Injectable()
  class G extends AuthGuard(name) {
    canActivate(ctx: ExecutionContext) {
      const key = name.toUpperCase() + '_CLIENT_ID';
      if (!process.env[key] && name !== 'google') throw new NotImplementedException(name + ' OAuth not configured');
      return super.canActivate(ctx) as any;
    }
  }
  return G;
}
