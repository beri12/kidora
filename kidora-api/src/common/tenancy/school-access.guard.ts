import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { TenantService } from './tenant.service';

/**
 * Resolves the caller's tenant from the database and attaches it to the request
 * as `request.tenant`. Must run after JwtAuthGuard.
 *
 * It deliberately does not read schoolId from params/body/query: routes that
 * name a school still have to validate it through TenantService.assertSchool.
 */
@Injectable()
export class SchoolAccessGuard implements CanActivate {
  constructor(private readonly tenants: TenantService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    if (!req.user?.id) throw new ForbiddenException('Unauthenticated');
    req.tenant = await this.tenants.resolve(req.user.id);
    return true;
  }
}
