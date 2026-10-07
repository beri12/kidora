import type { BackendRole, UserRole } from '@/types';

/**
 * Backend role → mobile experience.
 *
 * SCHOOL_ADMIN and SCHOOL_LEADER share the school experience (the backend's
 * SCHOOL_ADMIN_ROLES guard treats them the same). DISTRICT_ADMIN is the
 * district leader. Platform ADMIN / SUPER_ADMIN have no mobile experience:
 * they get `null` and are shown the "use the web console" screen.
 */
const ROLE_MAP: Record<BackendRole, UserRole | null> = {
  CHILD: 'STUDENT',
  PARENT: 'PARENT',
  TEACHER: 'TEACHER',
  SCHOOL_ADMIN: 'SCHOOL_LEADER',
  SCHOOL_LEADER: 'SCHOOL_LEADER',
  DISTRICT_ADMIN: 'DISTRICT_LEADER',
  SUPER_ADMIN: null,
  ADMIN: null,
};

export const USER_ROLES: readonly UserRole[] = [
  'STUDENT',
  'PARENT',
  'TEACHER',
  'SCHOOL_LEADER',
  'DISTRICT_LEADER',
] as const;

export function toUserRole(role: string | null | undefined): UserRole | null {
  if (!role) return null;
  if ((USER_ROLES as readonly string[]).includes(role)) return role as UserRole;
  return ROLE_MAP[role as BackendRole] ?? null;
}

/** Mobile role → the backend role sent on self-registration. */
export function toBackendSignupRole(role: UserRole): BackendRole {
  switch (role) {
    case 'STUDENT':
      return 'CHILD';
    case 'PARENT':
      return 'PARENT';
    case 'TEACHER':
      return 'TEACHER';
    case 'SCHOOL_LEADER':
      return 'SCHOOL_LEADER';
    case 'DISTRICT_LEADER':
      return 'DISTRICT_ADMIN';
  }
}

/** Expo Router group that owns each role's experience. */
export const ROLE_GROUP: Record<UserRole, string> = {
  STUDENT: '(student)',
  PARENT: '(parent)',
  TEACHER: '(teacher)',
  SCHOOL_LEADER: '(school-leader)',
  DISTRICT_LEADER: '(district-leader)',
};

export const ROLE_HOME: Record<UserRole, string> = {
  STUDENT: '/(student)',
  PARENT: '/(parent)/dashboard',
  TEACHER: '/(teacher)/dashboard',
  SCHOOL_LEADER: '/(school-leader)/dashboard',
  DISTRICT_LEADER: '/(district-leader)/dashboard',
};

/** Groups any signed-in user may visit regardless of role. */
const SHARED_GROUPS = new Set(['modal', '(auth)']);

/**
 * Whether `role` may open a route whose first segment is `group`.
 *
 * Each role sees exactly one role group. This is the UI half of authorization;
 * every API call is still authorized by the backend's RolesGuard and tenancy
 * checks (e.g. assertParentOf), so a forged route can never return data the
 * user may not see.
 */
export function canAccessGroup(role: UserRole | null, group: string | undefined): boolean {
  if (!group) return true;
  if (SHARED_GROUPS.has(group)) return true;
  if (!role) return false;
  return ROLE_GROUP[role] === group;
}

export type Capability =
  | 'learn'
  | 'play'
  | 'ai_tutor'
  | 'view_children'
  | 'manage_classes'
  | 'grade'
  | 'view_school'
  | 'view_district'
  | 'compare_schools';

const CAPABILITIES: Record<UserRole, readonly Capability[]> = {
  STUDENT: ['learn', 'play', 'ai_tutor'],
  PARENT: ['view_children'],
  TEACHER: ['manage_classes', 'grade'],
  SCHOOL_LEADER: ['view_school'],
  DISTRICT_LEADER: ['view_school', 'view_district', 'compare_schools'],
};

export function hasCapability(role: UserRole | null, cap: Capability): boolean {
  return !!role && CAPABILITIES[role].includes(cap);
}
