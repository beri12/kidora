import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext, Injectable, NotImplementedException } from '@nestjs/common';

/**
 * Wrap a provider's AuthGuard so an unconfigured provider fails cleanly here
 * rather than at the provider.
 *
 * Google used to be exempt from the check. With no GOOGLE_CLIENT_ID its
 * strategy is built with the literal id "missing", so /auth/google redirected
 * to Google's own error page — the exact "button that can only fail" that
 * /auth/providers exists to prevent, and an error the operator could not read
 * as "you have not set GOOGLE_CLIENT_ID". Every provider is checked the same
 * way now.
 */
export function ProviderGuard(name: string) {
  @Injectable()
  class G extends AuthGuard(name) {
    canActivate(ctx: ExecutionContext) {
      const key = `${name.toUpperCase()}_CLIENT_ID`;
      if (!process.env[key]) {
        throw new NotImplementedException(
          `${name} sign-in is not configured on this server. Set ${key} (and ${name.toUpperCase()}_CLIENT_SECRET) and restart.`,
        );
      }
      return super.canActivate(ctx) as any;
    }

    /**
     * On the callback, a refusal — the visitor pressed "Cancel" at Google, the
     * state check failed, the code was already used — would otherwise surface
     * as a bare 401 JSON page on the API's domain. It is handed to the
     * controller instead, which sends the visitor back to the web app with a
     * readable reason.
     */
    handleRequest(err: any, user: any, info: any, ctx: ExecutionContext) {
      if (user) return user;
      const req = ctx.switchToHttp().getRequest();
      const denied = req?.query?.error === 'access_denied' || req?.query?.error_reason === 'user_denied';
      const reason = denied ? 'cancelled' : (info?.message as string) || (err?.message as string) || 'failed';
      return { oauthError: reason, provider: name };
    }
  }
  return G;
}
