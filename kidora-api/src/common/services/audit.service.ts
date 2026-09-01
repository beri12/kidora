import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * Append-only trail for sensitive admin/teacher operations (publishing courses,
 * grading, issuing certificates, roster and role changes).
 *
 * Auditing must never be the reason a user-facing request fails, so write
 * errors are logged and swallowed.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: {
    actorId?: string | null;
    schoolId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    meta?: Record<string, unknown>;
    ip?: string;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: entry.actorId ?? null,
          schoolId: entry.schoolId ?? null,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          meta: (entry.meta ?? {}) as any,
          ip: entry.ip ?? '',
        },
      });
    } catch (err) {
      this.logger.warn(`audit write failed for ${entry.action}: ${String(err)}`);
    }
  }
}
