import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}
  record(p: { actorId: string; schoolId?: string | null; action: string; entityType: string; entityId?: string; before?: Prisma.InputJsonValue; after?: Prisma.InputJsonValue; ip?: string }) {
    return this.prisma.auditLog.create({ data: { ...p, ip: p.ip ?? '' } });
  }
}
