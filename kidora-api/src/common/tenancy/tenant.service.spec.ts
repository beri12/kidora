import { ForbiddenException } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { AppRole } from '../enums/role.enum';
import { TenantContext } from './tenant.types';

const ctx = (over: Partial<TenantContext> = {}): TenantContext => ({
  userId: 'u1',
  role: AppRole.TEACHER,
  schoolId: 'school-a',
  districtId: null,
  gradeId: null,
  isPlatformAdmin: false,
  isSchoolAdmin: false,
  ...over,
});

describe('TenantService', () => {
  const prisma: any = { user: { findUnique: jest.fn() } };
  const service = new TenantService(prisma);

  describe('resolve', () => {
    it('reads schoolId from the database, not from the caller', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1', role: 'TEACHER', schoolId: 'school-a', gradeId: null, school: { districtId: 'd1' },
      });
      const tenant = await service.resolve('u1');
      expect(tenant.schoolId).toBe('school-a');
      expect(tenant.districtId).toBe('d1');
      expect(tenant.isPlatformAdmin).toBe(false);
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u1' } }),
      );
    });

    it('rejects an unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.resolve('ghost')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('marks ADMIN as a platform admin', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'a', role: 'ADMIN', schoolId: null, gradeId: null, school: null,
      });
      expect((await service.resolve('a')).isPlatformAdmin).toBe(true);
    });

    it('marks SCHOOL_LEADER as a school admin', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'h', role: 'SCHOOL_LEADER', schoolId: 'school-a', gradeId: null, school: null,
      });
      expect((await service.resolve('h')).isSchoolAdmin).toBe(true);
    });
  });

  describe('assertSchool', () => {
    it('School A cannot reach School B', () => {
      expect(() => service.assertSchool(ctx(), 'school-b')).toThrow(ForbiddenException);
    });

    it('allows a resource in the caller’s own school', () => {
      expect(() => service.assertSchool(ctx(), 'school-a')).not.toThrow();
    });

    it('allows platform-wide (null school) content', () => {
      expect(() => service.assertSchool(ctx(), null)).not.toThrow();
    });

    it('lets a platform admin through to any school', () => {
      expect(() => service.assertSchool(ctx({ isPlatformAdmin: true }), 'school-b')).not.toThrow();
    });

    it('rejects a user with no school reaching a school-scoped resource', () => {
      expect(() => service.assertSchool(ctx({ schoolId: null }), 'school-a')).toThrow(ForbiddenException);
    });
  });

  describe('resolveWriteSchool', () => {
    it('ignores an absent request value and uses the caller’s own school', () => {
      expect(service.resolveWriteSchool(ctx())).toBe('school-a');
    });

    it('refuses a forged schoolId pointing at another school', () => {
      expect(() => service.resolveWriteSchool(ctx(), 'school-b')).toThrow(ForbiddenException);
    });

    it('accepts the caller’s own school when it is supplied explicitly', () => {
      expect(service.resolveWriteSchool(ctx(), 'school-a')).toBe('school-a');
    });

    it('lets a platform admin write into any school', () => {
      expect(service.resolveWriteSchool(ctx({ isPlatformAdmin: true }), 'school-b')).toBe('school-b');
    });
  });

  describe('requireSchoolId', () => {
    it('throws when the account has no school', () => {
      expect(() => service.requireSchoolId(ctx({ schoolId: null }))).toThrow(ForbiddenException);
    });
  });
});
