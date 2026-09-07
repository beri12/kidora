import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Role } from '@prisma/client';

/**
 * Exactly what JwtStrategy.validate() puts on request.user.
 *
 * schoolId / districtId are read from the database on each request rather than
 * carried in the token, so they cannot go stale after a user moves school.
 * Every tenancy check depends on them being present.
 */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  schoolId: string | null;
  districtId: string | null;
  jti?: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest().user as AuthUser;
    // Supports both @CurrentUser() and @CurrentUser('id').
    return data ? user?.[data] : user;
  },
);
