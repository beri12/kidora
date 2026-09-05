import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Role } from '@prisma/client';

/** Shape your existing JWT strategy must put on request.user. */
export interface AuthUser { id: string; role: Role; schoolId: string | null; email?: string; }

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest();
  return req.user as AuthUser;
});
