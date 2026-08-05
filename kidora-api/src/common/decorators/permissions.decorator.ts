import { SetMetadata } from '@nestjs/common';
import { Permission } from '../enums/permission.enum';

export const PERMS_KEY = 'permissions';
export const RequirePermissions = (...perms: Permission[]) => SetMetadata(PERMS_KEY, perms);
