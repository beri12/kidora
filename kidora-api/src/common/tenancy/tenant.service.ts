import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppRole, isPlatformAdmin, isSchoolAdmin } from '../enums/role.enum';
import { TenantContext } from './tenant.types';

/**
 * Single source of truth for "which school is this request allowed to touch?".
 *
 * The schoolId is read from the User row on every request rather than taken
 * from the JWT, so a school transfer or a revoked membership takes effect
 * immediately instead of when the access token happens to expire. A schoolId
 * supplied by the client is only ever *checked* against this, never trusted.
 */
@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(userId: string): Promise<TenantContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        schoolId: true,
        gradeId: true,
        school: { select: { districtId: true } },
      },
    });
    if (!user) throw new ForbiddenException('Unknown user');

    return {
      userId: user.id,
      role: user.role as AppRole,
      schoolId: user.schoolId ?? null,
      districtId: user.school?.districtId ?? null,
      gradeId: user.gradeId ?? null,
      isPlatformAdmin: isPlatformAdmin(user.role),
      isSchoolAdmin: isSchoolAdmin(user.role),
    };
  }

  /**
   * Throws unless `tenant` may act on data belonging to `schoolId`.
   * A null resource schoolId means platform-wide content, which everyone may read.
   */
  assertSchool(tenant: TenantContext, schoolId: string | null | undefined): void {
    if (tenant.isPlatformAdmin) return;
    if (schoolId == null) return;
    if (tenant.schoolId && tenant.schoolId === schoolId) return;
    throw new ForbiddenException('This resource belongs to another school');
  }

  /** Same check, as a boolean, for filtering rather than rejecting. */
  canAccessSchool(tenant: TenantContext, schoolId: string | null | undefined): boolean {
    if (tenant.isPlatformAdmin) return true;
    if (schoolId == null) return true;
    return !!tenant.schoolId && tenant.schoolId === schoolId;
  }

  /**
   * The school a write should be attributed to. Callers may *propose* a school,
   * but only a platform admin can propose one that is not their own.
   */
  resolveWriteSchool(tenant: TenantContext, requested?: string | null): string | null {
    if (!requested) return tenant.schoolId;
    if (tenant.isPlatformAdmin) return requested;
    if (tenant.schoolId === requested) return requested;
    throw new ForbiddenException('Cannot write into another school');
  }

  /** Requires the caller to actually belong to a school. */
  requireSchoolId(tenant: TenantContext): string {
    if (!tenant.schoolId) {
      throw new ForbiddenException('Your account is not attached to a school');
    }
    return tenant.schoolId;
  }
}
