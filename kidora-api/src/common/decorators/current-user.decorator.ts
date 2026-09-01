import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser { id: string; email: string; role: string; jti?: string; }

// Usage:
//   @CurrentUser() user           -> the whole { id, email, role } object
//   @CurrentUser('id') userId     -> just that field
export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const user: AuthUser | undefined = ctx.switchToHttp().getRequest().user;
    return field ? user?.[field] : user;
  },
);
