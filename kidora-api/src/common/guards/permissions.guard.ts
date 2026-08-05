import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../enums/permission.enum';
import { PERMS_KEY } from '../decorators/permissions.decorator';
import { roleHasPermission } from '../constants/rbac';
import { AppRole } from '../enums/role.enum';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMS_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required?.length) return true;
    const { user } = ctx.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Unauthenticated');
    const ok = required.every((p) => roleHasPermission(user.role as AppRole, p));
    if (!ok) throw new ForbiddenException('Missing permission');
    return true;
  }
}
