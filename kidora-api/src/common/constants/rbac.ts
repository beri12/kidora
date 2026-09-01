import { AppRole } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';

const P = Permission;

// Everything a teacher may do inside their own school. Tenant scoping is a
// separate concern — see SchoolAccessGuard / TenantService.
const TEACHER_PERMISSIONS: Permission[] = [
  P.COURSE_CREATE, P.COURSE_UPDATE, P.LESSON_UPLOAD, P.STUDENT_VIEW, P.GRADE_MANAGE,
  P.SCHOOL_READ, P.STUDENTS_READ, P.CLASSES_READ,
  P.COURSES_READ, P.COURSES_CREATE, P.COURSES_UPDATE, P.COURSES_PUBLISH,
  P.LESSONS_CREATE, P.LESSONS_UPDATE, P.ACTIVITIES_CREATE, P.QUIZZES_CREATE,
  P.ASSIGNMENTS_CREATE, P.ASSIGNMENTS_GRADE, P.EXAMS_CREATE, P.EXAMS_GRADE,
  P.CERTIFICATES_ISSUE, P.ANALYTICS_READ,
];

// A school administrator runs the school but does not author curriculum.
const SCHOOL_ADMIN_PERMISSIONS: Permission[] = [
  P.STUDENT_VIEW, P.GRADE_MANAGE, P.COURSE_CREATE, P.COURSE_UPDATE,
  P.SCHOOL_READ, P.SCHOOL_MANAGE,
  P.STUDENTS_READ, P.STUDENTS_MANAGE, P.TEACHERS_READ, P.TEACHERS_MANAGE,
  P.CLASSES_READ, P.CLASSES_MANAGE, P.COURSES_READ, P.COURSES_PUBLISH,
  P.ASSIGNMENTS_GRADE, P.CERTIFICATES_ISSUE, P.ANALYTICS_READ,
];

// Role → permission matrix. SUPER_ADMIN/ADMIN get everything via the '*' shortcut.
export const ROLE_PERMISSIONS: Record<AppRole, Permission[] | ['*']> = {
  [AppRole.SUPER_ADMIN]: ['*'],
  [AppRole.ADMIN]: ['*'],
  [AppRole.DISTRICT_ADMIN]: [
    ...SCHOOL_ADMIN_PERMISSIONS, P.PAYMENT_MANAGE,
  ],
  [AppRole.SCHOOL_ADMIN]: SCHOOL_ADMIN_PERMISSIONS,
  [AppRole.SCHOOL_LEADER]: SCHOOL_ADMIN_PERMISSIONS,
  [AppRole.TEACHER]: TEACHER_PERMISSIONS,
  [AppRole.PARENT]: [P.CHILD_VIEW, P.SUBSCRIPTION_MANAGE, P.ANALYTICS_READ],
  [AppRole.CHILD]: [P.LESSON_LEARN, P.GAME_PLAY, P.COURSES_READ],
};

export function roleHasPermission(role: AppRole, perm: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms[0] === '*' || (perms as Permission[]).includes(perm);
}
