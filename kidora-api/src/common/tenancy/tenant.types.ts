import { AppRole } from '../enums/role.enum';

/**
 * The tenant context for one request. Always derived on the server from the
 * authenticated user's database row — never from a body, query or header value.
 */
export interface TenantContext {
  userId: string;
  role: AppRole;
  /** The school this user belongs to, or null for platform admins / unattached users. */
  schoolId: string | null;
  districtId: string | null;
  /** Grade the user (a student) sits in, if any. */
  gradeId: string | null;
  /** True for SUPER_ADMIN / ADMIN — bypasses school scoping. */
  isPlatformAdmin: boolean;
  /** True for SCHOOL_ADMIN / SCHOOL_LEADER. */
  isSchoolAdmin: boolean;
}
