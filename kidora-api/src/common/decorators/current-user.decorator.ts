import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// `email` is null for accounts created from a phone number alone.
export interface AuthUser { id: string; email: string | null; role: string; }

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);
