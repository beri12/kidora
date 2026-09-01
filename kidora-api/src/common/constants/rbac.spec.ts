import { roleHasPermission } from './rbac';
import { AppRole } from '../enums/role.enum';
import { Permission } from '../enums/permission.enum';

describe('RBAC', () => {
  it('admin has every permission via wildcard', () => {
    expect(roleHasPermission(AppRole.ADMIN, Permission.PAYMENT_MANAGE)).toBe(true);
    expect(roleHasPermission(AppRole.ADMIN, Permission.LESSON_UPLOAD)).toBe(true);
  });
  it('teacher can upload lessons but not manage payments', () => {
    expect(roleHasPermission(AppRole.TEACHER, Permission.LESSON_UPLOAD)).toBe(true);
    expect(roleHasPermission(AppRole.TEACHER, Permission.PAYMENT_MANAGE)).toBe(false);
  });
  it('child can play games but cannot create courses', () => {
    expect(roleHasPermission(AppRole.CHILD, Permission.GAME_PLAY)).toBe(true);
    expect(roleHasPermission(AppRole.CHILD, Permission.COURSE_CREATE)).toBe(false);
  });

  // ---- school LMS permissions ----

  it('a child cannot touch any authoring or grading permission', () => {
    for (const p of [
      Permission.COURSES_CREATE, Permission.COURSES_PUBLISH, Permission.LESSONS_CREATE,
      Permission.ACTIVITIES_CREATE, Permission.ASSIGNMENTS_GRADE, Permission.EXAMS_CREATE,
      Permission.EXAMS_GRADE, Permission.CERTIFICATES_ISSUE, Permission.STUDENTS_MANAGE,
      Permission.TEACHERS_MANAGE, Permission.SCHOOL_MANAGE, Permission.CLASSES_MANAGE,
    ]) {
      expect(roleHasPermission(AppRole.CHILD, p)).toBe(false);
    }
  });

  it('a teacher authors and grades but does not administer the school', () => {
    expect(roleHasPermission(AppRole.TEACHER, Permission.COURSES_CREATE)).toBe(true);
    expect(roleHasPermission(AppRole.TEACHER, Permission.COURSES_PUBLISH)).toBe(true);
    expect(roleHasPermission(AppRole.TEACHER, Permission.ASSIGNMENTS_GRADE)).toBe(true);
    expect(roleHasPermission(AppRole.TEACHER, Permission.EXAMS_GRADE)).toBe(true);
    expect(roleHasPermission(AppRole.TEACHER, Permission.SCHOOL_MANAGE)).toBe(false);
    expect(roleHasPermission(AppRole.TEACHER, Permission.TEACHERS_MANAGE)).toBe(false);
  });

  it('a school admin administers the school but does not author lessons', () => {
    expect(roleHasPermission(AppRole.SCHOOL_ADMIN, Permission.SCHOOL_MANAGE)).toBe(true);
    expect(roleHasPermission(AppRole.SCHOOL_ADMIN, Permission.STUDENTS_MANAGE)).toBe(true);
    expect(roleHasPermission(AppRole.SCHOOL_ADMIN, Permission.CLASSES_MANAGE)).toBe(true);
    expect(roleHasPermission(AppRole.SCHOOL_ADMIN, Permission.LESSONS_CREATE)).toBe(false);
    expect(roleHasPermission(AppRole.SCHOOL_ADMIN, Permission.ACTIVITIES_CREATE)).toBe(false);
  });

  it('SCHOOL_LEADER has the same rights as SCHOOL_ADMIN', () => {
    for (const p of [Permission.SCHOOL_MANAGE, Permission.STUDENTS_MANAGE, Permission.ANALYTICS_READ]) {
      expect(roleHasPermission(AppRole.SCHOOL_LEADER, p)).toBe(roleHasPermission(AppRole.SCHOOL_ADMIN, p));
    }
  });

  it('a parent reads reports but manages nothing at the school', () => {
    expect(roleHasPermission(AppRole.PARENT, Permission.CHILD_VIEW)).toBe(true);
    expect(roleHasPermission(AppRole.PARENT, Permission.ANALYTICS_READ)).toBe(true);
    expect(roleHasPermission(AppRole.PARENT, Permission.STUDENTS_MANAGE)).toBe(false);
    expect(roleHasPermission(AppRole.PARENT, Permission.COURSES_CREATE)).toBe(false);
  });

  it('an unknown role is denied rather than silently allowed', () => {
    expect(roleHasPermission('NOT_A_ROLE' as AppRole, Permission.SCHOOL_READ)).toBe(false);
  });
});
