import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from './tenant.types';

/** Reads the context attached by SchoolAccessGuard. */
export const Tenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => ctx.switchToHttp().getRequest().tenant,
);
