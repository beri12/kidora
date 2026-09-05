import { Injectable } from '@nestjs/common';
import type { ActivityEventType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Append-only feed used by teacher/school/parent activity lists. */
@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}
  log(data: { userId: string; schoolId?: string | null; type: ActivityEventType; title: string; entityType?: string; entityId?: string; xpDelta?: number; meta?: Prisma.InputJsonValue }, tx: Prisma.TransactionClient | PrismaService = this.prisma) {
    return tx.activityEvent.create({ data: { ...data, meta: data.meta ?? {} } });
  }
}
