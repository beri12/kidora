export enum AppRole {
  CHILD = 'CHILD',
  PARENT = 'PARENT',
  TEACHER = 'TEACHER',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  // Was missing here while Prisma's Role enum had it, so a SCHOOL_LEADER
  // matched no entry in the permission matrix and every @Roles check refused
  // them — an approved school leader would have had no permissions at all.
  SCHOOL_LEADER = 'SCHOOL_LEADER',
  DISTRICT_ADMIN = 'DISTRICT_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
}
