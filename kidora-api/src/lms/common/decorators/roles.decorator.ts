import { SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';
export const ROLES_KEY = 'kidora:roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Role groups reused across controllers. */
export const SCHOOL_ADMIN_ROLES: Role[] = ['SCHOOL_ADMIN', 'SCHOOL_LEADER', 'DISTRICT_ADMIN', 'SUPER_ADMIN', 'ADMIN'];
export const STUDENT_ROLES: Role[] = ['CHILD'];
export const TEACHER_ROLES: Role[] = ['TEACHER'];
export const PARENT_ROLES: Role[] = ['PARENT'];
