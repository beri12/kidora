import { ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { OrgRequestStatus, Role } from '@prisma/client';
import { OrgAccessService } from './org-access.service';
import { isVerifiedRole, VERIFIED_ROLES } from './dto/org-request.dto';

/**
 * A stand-in for PrismaService that records what was written, so the tests can
 * assert on the thing that actually matters: whether a role was granted.
 */
function fakePrisma(opts: {
  user?: any;
  openRequest?: any;
  school?: any;
  district?: any;
  request?: any;
} = {}) {
  const writes: any = { userUpdates: [], requests: [], schools: [], districts: [], audits: [], notifications: [] };

  const db: any = {
    writes,
    user: {
      findUnique: jest.fn(async () => opts.user ?? null),
      update: jest.fn(async ({ data }: any) => { writes.userUpdates.push(data); return { id: 'u1', ...data }; }),
    },
    orgAccessRequest: {
      findFirst: jest.fn(async () => opts.openRequest ?? null),
      findUnique: jest.fn(async () => opts.request ?? null),
      create: jest.fn(async ({ data }: any) => { writes.requests.push(data); return { id: 'r1', ...data }; }),
      update: jest.fn(async ({ data }: any) => { writes.requests.push(data); return { id: 'r1', ...data }; }),
      count: jest.fn(async () => 0),
      findMany: jest.fn(async () => []),
    },
    school: {
      findUnique: jest.fn(async () => opts.school ?? null),
      create: jest.fn(async ({ data }: any) => { writes.schools.push(data); return { id: 's1', ...data }; }),
    },
    district: {
      findUnique: jest.fn(async () => opts.district ?? null),
      create: jest.fn(async ({ data }: any) => { writes.districts.push(data); return { id: 'd1', ...data }; }),
    },
    grade: { createMany: jest.fn(async () => ({ count: 8 })) },
    auditLog: { create: jest.fn(async ({ data }: any) => { writes.audits.push(data); return data; }) },
    notification: { create: jest.fn(async ({ data }: any) => { writes.notifications.push(data); return data; }) },
  };

  // $transaction runs the callback against the same fake.
  db.$transaction = jest.fn(async (arg: any) => (typeof arg === 'function' ? arg(db) : Promise.all(arg)));
  return db;
}

const fakeEmail = () => ({ sendOrgRequestUpdate: jest.fn(async () => undefined) });
const fakeSms = () => ({ send: jest.fn(async () => ({ sid: 'x' })) });
const fakeCache = () => ({ bustTenancy: jest.fn(async () => undefined) });

/** The cache is handed back too, so a test can assert the tenancy was dropped. */
const build = (prisma: any) => {
  const cache = fakeCache();
  const svc = new OrgAccessService(prisma, fakeEmail() as any, fakeSms() as any, cache as any);
  return Object.assign(svc, { __cache: cache });
};

const APPLICANT = {
  id: 'u1', name: 'Marta', email: 'marta@sunrise.edu', phone: null,
  role: Role.PARENT, roleConfirmed: false,
};

const dto = (over: any = {}) => ({
  requestedRole: Role.SCHOOL_LEADER as any,
  organizationName: 'Sunrise Academy',
  jobTitle: 'Principal',
  ...over,
});

describe('isVerifiedRole', () => {
  it('covers exactly the administrative roles', () => {
    expect(VERIFIED_ROLES).toEqual([Role.SCHOOL_ADMIN, Role.SCHOOL_LEADER, Role.DISTRICT_ADMIN]);
    expect(isVerifiedRole(Role.SCHOOL_LEADER)).toBe(true);
    expect(isVerifiedRole(Role.DISTRICT_ADMIN)).toBe(true);
    expect(isVerifiedRole(Role.PARENT)).toBe(false);
    expect(isVerifiedRole(Role.TEACHER)).toBe(false);
    // The roles nobody may ever self-assign must not be on the list either.
    expect(isVerifiedRole(Role.ADMIN)).toBe(false);
    expect(isVerifiedRole(Role.SUPER_ADMIN)).toBe(false);
    expect(isVerifiedRole(Role.CHILD)).toBe(false);
  });
});

describe('submit without a code', () => {
  it('records the request and grants nothing', async () => {
    const prisma = fakePrisma({ user: APPLICANT });
    const res = await build(prisma).submit('u1', dto());

    expect(res.status).toBe('PENDING');
    expect(res.roleGranted).toBe(false);
    // The one thing that must never happen here: a role being written.
    const grantedRole = prisma.writes.userUpdates.find((u: any) => 'role' in u);
    expect(grantedRole).toBeUndefined();
  });

  it('marks the role question answered so it stops being asked', async () => {
    const prisma = fakePrisma({ user: APPLICANT });
    await build(prisma).submit('u1', dto());
    expect(prisma.writes.userUpdates).toContainEqual({ roleConfirmed: true });
  });

  it('refuses a second request while one is open', async () => {
    const prisma = fakePrisma({ user: APPLICANT, openRequest: { id: 'r0', status: OrgRequestStatus.PENDING } });
    await expect(build(prisma).submit('u1', dto())).rejects.toThrow(ConflictException);
  });

  it('refuses an account that already holds a confirmed role', async () => {
    const prisma = fakePrisma({ user: { ...APPLICANT, role: Role.TEACHER, roleConfirmed: true } });
    await expect(build(prisma).submit('u1', dto())).rejects.toThrow(ForbiddenException);
  });

  it('tells the applicant a wrong code is wrong instead of queueing them', async () => {
    const prisma = fakePrisma({ user: APPLICANT, school: null });
    await expect(build(prisma).submit('u1', dto({ joinCode: 'NOPE12' }))).rejects.toThrow(BadRequestException);
    expect(prisma.writes.requests).toHaveLength(0);
  });
});

describe('a granted role reaches the guards at once', () => {
  // JwtStrategy reads role/schoolId from the database but caches them for a
  // minute. Granting without dropping that cache left a just-approved leader
  // being read as their old role, so the dashboard they were sent to answered
  // 403 until the TTL expired.
  it('drops the cached tenancy when a code grants the role', async () => {
    const prisma = fakePrisma({ user: APPLICANT, school: { id: 's9', active: true, districtId: null } });
    const svc = build(prisma);
    await svc.submit('u1', dto({ joinCode: 'k7m2qp' }));
    expect(svc.__cache.bustTenancy).toHaveBeenCalledWith('u1');
  });

  it('drops it on a reviewer approval too', async () => {
    const prisma = fakePrisma({
      user: APPLICANT,
      request: { id: 'r1', userId: 'u1', requestedRole: Role.SCHOOL_LEADER, status: OrgRequestStatus.PENDING, organizationName: 'Sunrise Academy', country: null, region: null, schoolId: null, districtId: null, user: APPLICANT },
    });
    const svc = build(prisma);
    await svc.approve('r1', 'admin1', 'Verified');
    expect(svc.__cache.bustTenancy).toHaveBeenCalledWith('u1');
  });

  it('does not drop it when nothing was granted', async () => {
    const prisma = fakePrisma({ user: APPLICANT });
    const svc = build(prisma);
    await svc.submit('u1', dto());
    expect(svc.__cache.bustTenancy).not.toHaveBeenCalled();
  });
});

describe('submit with a valid join code', () => {
  it('approves immediately and links the school', async () => {
    const prisma = fakePrisma({ user: APPLICANT, school: { id: 's9', active: true, districtId: null } });
    const res = await build(prisma).submit('u1', dto({ joinCode: 'k7m2qp' }));

    expect(res.status).toBe('APPROVED');
    expect(res.roleGranted).toBe(true);
    expect(prisma.writes.userUpdates).toContainEqual(
      expect.objectContaining({ role: Role.SCHOOL_LEADER, roleConfirmed: true, schoolId: 's9' }),
    );
    // It joins the existing school, it does not create a second one.
    expect(prisma.writes.schools).toHaveLength(0);
  });

  it('uppercases and trims the code before matching', async () => {
    const prisma = fakePrisma({ user: APPLICANT, school: { id: 's9', active: true, districtId: null } });
    await build(prisma).submit('u1', dto({ joinCode: '  k7m2qp  ' }));
    expect(prisma.school.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { joinCode: 'K7M2QP' } }));
  });

  it('matches a district code for a district role', async () => {
    const prisma = fakePrisma({ user: APPLICANT, district: { id: 'd9' } });
    const res = await build(prisma).submit('u1', dto({ requestedRole: Role.DISTRICT_ADMIN, joinCode: 'ABC123' }));

    expect(res.status).toBe('APPROVED');
    expect(prisma.writes.userUpdates).toContainEqual(
      expect.objectContaining({ role: Role.DISTRICT_ADMIN, districtId: 'd9' }),
    );
  });

  it('will not let a school code buy a district role', async () => {
    // Only District.joinCode is consulted for a district role, so a school
    // code cannot be escalated into district-wide access.
    const prisma = fakePrisma({ user: APPLICANT, district: null, school: { id: 's9', active: true, districtId: null } });
    await expect(
      build(prisma).submit('u1', dto({ requestedRole: Role.DISTRICT_ADMIN, joinCode: 'K7M2QP' })),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuses a code belonging to a closed school', async () => {
    const prisma = fakePrisma({ user: APPLICANT, school: { id: 's9', active: false, districtId: null } });
    await expect(build(prisma).submit('u1', dto({ joinCode: 'K7M2QP' }))).rejects.toThrow(ConflictException);
  });
});

