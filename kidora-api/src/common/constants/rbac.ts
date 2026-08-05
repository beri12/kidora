import { AppRole } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';

// Role → permission matrix. SUPER_ADMIN/ADMIN get everything via the '*' shortcut.
export const ROLE_PERMISSIONS: Record<AppRole, Permission[] | ['*']> = {
  [AppRole.SUPER_ADMIN]: ['*'],
  [AppRole.ADMIN]: ['*'],
  [AppRole.DISTRICT_ADMIN]: [
    Permission.STUDENT_VIEW, Permission.GRADE_MANAGE, Permission.COURSE_CREATE,
    Permission.COURSE_UPDATE, Permission.PAYMENT_MANAGE,
  ],
  [AppRole.SCHOOL_ADMIN]: [
    Permission.STUDENT_VIEW, Permission.GRADE_MANAGE, Permission.COURSE_CREATE, Permission.COURSE_UPDATE,
  ],
  [AppRole.TEACHER]: [
    Permission.COURSE_CREATE, Permission.COURSE_UPDATE, Permission.LESSON_UPLOAD,
    Permission.STUDENT_VIEW, Permission.GRADE_MANAGE,
  ],
  [AppRole.PARENT]: [Permission.CHILD_VIEW, Permission.SUBSCRIPTION_MANAGE],
  [AppRole.CHILD]: [Permission.LESSON_LEARN, Permission.GAME_PLAY],
};

export function roleHasPermission(role: AppRole, perm: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms[0] === '*' || (perms as Permission[]).includes(perm);
}
