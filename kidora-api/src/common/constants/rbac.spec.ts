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
});