describe('approve', () => {
  const pending = {
    id: 'r1', userId: 'u1', requestedRole: Role.SCHOOL_LEADER, status: OrgRequestStatus.PENDING,
    organizationName: 'Sunrise Academy', country: 'Ethiopia', region: null,
    schoolId: null, districtId: null,
    user: { id: 'u1', name: 'Marta', email: 'marta@sunrise.edu', phone: null },
  };

  it('creates the school, grants the role and records who decided', async () => {
    const prisma = fakePrisma({ request: pending });
    await build(prisma).approve('r1', 'admin1', 'Checked against the ministry list', '1.2.3.4');

    expect(prisma.writes.schools).toHaveLength(1);
    expect(prisma.writes.schools[0]).toEqual(expect.objectContaining({ name: 'Sunrise Academy' }));
    // The new school gets a join code, so the leader can invite their staff.
    expect(prisma.writes.schools[0].joinCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(prisma.writes.userUpdates).toContainEqual(
      expect.objectContaining({ role: Role.SCHOOL_LEADER, roleConfirmed: true, schoolId: 's1' }),
    );
    expect(prisma.writes.audits[0]).toEqual(
      expect.objectContaining({ actorId: 'admin1', action: 'org.request.approve' }),
    );
  });

  it('creates a district for a district request, not a school', async () => {
    const prisma = fakePrisma({ request: { ...pending, requestedRole: Role.DISTRICT_ADMIN } });
    await build(prisma).approve('r1', 'admin1');

    expect(prisma.writes.districts).toHaveLength(1);
    expect(prisma.writes.schools).toHaveLength(0);
  });

  it('grants the role that was requested, never a different one', async () => {
    const prisma = fakePrisma({ request: { ...pending, requestedRole: Role.SCHOOL_ADMIN } });
    await build(prisma).approve('r1', 'admin1');
    expect(prisma.writes.userUpdates).toContainEqual(expect.objectContaining({ role: Role.SCHOOL_ADMIN }));
  });

  it('cannot approve the same request twice', async () => {
    const prisma = fakePrisma({ request: { ...pending, status: OrgRequestStatus.APPROVED } });
    await expect(build(prisma).approve('r1', 'admin1')).rejects.toThrow(ConflictException);
  });

  it('cannot approve one that was already refused', async () => {
    const prisma = fakePrisma({ request: { ...pending, status: OrgRequestStatus.REJECTED } });
    await expect(build(prisma).approve('r1', 'admin1')).rejects.toThrow(ConflictException);
  });

  it('tells the applicant', async () => {
    const prisma = fakePrisma({ request: pending });
    await build(prisma).approve('r1', 'admin1');
    expect(prisma.writes.notifications[0]).toEqual(
      expect.objectContaining({ userId: 'u1', title: expect.stringContaining('approved') }),
    );
  });
});

describe('reject and request-changes', () => {
  const pending = {
    id: 'r1', userId: 'u1', requestedRole: Role.SCHOOL_LEADER, status: OrgRequestStatus.PENDING,
    organizationName: 'Sunrise Academy', country: null, region: null, schoolId: null, districtId: null,
    user: { id: 'u1', name: 'Marta', email: null, phone: '+251911223344' },
  };

  it('never grants a role', async () => {
    const prisma = fakePrisma({ request: pending });
    await build(prisma).reject('r1', 'admin1', 'Could not verify');
    expect(prisma.writes.userUpdates).toHaveLength(0);
  });

  it('insists on a reason', async () => {
    const prisma = fakePrisma({ request: pending });
    await expect(build(prisma).reject('r1', 'admin1', '   ')).rejects.toThrow(BadRequestException);
    await expect(build(prisma).requestChanges('r1', 'admin1', '')).rejects.toThrow(BadRequestException);
  });

  it('keeps a changes-requested item open for the applicant', async () => {
    const prisma = fakePrisma({ request: pending });
    const res = await build(prisma).requestChanges('r1', 'admin1', 'Send a letter on headed paper');
    expect(res.status).toBe(OrgRequestStatus.CHANGES_REQUESTED);
  });
});
