import { canAccessGroup, hasCapability, ROLE_HOME, toBackendSignupRole, toUserRole } from '@/lib/roles';

describe('role mapping', () => {
  it('maps backend roles to mobile experiences', () => {
    expect(toUserRole('CHILD')).toBe('STUDENT');
    expect(toUserRole('PARENT')).toBe('PARENT');
    expect(toUserRole('TEACHER')).toBe('TEACHER');
    expect(toUserRole('SCHOOL_ADMIN')).toBe('SCHOOL_LEADER');
    expect(toUserRole('SCHOOL_LEADER')).toBe('SCHOOL_LEADER');
    expect(toUserRole('DISTRICT_ADMIN')).toBe('DISTRICT_LEADER');
  });

  it('gives platform admins no mobile experience', () => {
    expect(toUserRole('ADMIN')).toBeNull();
    expect(toUserRole('SUPER_ADMIN')).toBeNull();
    expect(toUserRole(undefined)).toBeNull();
    expect(toUserRole('HACKER')).toBeNull();
  });

  it('maps signup roles back to the backend enum', () => {
    expect(toBackendSignupRole('STUDENT')).toBe('CHILD');
    expect(toBackendSignupRole('DISTRICT_LEADER')).toBe('DISTRICT_ADMIN');
  });

  it('routes every role to its own dashboard group', () => {
    expect(ROLE_HOME.STUDENT).toContain('(student)');
    expect(ROLE_HOME.TEACHER).toContain('(teacher)');
    expect(ROLE_HOME.DISTRICT_LEADER).toContain('(district-leader)');
  });
});

describe('route authorization (UI layer)', () => {
  it('students cannot enter teacher, school or district groups', () => {
    expect(canAccessGroup('STUDENT', '(student)')).toBe(true);
    expect(canAccessGroup('STUDENT', '(teacher)')).toBe(false);
    expect(canAccessGroup('STUDENT', '(school-leader)')).toBe(false);
    expect(canAccessGroup('STUDENT', '(district-leader)')).toBe(false);
  });

  it('teachers cannot enter district administration', () => {
    expect(canAccessGroup('TEACHER', '(district-leader)')).toBe(false);
    expect(canAccessGroup('TEACHER', '(teacher)')).toBe(true);
  });

  it('parents only get the parent group', () => {
    expect(canAccessGroup('PARENT', '(parent)')).toBe(true);
    expect(canAccessGroup('PARENT', '(student)')).toBe(false);
  });

  it('anonymous users only get shared groups', () => {
    expect(canAccessGroup(null, '(auth)')).toBe(true);
    expect(canAccessGroup(null, '(student)')).toBe(false);
  });

  it('capabilities follow roles', () => {
    expect(hasCapability('STUDENT', 'ai_tutor')).toBe(true);
    expect(hasCapability('PARENT', 'ai_tutor')).toBe(false);
    expect(hasCapability('DISTRICT_LEADER', 'compare_schools')).toBe(true);
    expect(hasCapability('TEACHER', 'view_district')).toBe(false);
  });
});
