export enum AppRole {
  CHILD = 'CHILD',
  PARENT = 'PARENT',
  TEACHER = 'TEACHER',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  // Present in the Prisma Role enum since the add_school_leader_role migration;
  // mirrored here so RolesGuard and the RBAC matrix can see it.
  SCHOOL_LEADER = 'SCHOOL_LEADER',
  DISTRICT_ADMIN = 'DISTRICT_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
}

// Roles that administer a single school tenant.
export const SCHOOL_ADMIN_ROLES: AppRole[] = [AppRole.SCHOOL_ADMIN, AppRole.SCHOOL_LEADER];

// Roles that bypass tenant scoping entirely.
export const PLATFORM_ADMIN_ROLES: AppRole[] = [AppRole.SUPER_ADMIN, AppRole.ADMIN];

export function isPlatformAdmin(role?: string): boolean {
  return PLATFORM_ADMIN_ROLES.includes(role as AppRole);
}

export function isSchoolAdmin(role?: string): boolean {
  return SCHOOL_ADMIN_ROLES.includes(role as AppRole);
}
